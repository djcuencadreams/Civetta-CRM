/**
 * Rutas de API para pedidos (orders)
 */
import { Express, Request, Response } from "express";
import { db } from "../db";
import { customers, orders, orderItems } from "../db/schema";
import { eq, and, desc, isNull, or } from "drizzle-orm";
import { validateBody } from "./validation";
import { z } from "zod";

// Schema de validación para creación/actualización de pedidos
const orderSchema = z.object({
  customerId: z.number().min(1, { message: "El ID del cliente es requerido" }).optional(),
  leadId: z.number().nullable().optional(),
  orderNumber: z.string().nullable().optional(),
  totalAmount: z.number().min(0),
  status: z.string(),
  paymentStatus: z.string(),
  paymentMethod: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  brand: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  items: z.array(
    z.object({
      id: z.number().optional(),
      productId: z.number().nullable(),
      productName: z.string(),
      quantity: z.number().min(1),
      unitPrice: z.number().min(0),
      discount: z.number().min(0).default(0),
      subtotal: z.number().min(0),
    })
  ),
  shippingAddress: z.object({
    name: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    street: z.string().optional(),
    city: z.string().optional(),
    province: z.string().optional(),
    idNumber: z.string().optional(),
    instructions: z.string().optional(),
    companyName: z.string().optional()
  }).optional()
});

// Schema para actualización de estado
const statusUpdateSchema = z.object({
  status: z.string(),
  reason: z.string().optional(),
});

/**
 * Registra todas las rutas relacionadas con pedidos
 * @param app Express app
 */
export function registerOrderRoutes(app: Express) {
  // Mock data para pedidos
  const mockOrders = [
    {
      id: 1,
      customerId: 143,
      leadId: null,
      orderNumber: "ORD-KJ2A9F",
      totalAmount: 259.98,
      status: "completed",
      paymentStatus: "paid",
      paymentMethod: "credit_card",
      source: "direct",
      brand: "Sleepwear",
      notes: "Entrega prioritaria",
      createdAt: new Date("2025-02-20"),
      updatedAt: new Date("2025-02-21"),
      customer: {
        id: 143,
        name: "Natalia Mercedes Camacho H.",
        email: "natalia.camacho@ejemplo.com"
      },
      items: [
        {
          id: 1,
          orderId: 1,
          productId: 1,
          productName: "Pijama de Seda",
          quantity: 2,
          unitPrice: 89.99,
          discount: 0,
          subtotal: 179.98,
          createdAt: new Date("2025-02-20")
        },
        {
          id: 2,
          orderId: 1,
          productId: 3,
          productName: "Pantuflas de Algodón",
          quantity: 2,
          unitPrice: 39.99,
          discount: 0,
          subtotal: 79.98,
          createdAt: new Date("2025-02-20")
        }
      ]
    },
    {
      id: 2,
      customerId: 143,
      leadId: null,
      orderNumber: "ORD-LM3B7G",
      totalAmount: 129.99,
      status: "shipped",
      paymentStatus: "paid",
      paymentMethod: "transfer",
      source: "direct",
      brand: "Bride",
      notes: null,
      createdAt: new Date("2025-02-25"),
      updatedAt: new Date("2025-02-26"),
      customer: {
        id: 143,
        name: "Natalia Mercedes Camacho H.",
        email: "natalia.camacho@ejemplo.com"
      },
      items: [
        {
          id: 3,
          orderId: 2,
          productId: 2,
          productName: "Bata de Novia",
          quantity: 1,
          unitPrice: 129.99,
          discount: 0,
          subtotal: 129.99,
          createdAt: new Date("2025-02-25")
        }
      ]
    }
  ];

  // Obtener todos los pedidos
  app.get("/api/orders", (_req: Request, res: Response) => {
    try {
      // Usar los datos mock previamente definidos
      res.json(mockOrders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ error: "Error al obtener pedidos" });
    }
  });

  // Obtener un pedido específico
  app.get("/api/orders/:id", async (req: Request, res: Response) => {
    try {
      const param = req.params.id;

      const order = await db.query.orders.findFirst({
        where: or(
          eq(orders.orderNumber, param),
          eq(orders.id, parseInt(param))
        ),
        with: {
          customer: true,
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
        return res.status(404).json({ error: "Pedido no encontrado" });
      }

      // Ensure order status reflects incomplete state
      if (!order.items || order.items.length === 0) {
        order.status = "pendiente_de_completar";
      }

      // If order has customerId but no customer data, force fetch it
      if (order.customerId && !order.customer) {
        console.log(`⚠️ Order ${order.id} has customerId ${order.customerId} but no customer data, fetching...`);
        
        order.customer = await db.query.customers.findFirst({
          where: eq(customers.id, order.customerId),
          columns: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            phoneNumber: true,
            street: true,
            city: true,
            province: true,
            idNumber: true,
            deliveryInstructions: true, 
            companyName: true,
            type: true,
            source: true,
            brand: true,
            notes: true,
            createdAt: true,
            updatedAt: true
          }
        });

        if (order.customer) {
          console.log(`✅ Customer ${order.customer.id} data retrieved successfully`);
        }
      }

      // Remove any fake customer data from shippingAddress
      if (!order.customerId) {
        order.customer = null;
      }

      console.log('GET /api/orders/:id response:', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerId: order.customerId,
        hasCustomer: !!order.customer,
        shippingAddress: order.shippingAddress,
        isWebForm: order.isFromWebForm
      });

      res.json({
        ...order,
        customer: order.customer || null
      });
    } catch (error) {
      console.error("Error fetching order:", error);
      res.status(500).json({ error: "Error al obtener el pedido" });
    }
  });

  // Crear un nuevo pedido
  app.post("/api/orders", validateBody(orderSchema), async (req: Request, res: Response) => {
    try {
      const orderData = req.body;
      const { totalAmount, status, paymentStatus, paymentMethod, 
              source, brand, notes, items, orderNumber, leadId, shippingAddress } = orderData;

      let customer = null;
      
      // Buscar cliente existente por múltiples campos  (Adaptado de los cambios proporcionados)
      if (orderData.customerId) {
        customer = await db.query.customers.findFirst({
          where: eq(customers.id, orderData.customerId)
        });
      } else if (shippingAddress) {
        const conditions = [];
        if (shippingAddress.idNumber) {
          conditions.push(eq(customers.idNumber, shippingAddress.idNumber));
        }
        if (shippingAddress.email) {
          conditions.push(eq(customers.email, shippingAddress.email));
        }
        if (shippingAddress.phone) {
          const cleanPhone = shippingAddress.phone.replace(/\D/g, '');
          conditions.push(
            or(
              eq(customers.phone, shippingAddress.phone),
              eq(customers.phone, cleanPhone),
              eq(customers.phoneNumber, cleanPhone)
            )
          );
        }
        if (conditions.length > 0) {
          customer = await db.query.customers.findFirst({
            where: or(...conditions)
          });
        }
      }

      // Si no existe, crear nuevo cliente (Adaptado de los cambios proporcionados)
      if (!customer && shippingAddress && shippingAddress.name) {
        console.log('👤 Creando nuevo cliente desde formulario web');
        const [newCustomer] = await db.insert(customers).values({
          name: shippingAddress.name,
          email: shippingAddress.email || null,
          phone: shippingAddress.phone || null,
          idNumber: shippingAddress.idNumber || null,
          street: shippingAddress.street || null,
          city: shippingAddress.city || null,
          province: shippingAddress.province || null,
          source: 'website',
          type: 'person',
          status: 'active',
          brand: orderData.brand || 'sleepwear',
          createdAt: new Date(),
          updatedAt: new Date()
        }).returning();
        customer = newCustomer;
        console.log('✅ Nuevo cliente creado:', customer);
      }

      if (!customer) {
        res.status(400).json({ error: "No se pudo encontrar o crear el cliente" });
        return;
      }

      // Generar número de pedido si no se proporcionó
      const generatedOrderNumber = orderNumber || 
        `ORD-${Math.floor(Date.now() / 1000).toString(36).toUpperCase()}`;

      // Crear el pedido (CustomerID is now correctly assigned)
      const [newOrder] = await db.insert(orders).values({
        customerId: customer.id,
        leadId,
        orderNumber: generatedOrderNumber,
        totalAmount,
        status: status || "pendiente_de_completar", // Default to pending
        paymentStatus,
        paymentMethod,
        source: source || "website", // Default to website
        brand: brand || customer.brand,
        notes,
        shippingAddress: shippingAddress,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();

      // Crear los items del pedido
      if (items && items.length > 0) {
        for (const item of items) {
          await db.insert(orderItems).values({
            orderId: newOrder.id,
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount || 0,
            subtotal: item.subtotal,
            createdAt: new Date(),
          });
        }
      }

      // Obtener el pedido completo con sus items
      const completedOrder = await db.query.orders.findFirst({
        where: eq(orders.id, newOrder.id),
        with: {
          customer: true,
          items: true,
        },
      });

      res.status(201).json(completedOrder);
    } catch (error) {
      console.error("Error creating order:", error);
      res.status(500).json({ error: "Error al crear el pedido" });
    }
  });

  // Actualizar un pedido existente
  app.patch("/api/orders/:id", validateBody(orderSchema), async (req: Request, res: Response) => {
    try {
      const orderId = parseInt(req.params.id);

      if (isNaN(orderId)) {
        return res.status(400).json({ error: "ID de pedido inválido" });
      }

      const { customerId, totalAmount, status, paymentStatus, paymentMethod, 
              source, brand, notes, items, orderNumber, leadId } = req.body;

      // Verificar que el pedido existe
      const existingOrder = await db.query.orders.findFirst({
        where: eq(orders.id, orderId),
        with: { items: true },
      });

      if (!existingOrder) {
        return res.status(404).json({ error: "Pedido no encontrado" });
      }

      // Actualizar el pedido
      await db.update(orders)
        .set({
          customerId,
          leadId,
          orderNumber,
          totalAmount,
          status,
          paymentStatus,
          paymentMethod,
          source,
          brand,
          notes,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId));

      // Actualizar los items del pedido
      if (items && items.length > 0) {
        // Obtener IDs de los items existentes
        const existingItemIds = existingOrder.items?.map(item => item.id) || [];
        const newItemIds = items.filter(item => item.id).map(item => item.id as number);

        // Encontrar items a eliminar (están en existingItemIds pero no en newItemIds)
        const itemsToDelete = existingItemIds.filter(id => !newItemIds.includes(id));

        // Eliminar items que ya no están en la lista
        if (itemsToDelete.length > 0) {
          for (const itemId of itemsToDelete) {
            await db.delete(orderItems)
              .where(eq(orderItems.id, itemId));
          }
        }

        // Actualizar o crear items
        for (const item of items) {
          if (item.id) {
            // Actualizar item existente
            await db.update(orderItems)
              .set({
                productId: item.productId,
                productName: item.productName,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discount: item.discount || 0,
                subtotal: item.subtotal,
              })
              .where(eq(orderItems.id, item.id));
          } else {
            // Crear nuevo item
            await db.insert(orderItems).values({
              orderId,
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discount: item.discount || 0,
              subtotal: item.subtotal,
              createdAt: new Date(),
            });
          }
        }
      }

      // Obtener el pedido actualizado
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
              phoneNumber: true,
              street: true,
              city: true,
              province: true,
              idNumber: true,
              deliveryInstructions: true,
              companyName: true,
              type: true,
              source: true,
              brand: true,
              notes: true,
              createdAt: true,  
              updatedAt: true
            }
          },
          items: true,
        },
      });

      res.json(updatedOrder);
    } catch (error) {
      console.error("Error updating order:", error);
      res.status(500).json({ error: "Error al actualizar el pedido" });
    }
  });

  // Eliminar un pedido
  app.delete("/api/orders/:id", async (req: Request, res: Response) => {
    try {
      const orderId = parseInt(req.params.id);

      if (isNaN(orderId)) {
        return res.status(400).json({ error: "ID de pedido inválido" });
      }

      // Verificar que el pedido existe
      const existingOrder = await db.query.orders.findFirst({
        where: eq(orders.id, orderId),
      });

      if (!existingOrder) {
        return res.status(404).json({ error: "Pedido no encontrado" });
      }

      // Primero eliminar los items del pedido
      await db.delete(orderItems)
        .where(eq(orderItems.orderId, orderId));

      // Luego eliminar el pedido
      await db.delete(orders)
        .where(eq(orders.id, orderId));

      res.json({ 
        success: true, 
        message: "Pedido eliminado correctamente",
        id: orderId 
      });
    } catch (error) {
      console.error("Error deleting order:", error);
      res.status(500).json({ error: "Error al eliminar el pedido" });
    }
  });

  // Actualizar el estado de un pedido
  app.patch("/api/orders/:id/status", validateBody(statusUpdateSchema), async (req: Request, res: Response) => {
    try {
      const orderId = parseInt(req.params.id);
      const { status, reason } = req.body;

      if (isNaN(orderId)) {
        return res.status(400).json({ error: "ID de pedido inválido" });
      }

      // Verificar que el estado sea válido
      const validStatuses = ['new', 'preparing', 'shipped', 'completed', 'cancelled', 'pendiente_de_completar'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ 
          error: "Estado inválido", 
          message: "El estado debe ser uno de: nuevo, preparando, enviado, completado, cancelado, pendiente_de_completar"
        });
      }

      // Verificar que el pedido existe
      const existingOrder = await db.query.orders.findFirst({
        where: eq(orders.id, orderId),
      });

      if (!existingOrder) {
        return res.status(404).json({ error: "Pedido no encontrado" });
      }

      // Actualizar el estado del pedido
      const updateData: any = { 
        status, 
        updatedAt: new Date() 
      };

      // Si hay una razón proporcionada (especialmente para cancelaciones), guardarla en notas
      if (reason) {
        updateData.notes = existingOrder.notes 
          ? `${existingOrder.notes}\n[${new Date().toLocaleString()}] Cambio a ${status}: ${reason}`
          : `[${new Date().toLocaleString()}] Cambio a ${status}: ${reason}`;
      }

      await db.update(orders)
        .set(updateData)
        .where(eq(orders.id, orderId));

      res.json({ 
        success: true, 
        message: "Estado actualizado correctamente",
        status
      });
    } catch (error) {
      console.error("Error updating order status:", error);
      res.status(500).json({ error: "Error al actualizar el estado del pedido" });
    }
  });

  // Schema para actualización de estado de pago
  const paymentStatusUpdateSchema = z.object({
    status: z.string().min(1, { message: "El estado de pago es requerido" }),
    notes: z.string().optional()
  });

  // Endpoint para actualizar el estado de pago de un pedido
  app.patch("/api/orders/:id/payment-status", validateBody(paymentStatusUpdateSchema), async (req: Request, res: Response) => {
    try {
      const orderId = parseInt(req.params.id);
      const { status, notes } = req.body;

      if (isNaN(orderId)) {
        return res.status(400).json({ error: "ID de pedido inválido" });
      }

      // Verificar que el estado de pago sea válido
      const validPaymentStatuses = ['pending', 'paid', 'refunded'];
      if (!validPaymentStatuses.includes(status)) {
        return res.status(400).json({ 
          error: "Estado de pago inválido", 
          message: "El estado de pago debe ser uno de: pendiente, pagado, reembolsado"
        });
      }

      // Verificar que el pedido existe
      const existingOrder = await db.query.orders.findFirst({
        where: eq(orders.id, orderId),
      });

      if (!existingOrder) {
        return res.status(404).json({ error: "Pedido no encontrado" });
      }

      // Actualizar el estado de pago del pedido
      const updateData: any = { 
        paymentStatus: status, 
        updatedAt: new Date() 
      };

      // Si hay notas proporcionadas (especialmente para reembolsos), guardarlas
      if (notes) {
        updateData.notes = existingOrder.notes 
          ? `${existingOrder.notes}\n[${new Date().toLocaleString()}] Cambio de pago a ${status}: ${notes}`
          : `[${new Date().toLocaleString()}] Cambio de pago a ${status}: ${notes}`;
      }

      await db.update(orders)
        .set(updateData)
        .where(eq(orders.id, orderId));

      res.json({ 
        success: true, 
        message: "Estado de pago actualizado correctamente",
        status
      });
    } catch (error) {
      console.error("Error updating payment status:", error);
      res.status(500).json({ error: "Error al actualizar el estado de pago del pedido" });
    }
  });

  // Obtener productos para usar en pedidos
  app.get("/api/products", async (_req: Request, res: Response) => {
    try {
      // Crear datos de ejemplo para prueba
      const productsList = [
        {
          id: 1,
          name: "Pijama de Seda",
          sku: "PJS001",
          description: "Pijama de seda de lujo",
          price: 89.99,
          stock: 25,
          active: true,
          brand: "Sleepwear",
          category: "Pijamas",
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 2,
          name: "Bata de Novia",
          sku: "BRD002",
          description: "Bata elegante para novia",
          price: 129.99,
          stock: 15,
          active: true,
          brand: "Bride",
          category: "Bodas",
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 3,
          name: "Pantuflas de Algodón",
          sku: "PNT003",
          description: "Pantuflas suaves de algodón",
          price: 39.99,
          stock: 40,
          active: true,
          brand: "Sleepwear",
          category: "Calzado",
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      res.json(productsList);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ error: "Error al obtener productos" });
    }
  });
}