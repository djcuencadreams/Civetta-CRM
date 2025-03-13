import { Express, Request, Response } from "express";
import { db } from "@db";
import { orders, orderItems, customers } from "@db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { Service } from "./service-registry";
import { validateBody, validateParams } from "../validation";
import { appEvents, EventTypes } from "../lib/event-emitter";

/**
 * Order ID parameter schema
 */
const orderIdSchema = z.object({
  id: z.string().transform(val => parseInt(val, 10))
});

/**
 * Order creation/update schema
 */
const orderSchema = z.object({
  customerId: z.number(),
  leadId: z.number().nullable().optional(),
  orderNumber: z.string().nullable().optional(),
  totalAmount: z.number().min(0),
  status: z.string().default('new'),
  paymentStatus: z.string().default('pending'),
  paymentMethod: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  brand: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  items: z.array(z.object({
    id: z.number().optional(),
    productId: z.number().nullable().optional(),
    productName: z.string(),
    quantity: z.number().min(1),
    unitPrice: z.number().min(0),
    discount: z.number().default(0),
    subtotal: z.number().min(0)
  }))
});

/**
 * Order status update schema
 */
const statusUpdateSchema = z.object({
  status: z.string(),
  reason: z.string().optional()
});

/**
 * Payment status update schema
 */
const paymentStatusUpdateSchema = z.object({
  paymentStatus: z.string(),
  paymentMethod: z.string().optional(),
  reason: z.string().optional()
});

/**
 * Service responsible for managing orders
 */
export class OrdersService implements Service {
  name = "orders";

  registerRoutes(app: Express): void {
    // Get all orders
    app.get("/api/orders", this.getAllOrders.bind(this));
    
    // Get order by ID
    app.get("/api/orders/:id", validateParams(orderIdSchema), this.getOrderById.bind(this));
    
    // Create new order
    app.post("/api/orders", validateBody(orderSchema), this.createOrder.bind(this));
    
    // Update order
    app.patch("/api/orders/:id", validateParams(orderIdSchema), validateBody(orderSchema), this.updateOrder.bind(this));
    
    // Delete order
    app.delete("/api/orders/:id", validateParams(orderIdSchema), this.deleteOrder.bind(this));
    
    // Update order status
    app.patch(
      "/api/orders/:id/status", 
      validateParams(orderIdSchema), 
      validateBody(statusUpdateSchema), 
      this.updateOrderStatus.bind(this)
    );
    
    // Update payment status
    app.patch(
      "/api/orders/:id/payment-status", 
      validateParams(orderIdSchema), 
      validateBody(paymentStatusUpdateSchema), 
      this.updatePaymentStatus.bind(this)
    );
  }

  /**
   * Get all orders
   */
  async getAllOrders(_req: Request, res: Response): Promise<void> {
    try {
      const result = await db.query.orders.findMany({
        orderBy: [desc(orders.createdAt)],
        with: {
          customer: true,
          items: true
        }
      });
      res.json(result);
    } catch (error) {
      console.error('Error fetching orders:', error);
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  }

  /**
   * Get order by ID
   */
  async getOrderById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const orderId = parseInt(id);
      
      const result = await db.query.orders.findFirst({
        where: eq(orders.id, orderId),
        with: {
          customer: true,
          items: true
        }
      });
      
      if (!result) {
        res.status(404).json({ error: "Order not found" });
        return;
      }
      
      res.json(result);
    } catch (error) {
      console.error('Error fetching order:', error);
      res.status(500).json({ error: "Failed to fetch order" });
    }
  }

  /**
   * Create a new order
   */
  async createOrder(req: Request, res: Response): Promise<void> {
    try {
      const orderData = req.body;
      const { customerId, items, ...orderDetails } = orderData;

      // Check if customer exists
      const customer = await db.query.customers.findFirst({
        where: eq(customers.id, customerId)
      });

      if (!customer) {
        res.status(404).json({ error: "Customer not found" });
        return;
      }
      
      // Calculate total amount from items if not specified
      let totalAmount = orderDetails.totalAmount;
      if (!totalAmount && items?.length > 0) {
        totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);
      }

      // Create the order
      const [order] = await db.insert(orders).values({
        customerId,
        leadId: orderDetails.leadId || null,
        orderNumber: orderDetails.orderNumber || this.generateOrderNumber(),
        totalAmount,
        status: orderDetails.status || 'new',
        paymentStatus: orderDetails.paymentStatus || 'pending',
        paymentMethod: orderDetails.paymentMethod || null,
        source: orderDetails.source || 'direct',
        brand: orderDetails.brand || customer.brand || 'sleepwear',
        notes: orderDetails.notes || null,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      // Create order items
      if (items && items.length > 0) {
        const orderItemsData = items.map(item => ({
          orderId: order.id,
          productId: item.productId || null,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount || 0,
          subtotal: item.subtotal,
          createdAt: new Date()
        }));

        await db.insert(orderItems).values(orderItemsData);
      }

      // Get the complete order with items
      const completeOrder = await db.query.orders.findFirst({
        where: eq(orders.id, order.id),
        with: {
          customer: true,
          items: true
        }
      });

      // Emit order created event
      appEvents.emit(EventTypes.ORDER_CREATED, completeOrder);
      
      res.status(201).json(completeOrder);
    } catch (error) {
      console.error('Error creating order:', error);
      res.status(500).json({ error: "Failed to create order" });
    }
  }

  /**
   * Update an order
   */
  async updateOrder(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const orderId = parseInt(id);
      const orderData = req.body;
      const { customerId, items, ...orderDetails } = orderData;

      // Check if order exists
      const existingOrder = await db.query.orders.findFirst({
        where: eq(orders.id, orderId),
        with: {
          items: true
        }
      });

      if (!existingOrder) {
        res.status(404).json({ error: "Order not found" });
        return;
      }

      // Check if customer exists
      const customer = await db.query.customers.findFirst({
        where: eq(customers.id, customerId)
      });

      if (!customer) {
        res.status(404).json({ error: "Customer not found" });
        return;
      }
      
      // Calculate total amount from items if provided
      let totalAmount = orderDetails.totalAmount;
      if (items?.length > 0) {
        totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);
      }

      // Update the order
      const [updatedOrder] = await db.update(orders)
        .set({
          customerId,
          leadId: orderDetails.leadId ?? existingOrder.leadId,
          orderNumber: orderDetails.orderNumber ?? existingOrder.orderNumber,
          totalAmount,
          status: orderDetails.status ?? existingOrder.status,
          paymentStatus: orderDetails.paymentStatus ?? existingOrder.paymentStatus,
          paymentMethod: orderDetails.paymentMethod ?? existingOrder.paymentMethod,
          source: orderDetails.source ?? existingOrder.source,
          brand: orderDetails.brand ?? existingOrder.brand,
          notes: orderDetails.notes ?? existingOrder.notes,
          updatedAt: new Date()
        })
        .where(eq(orders.id, orderId))
        .returning();

      // Handle order items update if provided
      if (items && items.length > 0) {
        // Delete existing items
        await db.delete(orderItems).where(eq(orderItems.orderId, orderId));

        // Create new order items
        const orderItemsData = items.map(item => ({
          orderId: orderId,
          productId: item.productId || null,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount || 0,
          subtotal: item.subtotal,
          createdAt: new Date()
        }));

        await db.insert(orderItems).values(orderItemsData);
      }

      // Get the complete updated order with items
      const completeOrder = await db.query.orders.findFirst({
        where: eq(orders.id, orderId),
        with: {
          customer: true,
          items: true
        }
      });

      // Emit order updated event
      appEvents.emit(EventTypes.ORDER_UPDATED, completeOrder);
      
      res.json(completeOrder);
    } catch (error) {
      console.error('Error updating order:', error);
      res.status(500).json({ error: "Failed to update order" });
    }
  }

  /**
   * Delete an order
   */
  async deleteOrder(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const orderId = parseInt(id);

      // Check if order exists
      const existingOrder = await db.query.orders.findFirst({
        where: eq(orders.id, orderId)
      });

      if (!existingOrder) {
        res.status(404).json({ error: "Order not found" });
        return;
      }

      // Delete order items first (maintain referential integrity)
      await db.delete(orderItems).where(eq(orderItems.orderId, orderId));
      
      // Now delete the order
      await db.delete(orders).where(eq(orders.id, orderId));

      // Emit order deleted event
      appEvents.emit(EventTypes.ORDER_DELETED, existingOrder);
      
      res.status(200).json({ success: true, message: "Order deleted successfully" });
    } catch (error) {
      console.error('Error deleting order:', error);
      res.status(500).json({ error: "Failed to delete order" });
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const orderId = parseInt(id);
      const { status, reason } = req.body;

      // Check if order exists
      const existingOrder = await db.query.orders.findFirst({
        where: eq(orders.id, orderId)
      });

      if (!existingOrder) {
        res.status(404).json({ error: "Order not found" });
        return;
      }

      // Update order status
      const [updatedOrder] = await db.update(orders)
        .set({
          status,
          notes: reason 
            ? `${existingOrder.notes ? existingOrder.notes + '\n' : ''}Status changed to ${status}: ${reason}`
            : existingOrder.notes,
          updatedAt: new Date()
        })
        .where(eq(orders.id, orderId))
        .returning();

      // Emit order status changed event
      appEvents.emit(EventTypes.ORDER_STATUS_CHANGED, {
        order: updatedOrder,
        previousStatus: existingOrder.status,
        newStatus: status,
        reason
      });
      
      res.json(updatedOrder);
    } catch (error) {
      console.error('Error updating order status:', error);
      res.status(500).json({ error: "Failed to update order status" });
    }
  }

  /**
   * Update payment status
   */
  async updatePaymentStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const orderId = parseInt(id);
      const { paymentStatus, paymentMethod, reason } = req.body;

      // Check if order exists
      const existingOrder = await db.query.orders.findFirst({
        where: eq(orders.id, orderId)
      });

      if (!existingOrder) {
        res.status(404).json({ error: "Order not found" });
        return;
      }

      // Update order payment status
      const [updatedOrder] = await db.update(orders)
        .set({
          paymentStatus,
          paymentMethod: paymentMethod || existingOrder.paymentMethod,
          notes: reason 
            ? `${existingOrder.notes ? existingOrder.notes + '\n' : ''}Payment status changed to ${paymentStatus}: ${reason}`
            : existingOrder.notes,
          updatedAt: new Date()
        })
        .where(eq(orders.id, orderId))
        .returning();

      // Emit order payment status changed event
      appEvents.emit(EventTypes.ORDER_PAYMENT_STATUS_CHANGED, {
        order: updatedOrder,
        previousStatus: existingOrder.paymentStatus,
        newStatus: paymentStatus,
        reason
      });
      
      res.json(updatedOrder);
    } catch (error) {
      console.error('Error updating payment status:', error);
      res.status(500).json({ error: "Failed to update payment status" });
    }
  }

  /**
   * Generate a unique order number
   */
  private generateOrderNumber(): string {
    const prefix = 'ORD';
    const timestamp = Date.now().toString().slice(-6);
    const randomChars = Math.random().toString(36).slice(2, 7).toUpperCase();
    return `${prefix}-${randomChars}${timestamp}`;
  }
}

// Create and export the service instance
export const ordersService = new OrdersService();