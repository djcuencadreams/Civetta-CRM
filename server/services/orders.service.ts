import { Express, Request, Response } from "express";
import { db } from "@db";
import { orders, orderItems, customers, products } from "@db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { z } from "zod";
import { Service } from "./service-registry";
import { validateBody, validateParams } from "../validation";
import { appEvents, EventTypes } from "../lib/event-emitter";

/**
 * Order ID parameter schema
 */
const orderIdSchema = z.object({
  id: z.coerce.number().int().positive()
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
      // Req.params ya está validado y transformado por el middleware de validación
      const { id } = req.params;
      const orderId = parseInt(id);
      
      // Usar la API de consulta de Drizzle en lugar de SQL directo
      const order = await db.query.orders.findFirst({
        where: eq(orders.id, orderId),
        with: {
          customer: true,
          items: true
        }
      });
      
      if (!order) {
        res.status(404).json({ error: "Order not found" });
        return;
      }
      
      res.json(order);
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
        totalAmount = items.reduce((sum: number, item: any) => sum + item.subtotal, 0);
      }
      
      // Verificar y sincronizar productos con WooCommerce si es necesario
      if (items && items.length > 0) {
        for (const item of items) {
          if (item.productId) {
            try {
              // Verificar si el producto existe usando Drizzle query builder
              const product = await db.query.products.findFirst({
                where: eq(products.id, item.productId)
              });
              
              // Si el producto existe pero no tiene wooCommerceId, intentar sincronizarlo
              if (product && !product.wooCommerceId) {
                console.log(`Sincronizando producto ${product.name} (ID: ${product.id}) con WooCommerce antes de crear orden`);
                
                // Importar función de sincronización desde WooCommerce service
                const { syncProductToWoo } = await import('./woocommerce.service');
                
                // Intentar crear el producto en WooCommerce
                await syncProductToWoo(product.id, true);
              }
            } catch (error) {
              console.error(`Error sincronizando producto ID ${item.productId} con WooCommerce:`, error);
              // Continuamos con la creación del pedido aunque la sincronización falle
            }
          }
        }
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
        const orderItemsData = items.map((item: any) => ({
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
      // req.params ya está validado y transformado por validateParams(orderIdSchema)
      const { id } = req.params;
      const orderId = parseInt(id);
      const orderData = req.body;
      const { customerId, items, ...orderDetails } = orderData;

      // Verificar si el pedido existe usando Drizzle ORM
      const existingOrder = await db.query.orders.findFirst({
        where: eq(orders.id, orderId)
      });

      if (!existingOrder) {
        res.status(404).json({ error: "Order not found" });
        return;
      }

      // Verificar si el cliente existe usando Drizzle ORM
      const customer = await db.query.customers.findFirst({
        where: eq(customers.id, customerId)
      });

      if (!customer) {
        res.status(404).json({ error: "Customer not found" });
        return;
      }
      
      // Calcular monto total desde los items si se proporcionan
      let totalAmount = orderDetails.totalAmount;
      if (items?.length > 0) {
        totalAmount = items.reduce((sum: number, item: any) => sum + item.subtotal, 0);
      }
      
      // Verificar y sincronizar productos con WooCommerce si es necesario
      if (items && items.length > 0) {
        for (const item of items) {
          if (item.productId) {
            try {
              // Verificar si el producto existe usando Drizzle query builder
              const product = await db.query.products.findFirst({
                where: eq(products.id, item.productId)
              });
              
              // Si el producto existe pero no tiene wooCommerceId, intentar sincronizarlo
              if (product && !product.wooCommerceId) {
                console.log(`Sincronizando producto ${product.name} (ID: ${product.id}) con WooCommerce antes de actualizar orden`);
                
                // Importar función de sincronización desde WooCommerce service
                const { syncProductToWoo } = await import('./woocommerce.service');
                
                // Intentar crear el producto en WooCommerce
                await syncProductToWoo(product.id, true);
              }
            } catch (error) {
              console.error(`Error sincronizando producto ID ${item.productId} con WooCommerce:`, error);
              // Continuamos con la actualización del pedido aunque la sincronización falle
            }
          }
        }
      }

      // Actualizar el pedido usando Drizzle ORM
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

      // Manejar actualización de items si se proporcionan
      if (items && items.length > 0) {
        // Eliminar items existentes usando Drizzle ORM
        await db.delete(orderItems).where(eq(orderItems.orderId, orderId));

        // Crear nuevos items usando Drizzle ORM
        const orderItemsData = items.map((item: any) => ({
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

      // Obtener el pedido completo con items y cliente usando Drizzle ORM
      const completeOrder = await db.query.orders.findFirst({
        where: eq(orders.id, orderId),
        with: {
          customer: true,
          items: true
        }
      });

      // Emitir evento de actualización de pedido
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
      // Obtener status y notes (no reason) del cuerpo de la solicitud
      const { status, notes } = req.body;

      console.log(`Actualizando estado de pedido ${orderId} a ${status}`, { notes });

      // Check if order exists
      const existingOrder = await db.query.orders.findFirst({
        where: eq(orders.id, orderId)
      });

      if (!existingOrder) {
        res.status(404).json({ error: "Order not found" });
        return;
      }

      // Verificar que el estado sea válido
      const validStatuses = ['new', 'preparing', 'shipped', 'completed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        res.status(400).json({ 
          error: "Estado inválido", 
          message: "El estado debe ser uno de: nuevo, preparando, enviado, completado, cancelado"
        });
        return;
      }

      // Update order status
      const [updatedOrder] = await db.update(orders)
        .set({
          status,
          notes: notes 
            ? `${existingOrder.notes ? existingOrder.notes + '\n' : ''}Status changed to ${status}: ${notes}`
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
        reason: notes
      });
      
      // Devolver respuesta acorde a lo que espera el frontend
      res.json({ 
        success: true, 
        message: "Estado actualizado correctamente",
        status,
        order: updatedOrder
      });
    } catch (error) {
      console.error('Error updating order status:', error);
      res.status(500).json({ error: "Error al actualizar el estado del pedido" });
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

      console.log(`Actualizando estado de pago de pedido ${orderId} a ${paymentStatus}`, { paymentMethod, reason });

      // Check if order exists
      const existingOrder = await db.query.orders.findFirst({
        where: eq(orders.id, orderId)
      });

      if (!existingOrder) {
        res.status(404).json({ error: "Order not found" });
        return;
      }

      // Verificar que el estado de pago sea válido
      const validPaymentStatuses = ['pending', 'paid', 'refunded', 'cancelled'];
      if (!validPaymentStatuses.includes(paymentStatus)) {
        res.status(400).json({ 
          error: "Estado de pago inválido", 
          message: "El estado de pago debe ser uno de: pendiente, pagado, reembolsado, cancelado"
        });
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
      
      // Devolver respuesta con formato para el frontend
      res.json({
        success: true,
        message: "Estado de pago actualizado correctamente",
        paymentStatus,
        order: updatedOrder
      });
    } catch (error) {
      console.error('Error updating payment status:', error);
      res.status(500).json({ error: "Error al actualizar el estado de pago" });
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