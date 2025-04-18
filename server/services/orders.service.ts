import { Express, Request, Response } from "express";
import { db } from "@db";
import { 
  orders, 
  orderItems, 
  customers, 
  products, 
  leads,
  orderStatusEnum, 
  paymentStatusEnum, 
  paymentMethodEnum, 
  sourceEnum, 
  brandEnum 
} from "@db/schema";
import { eq, desc, sql, and, or, like } from "drizzle-orm";
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
  async getAllOrders(req: Request, res: Response): Promise<void> {
    try {
      // Obtener parámetros de consulta opcionales
      const { source, status, paymentStatus, isFromWebForm } = req.query;

      let filters = [];

      // Aplicar filtros si están presentes
      if (source) {
        filters.push(eq(orders.source, source as string));
      }

      if (status) {
        filters.push(eq(orders.status, status as string));
      }

      if (paymentStatus) {
        filters.push(eq(orders.paymentStatus, paymentStatus as string));
      }

      if (isFromWebForm === 'true') {
        filters.push(eq(orders.isFromWebForm, true));
      } else if (isFromWebForm === 'false') {
        filters.push(eq(orders.isFromWebForm, false));
      }

      const result = await db.query.orders.findMany({
        orderBy: [desc(orders.createdAt)],
        where: filters.length > 0 ? and(...filters) : undefined,
        with: {
          customer: true,
          items: true,
          assignedUser: true
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

      console.log(`[OrderService] Iniciando búsqueda de orden ID: ${orderId}`);

      // Usar la API de consulta de Drizzle para obtener el pedido 
      // primero sin incluir la relación con el cliente, para luego obtener
      // los datos actualizados del cliente directamente
      const order = await db.query.orders.findFirst({
        where: eq(orders.id, orderId),
        with: {
          // No incluimos directamente al cliente para obtener sus datos actualizados después
          items: {
            columns: {
              id: true,
              productId: true,
              productName: true,
              quantity: true,
              unitPrice: true,
              discount: true,
              subtotal: true,
              attributes: true
            }
          },
          assignedUser: true
        }
      });

      if (!order) {
        console.error(`No se encontró la orden con ID ${orderId}`);
        res.status(404).json({ error: "Order not found" });
        return;
      }

      // Log completo de la orden para depuración
      console.log(`[OrderService] Orden obtenida (ID: ${orderId}):`, JSON.stringify(order, null, 2));
      
      // Ahora obtenemos el cliente actualizado directamente para asegurar datos actualizados
      if (order.customerId) {
        console.log(`[OrderService] Obteniendo datos actualizados del cliente ID: ${order.customerId}`);
        const currentCustomer = await db.query.customers.findFirst({
          where: eq(customers.id, order.customerId)
        });
        
        if (currentCustomer) {
          // Asignar el cliente actualizado a la orden
          order.customer = currentCustomer;
          console.log(`[OrderService] ✅ Cliente actualizado ID: ${currentCustomer.id}, nombre: ${currentCustomer.name}`);
        } else {
          console.error(`[OrderService] ⚠️ Cliente con ID ${order.customerId} no encontrado en base de datos`);
        }
      }

      // Verificamos si la orden tiene la propiedad leadId pero NO tiene cliente asociado
      // Esto no debería suceder según la lógica de negocio, pero lo manejamos por si acaso
      if (order.leadId && !order.customer) {
        console.warn(`[OrderService] ⚠️ Advertencia: Orden ${orderId} tiene leadId pero no customerId. Buscando datos del lead...`);
        
        // Buscamos el lead para obtener información
        const lead = await db.query.leads.findFirst({
          where: eq(leads.id, order.leadId)
        });
        
        if (lead) {
          console.log(`[OrderService] ⚠️ Encontrado lead ID ${lead.id} para orden sin cliente. Este es un caso excepcional.`);
          // No creamos un cliente falso, porque esto contradice la lógica de negocio
          // En su lugar, registramos esta situación anómala
        }
      }

      // Si la orden tiene customerId y leadId, priorizamos los datos del cliente
      // y eliminamos cualquier referencia al lead para evitar confusiones
      if (order.customerId && order.leadId) {
        console.log(`[OrderService] Orden ${orderId} tiene tanto customerId (${order.customerId}) como leadId (${order.leadId}). Priorizando datos del cliente.`);
        
        // Eliminar la referencia al lead, ya que según la lógica de negocio
        // los pedidos deben asociarse únicamente a clientes
        order.leadId = null;
      }

      // Handle undefined customer (caso improbable pero manejado por completitud)
      if (order && !order.customer && order.shippingAddress) {
        console.warn(`[OrderService] ⚠️ Advertencia crítica: Orden ${orderId} no tiene cliente asociado a pesar de tener customerId ${order.customerId}`);
        
        // Obtener el cliente directamente
        if (order.customerId) {
          const customer = await db.query.customers.findFirst({
            where: eq(customers.id, order.customerId)
          });
          
          if (customer) {
            console.log(`[OrderService] Recuperado cliente ID ${customer.id} directamente de la tabla customers`);
            order.customer = customer;
          } else {
            console.error(`[OrderService] 🚨 Error: No se encontró cliente con ID ${order.customerId} en la base de datos`);
          }
        }
        
        // Si aún no tenemos cliente, usamos los datos de envío como última opción
        if (!order.customer) {
          console.warn(`[OrderService] Usando datos de shippingAddress como último recurso para orden ${orderId}`);
          // Crear un objeto cliente con datos mínimos
          order.customer = {
            id: 0,
            name: "Cliente no identificado",
            firstName: null,
            lastName: null,
            email: null,
            phone: null,
            phoneCountry: null,
            phoneNumber: null,
            street: null,
            city: null,
            province: null,
            deliveryInstructions: null,
            idNumber: null,
            type: null,
            status: null,
            source: null,
            brand: null,
            notes: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            address: null,
            ruc: null,
            secondaryPhone: null,
            billingAddress: {},
            tags: [],
            totalValue: "0",
            assignedUserId: null,
            wooCommerceId: null,
            lastPurchase: null,
            // Agregar datos de shippingAddress
            ...(typeof order.shippingAddress === 'object' ? order.shippingAddress : {})
          };
        }
      }

      // Log detallado de datos del cliente para verificar que los datos sean correctos
      if (order.customer) {
        console.log(`[OrderService] Datos completos del cliente para orden ${orderId}:`, {
          id: order.customer.id,
          name: order.customer.name,
          firstName: order.customer.firstName,
          lastName: order.customer.lastName,
          email: order.customer.email,
          phone: order.customer.phone,
          phoneCountry: order.customer.phoneCountry,
          phoneNumber: order.customer.phoneNumber,
          idNumber: order.customer.idNumber,
          street: order.customer.street,
          city: order.customer.city,
          province: order.customer.province,
          type: order.customer.type,
          source: order.customer.source,
          brand: order.customer.brand
        });
      } else {
        console.error(`[OrderService] 🚨 Error crítico: Orden ${orderId} no tiene cliente asociado después de intentar recuperarlo`);
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

      // Generate a unique order number if not provided
      const orderNumber = orderDetails.orderNumber || this.generateOrderNumber();
      console.log(`Creating order with number: ${orderNumber} for customer ID: ${customerId}`);

      // Create the order - Nunca guardar leadId si existe customerId (lógica de negocio)
      const leadIdValue = orderDetails.leadId && !customerId ? orderDetails.leadId : null;
      
      console.log(`[OrderService] Creando orden con número ${orderNumber}: customerId=${customerId}, leadId establecido a ${leadIdValue} (valor proporcionado: ${orderDetails.leadId || 'null'})`);
      
      const [order] = await db.insert(orders).values({
        customerId,
        leadId: leadIdValue, // Null si hay customerId
        orderNumber: orderNumber,
        totalAmount,
        status: orderDetails.status || 'new',
        paymentStatus: orderDetails.paymentStatus || 'pending',
        paymentMethod: orderDetails.paymentMethod || null,
        source: orderDetails.source || 'direct',
        brand: orderDetails.brand || customer.brand || 'sleepwear',
        notes: orderDetails.notes || null,
        shippingAddress: orderDetails.shippingAddress || {},
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
          customer: {
            columns: {
              id: true,
              name: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              phoneCountry: true,
              phoneNumber: true,
              street: true,
              city: true,
              province: true,
              deliveryInstructions: true,
              idNumber: true,
              type: true,
              source: true,
              brand: true
            }
          },
          items: {
            columns: {
              id: true,
              productId: true,
              productName: true,
              quantity: true,
              unitPrice: true,
              discount: true,
              subtotal: true,
              attributes: true
            }
          },
          assignedUser: true
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
      // Si tenemos customerId, establecemos leadId a null según la lógica de negocio
      // Los pedidos deben asociarse únicamente a clientes (no a leads)
      const leadIdValue = customerId ? null : (orderDetails.leadId ?? existingOrder.leadId);
      
      console.log(`[OrderService] Actualizando orden ${orderId}: customerId=${customerId}, leadId establecido a ${leadIdValue} (valor original: ${existingOrder.leadId})`);
      
      const [updatedOrder] = await db.update(orders)
        .set({
          customerId,
          leadId: leadIdValue, // Si hay cliente, no debe haber lead
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
          customer: {
            columns: {
              id: true,
              name: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              phoneCountry: true,
              phoneNumber: true,
              street: true,
              city: true,
              province: true,
              deliveryInstructions: true,
              idNumber: true,
              type: true,
              source: true,
              brand: true
            }
          },
          items: {
            columns: {
              id: true,
              productId: true,
              productName: true,
              quantity: true,
              unitPrice: true,
              discount: true,
              subtotal: true,
              attributes: true
            }
          },
          assignedUser: true
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
      const [updatedOrderBasic] = await db.update(orders)
        .set({
          status,
          notes: notes 
            ? `${existingOrder.notes ? existingOrder.notes + '\n' : ''}Status changed to ${status}: ${notes}`
            : existingOrder.notes,
          updatedAt: new Date()
        })
        .where(eq(orders.id, orderId))
        .returning();

      // Obtener el pedido actualizado con toda la información relacionada
      const updatedOrder = await db.query.orders.findFirst({
        where: eq(orders.id, orderId),
        with: {
          customer: {
            columns: {
              id: true,
              name: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              phoneCountry: true,
              phoneNumber: true,
              street: true,
              city: true,
              province: true,
              deliveryInstructions: true,
              idNumber: true,
              type: true,
              source: true,
              brand: true
            }
          },
          items: {
            columns: {
              id: true,
              productId: true,
              productName: true,
              quantity: true,
              unitPrice: true,
              discount: true,
              subtotal: true,
              attributes: true
            }
          },
          assignedUser: true
        }
      });

      // Emit order status changed event
      appEvents.emit(EventTypes.ORDER_STATUS_CHANGED, {
        order: updatedOrderBasic,
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
      const [updatedOrderBasic] = await db.update(orders)
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

      // Obtener el pedido actualizado con toda la información relacionada
      const updatedOrder = await db.query.orders.findFirst({
        where: eq(orders.id, orderId),
        with: {
          customer: {
            columns: {
              id: true,
              name: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              phoneCountry: true,
              phoneNumber: true,
              street: true,
              city: true,
              province: true,
              deliveryInstructions: true,
              idNumber: true,
              type: true,
              source: true,
              brand: true
            }
          },
          items: {
            columns: {
              id: true,
              productId: true,
              productName: true,
              quantity: true,
              unitPrice: true,
              discount: true,
              subtotal: true,
              attributes: true
            }
          },
          assignedUser: true
        }
      });

      // Emit order payment status changed event
      appEvents.emit(EventTypes.ORDER_PAYMENT_STATUS_CHANGED, {
        order: updatedOrderBasic,
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
    // Use current timestamp's last 6 digits for uniqueness
    const timestamp = Date.now().toString().slice(-6);
    // Add 2-5 random alphanumeric characters to make it even more unique
    const randomChars = Math.random().toString(36).slice(2, 7).toUpperCase();
    // Combine into a unique order number format
    return `${prefix}-${randomChars}${timestamp}`;
  }

  /**
   * Creates an order from shipping form data
   * Allows creating orders without products by assigning 'pendiente_de_completar' status
   * 
   * @param orderData Order data with customer and shipping information
   * @returns Created order data
   */
  async createOrderFromShippingForm(orderData: {
    customerId?: number;
    customerName?: string;
    email?: string;
    phone?: string;
    idNumber?: string;
    items?: any[]; // Optional items array
    shippingAddress?: any;
    orderNumber?: string;
    source?: string;
    notes?: string;
    brand?: string;
    paymentMethod?: string;
    paymentStatus?: string;
    [key: string]: any; // Allow other properties
  }): Promise<any> {
    try {
      let { customerId, items, ...orderDetails } = orderData;
      let customer = null;

      // Attempt to find or create a customer
      if (customerId) {
        // If customerId is provided, verify customer exists
        customer = await db.query.customers.findFirst({
          where: eq(customers.id, customerId)
        });
      }

      // If no customerId provided or customer not found by ID, try to find by other identifiers
      if (!customer) {
        // Try to find by identification number
        if (orderDetails.idNumber) {
          customer = await db.query.customers.findFirst({
            where: eq(customers.idNumber, orderDetails.idNumber)
          });
        }

        // Try to find by phone (usando búsqueda mejorada)
        if (!customer && orderDetails.phone) {
          // Limpiar el número de teléfono para comparación
          const cleanPhone = orderDetails.phone.replace(/\D/g, '');

          // Preparar condiciones de búsqueda
          const conditions = [];

          // Añadir condiciones básicas
          conditions.push(eq(customers.phone, orderDetails.phone));
          conditions.push(eq(customers.phone, cleanPhone));
          conditions.push(eq(customers.phoneNumber, cleanPhone));

          // Añadir búsqueda con coincidencia parcial si hay suficientes dígitos
          if (cleanPhone.length >= 7) {
            conditions.push(like(customers.phone, `%${cleanPhone.slice(-7)}`));
          }

          // Buscar con múltiples formatos
          customer = await db.query.customers.findFirst({
            where: or(...conditions)
          });
        }

        // Try to find by email
        if (!customer && orderDetails.email) {
          customer = await db.query.customers.findFirst({
            where: eq(customers.email, orderDetails.email)
          });
        }

        // Si aún no se encontró un cliente, crear uno nuevo con los datos disponibles
        if (!customer) {
          console.log('Creating new customer from shipping form data');

          // Obtener el nombre del cliente de customerName o shippingAddress
          const name = orderDetails.customerName || orderDetails.shippingAddress?.name;

          if (!name) {
            throw new Error("Customer name is required to create a new customer");
          }

          // Extraer información adicional del objeto shippingAddress si existe
          const shippingAddress = orderDetails.shippingAddress || {};

          // Crear cliente con toda la información disponible
          const [newCustomer] = await db.insert(customers).values({
            name,
            phone: orderDetails.phone || shippingAddress.phone || null,
            email: orderDetails.email || shippingAddress.email || null,
            idNumber: orderDetails.idNumber || shippingAddress.idNumber || null,
            street: shippingAddress.street || null,
            city: shippingAddress.city || null,
            province: shippingAddress.province || null,
            deliveryInstructions: shippingAddress.instructions || null,
            source: orderDetails.source || sourceEnum.WEBSITE,
            brand: orderDetails.brand || brandEnum.SLEEPWEAR,
            createdAt: new Date(),
            updatedAt: new Date()
          }).returning();

          customer = newCustomer;
          customerId = newCustomer.id;
          console.log(`Created new customer with ID: ${customerId}`);
        }
      }

      if (!customer) {
        throw new Error("Unable to find or create customer. Customer information is required.");
      }

      // Update customerId with the found or created customer
      customerId = customer.id;

      // Calculate total amount from items if provided
      let totalAmount = "0.00";
      let subtotal = "0.00";

      // Determine if we have products and calculate totals if we do
      const hasProducts = items && Array.isArray(items) && items.length > 0;

      if (hasProducts) {
        let calculatedTotal = 0;
        let calculatedSubtotal = 0;

        for (const item of items) {
          const itemSubtotal = parseFloat(item.unitPrice) * item.quantity;
          calculatedSubtotal += itemSubtotal;
          // Apply item discount if present
          const itemDiscount = item.discount ? parseFloat(item.discount) : 0;
          calculatedTotal += itemSubtotal - itemDiscount;
        }

        totalAmount = calculatedTotal.toFixed(2);
        subtotal = calculatedSubtotal.toFixed(2);
      }

      // Procesar y normalizar datos de envío
      const shippingInfo = {
        name: orderData.name || orderData.customerName,
        phone: orderData.phone,
        email: orderData.email,
        street: orderData.street || orderData?.shippingAddress?.street,
        city: orderData.city || orderData?.shippingAddress?.city,
        province: orderData.province || orderData?.shippingAddress?.province,
        instructions: orderData.deliveryInstructions || orderData?.shippingAddress?.instructions || '',
        idNumber: orderData.idNumber || orderData?.shippingAddress?.idNumber,
        // Procesar datos anidados si existen
        ...(orderData.shippingAddress?.additionalDetails && {
          additionalDetails: orderData.shippingAddress.additionalDetails
        })
      };


      // Ahora usamos directamente los datos del cliente como referencia para crear la orden
      // Cuando se deba imprimir el PDF, se utilizará la información directamente del cliente
      // No se almacena una copia de los datos de envío por cada pedido, solo se guarda una referencia
      const [newOrder] = await db.insert(orders).values({
        customerId,
        leadId: orderDetails.leadId || null,
        orderNumber: orderDetails.orderNumber || this.generateOrderNumber(),
        totalAmount,
        subtotal,
        status: hasProducts ? (orderDetails.status || orderStatusEnum.NEW) : orderStatusEnum.PENDIENTE_DE_COMPLETAR,
        paymentStatus: orderDetails.paymentStatus || paymentStatusEnum.PENDING,
        paymentMethod: orderDetails.paymentMethod || paymentMethodEnum.OTHER,
        source: orderDetails.source || sourceEnum.WEBSITE,
        isFromWebForm: true,
        brand: orderDetails.brand || customer.brand || brandEnum.SLEEPWEAR,
        shippingAddress: {
          // Guardamos un identificador que indique que se debe usar la dirección del cliente
          useCustomerAddress: true,
          // Guardamos una caché de los datos para tener un histórico, pero no se usará para la generación de etiquetas
          customerId: customer.id,
          customerName: customer.name,
          source: orderDetails.source || 'web_form',
          createdAt: new Date().toISOString()
        },
        notes: orderDetails.notes || (hasProducts ? null : "Orden creada sin productos - Pendiente de completar"),
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      // Insert order items if we have them
      if (hasProducts) {
        for (const item of items) {
          await db.insert(orderItems).values({
            orderId: newOrder.id,
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount || "0.00",
            subtotal: (parseFloat(item.unitPrice) * item.quantity).toFixed(2),
            attributes: item.attributes || {},
            createdAt: new Date()
          });

          // Update product stock if item has a product ID
          if (item.productId) {
            await db.transaction(async (tx) => {
              const product = await tx.query.products.findFirst({
                where: eq(products.id, item.productId)
              });

              if (product) {
                const currentStock = product.stock || 0;
                await tx
                  .update(products)
                  .set({
                    stock: currentStock - item.quantity,
                    updatedAt: new Date()
                  })
                  .where(eq(products.id, item.productId));
              }
            });
          }
        }
      }

      // Emit order created event
      appEvents.emit(EventTypes.ORDER_CREATED, { 
        id: newOrder.id,
        customerId,
        orderNumber: newOrder.orderNumber,
        status: newOrder.status,
        paymentStatus: newOrder.paymentStatus,
        source: newOrder.source
      });

      return newOrder;
    } catch (error) {
      console.error('Error in createOrderFromShippingForm:', error);
      throw error;
    }
  }
}

// Create and export the service instance
export const ordersService = new OrdersService();