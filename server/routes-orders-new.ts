/**
 * Rutas de API para pedidos (orders)
 */
import { Express, Request, Response } from "express";
import { db, dbNew, pool } from "../db";
import { customers } from "../db/schema";
import { orders, orderItems } from "../db/schema-new";
import { eq, desc } from "drizzle-orm";
import { validateBody } from "./validation";
import { z } from "zod";

// Schema de validación para creación/actualización de pedidos
const orderSchema = z.object({
  customerId: z.number().min(1, { message: "El ID del cliente es requerido" }),
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
  app.get("/api/orders", async (_req: Request, res: Response) => {
    try {
      // Obtener todos los pedidos de la base de datos con campos específicos para evitar errores
      // Enfoque simplificado para resolver temporalmente el problema
      // Obtener datos directamente de la tabla orders usando SQL nativo
      const { rows } = await pool.query(`
        SELECT 
          id, 
          customer_id as "customerId", 
          lead_id as "leadId",
          order_number as "orderNumber", 
          total_amount as "totalAmount", 
          status, 
          payment_status as "paymentStatus", 
          payment_method as "paymentMethod", 
          source, 
          brand, 
          notes,
          created_at as "createdAt", 
          updated_at as "updatedAt"
        FROM orders
        ORDER BY created_at DESC
        LIMIT 100
      `);
      
      // Formatear resultados
      const formattedOrders = rows.map((order: any) => ({
        ...order,
        // Convertir explícitamente valores numéricos
        id: Number(order.id),
        customerId: Number(order.customerId),
        totalAmount: order.totalAmount
      }));
    
      // Devolver los pedidos formateados para evitar problemas de nombres de campos
      res.json(formattedOrders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ error: "Error al obtener pedidos" });
    }
  });
  
  // Obtener un pedido específico
  app.get("/api/orders/:id", async (req: Request, res: Response) => {
    try {
      const orderId = parseInt(req.params.id);
      
      if (isNaN(orderId)) {
        return res.status(400).json({ error: "ID de pedido inválido" });
      }
      
      // Utilizar enfoque SQL plano para evitar errores de columnas
      const { rows } = await pool.query(`
        SELECT 
          id, 
          customer_id as "customerId", 
          lead_id as "leadId",
          order_number as "orderNumber", 
          total_amount as "totalAmount", 
          status, 
          payment_status as "paymentStatus", 
          payment_method as "paymentMethod", 
          source, 
          brand, 
          notes,
          created_at as "createdAt", 
          updated_at as "updatedAt"
        FROM orders
        WHERE id = $1
        LIMIT 1
      `, [orderId]);
      
      // Si no hay resultados, retornar 404
      if (rows.length === 0) {
        return res.status(404).json({ error: "Pedido no encontrado" });
      }
      
      // Formatear el resultado para mantener consistencia
      const order = {
        ...rows[0],
        id: Number(rows[0].id),
        customerId: Number(rows[0].customerId),
        totalAmount: rows[0].totalAmount
      };
      
      if (!order) {
        return res.status(404).json({ error: "Pedido no encontrado" });
      }
      
      res.json(order);
    } catch (error) {
      console.error("Error fetching order:", error);
      res.status(500).json({ error: "Error al obtener el pedido" });
    }
  });
  
  // Crear un nuevo pedido
  app.post("/api/orders", validateBody(orderSchema), async (req: Request, res: Response) => {
    try {
      const { customerId, totalAmount, status, paymentStatus, paymentMethod, 
              source, brand, notes, items, orderNumber, leadId } = req.body;
      
      // Verificar que el cliente existe
      const customer = await db.query.customers.findFirst({
        where: eq(customers.id, customerId),
      });
      
      if (!customer) {
        return res.status(400).json({ error: "El cliente especificado no existe" });
      }
      
      // Generar número de pedido si no se proporcionó
      const generatedOrderNumber = orderNumber || 
        `ORD-${Math.floor(Date.now() / 1000).toString(36).toUpperCase()}`;
      
      // Crear el pedido en la base de datos
      const [insertedOrder] = await dbNew.insert(orders)
        .values({
          customerId,
          leadId: leadId || null,
          orderNumber: generatedOrderNumber,
          totalAmount,
          status,
          paymentStatus,
          paymentMethod: paymentMethod || null,
          source: source || "direct",
          brand: brand || customer.brand,
          notes: notes || null,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
        
      if (!insertedOrder) {
        return res.status(500).json({ error: "Error al crear el pedido" });
      }
      
      // Agregar los items del pedido
      if (items && items.length > 0) {
        for (const item of items) {
          await dbNew.insert(orderItems)
            .values({
              orderId: insertedOrder.id,
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discount: item.discount || 0,
              subtotal: item.subtotal,
              createdAt: new Date()
            });
        }
      }
      
      // Obtener el pedido completo con sus relaciones
      const newOrderWithRelations = await dbNew.query.orders.findFirst({
        where: eq(orders.id, insertedOrder.id),
        with: {
          customer: {
            // Seleccionamos campos específicos para evitar errores de columnas no existentes
            columns: {
              id: true,
              name: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              street: true,
              city: true,
              province: true,
              deliveryInstructions: true,
              type: true
            }
          },
          items: true
        }
      });
      
      res.status(201).json(newOrderWithRelations);
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
      
      // Buscar el pedido existente en la base de datos
      const existingOrder = await dbNew.query.orders.findFirst({
        where: eq(orders.id, orderId),
        with: {
          items: true
        }
      });
      
      if (!existingOrder) {
        return res.status(404).json({ error: "Pedido no encontrado" });
      }
      
      const { customerId, totalAmount, status, paymentStatus, paymentMethod, 
              source, brand, notes, items, orderNumber, leadId } = req.body;
      
      // Actualizar el pedido en la base de datos
      await dbNew.update(orders)
        .set({
          customerId,
          leadId: leadId || null,
          orderNumber: orderNumber || existingOrder.orderNumber,
          totalAmount,
          status,
          paymentStatus,
          paymentMethod: paymentMethod || null,
          source: source || existingOrder.source,
          brand: brand || existingOrder.brand,
          notes: notes || existingOrder.notes,
          updatedAt: new Date()
        })
        .where(eq(orders.id, orderId));
      
      // Manejar los items del pedido
      if (items && items.length > 0) {
        // Primero, eliminar todos los items existentes para este pedido
        await dbNew.delete(orderItems)
          .where(eq(orderItems.orderId, orderId));
        
        // Luego insertar los nuevos items
        for (const item of items) {
          await dbNew.insert(orderItems)
            .values({
              orderId,
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discount: item.discount || 0,
              subtotal: item.subtotal,
              createdAt: new Date()
            });
        }
      }
      
      // Obtener el pedido actualizado con sus relaciones para devolverlo
      const updatedOrder = await dbNew.query.orders.findFirst({
        where: eq(orders.id, orderId),
        with: {
          customer: {
            // Seleccionamos campos específicos para evitar errores de columnas no existentes
            columns: {
              id: true,
              name: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              street: true,
              city: true,
              province: true,
              deliveryInstructions: true,
              type: true
            }
          },
          items: true
        }
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
      
      // Verificar que el pedido existe en la base de datos
      const existingOrder = await dbNew.query.orders.findFirst({
        where: eq(orders.id, orderId)
      });
      
      if (!existingOrder) {
        return res.status(404).json({ error: "Pedido no encontrado" });
      }
      
      // Primero eliminar todos los items asociados al pedido
      await dbNew.delete(orderItems)
        .where(eq(orderItems.orderId, orderId));
      
      // Luego eliminar el pedido
      await dbNew.delete(orders)
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
  
  // Schema para actualización de estado de pago
  const paymentStatusUpdateSchema = z.object({
    paymentStatus: z.string(),
    reason: z.string().optional(),
  });

  // Actualizar el estado de pago de un pedido
  app.patch("/api/orders/:id/payment-status", validateBody(paymentStatusUpdateSchema), async (req: Request, res: Response) => {
    try {
      const orderId = parseInt(req.params.id);
      const { paymentStatus, reason } = req.body;
      
      if (isNaN(orderId)) {
        return res.status(400).json({ error: "ID de pedido inválido" });
      }
      
      // Verificar que el estado de pago sea válido
      const validPaymentStatuses = ['pending', 'paid', 'refunded', 'cancelled'];
      if (!validPaymentStatuses.includes(paymentStatus)) {
        return res.status(400).json({ 
          error: "Estado de pago inválido", 
          message: "El estado de pago debe ser uno de: pendiente, pagado, reembolsado, cancelado"
        });
      }
      
      // Buscar el pedido existente en la base de datos
      const order = await dbNew.query.orders.findFirst({
        where: eq(orders.id, orderId)
      });
      
      if (!order) {
        return res.status(404).json({ error: "Pedido no encontrado" });
      }
      
      // Actualizar el estado de pago del pedido en la base de datos
      await dbNew.update(orders)
        .set({ 
          paymentStatus: paymentStatus,
          updatedAt: new Date()
        })
        .where(eq(orders.id, orderId));
      
      // Si hay una razón proporcionada, actualizar las notas
      if (reason) {
        const existingNotes = order.notes;
        const updatedNotes = existingNotes
          ? `${existingNotes}\n[${new Date().toLocaleString()}] Cambio de estado de pago a ${paymentStatus}: ${reason}`
          : `[${new Date().toLocaleString()}] Cambio de estado de pago a ${paymentStatus}: ${reason}`;
        
        await dbNew.update(orders)
          .set({ notes: updatedNotes })
          .where(eq(orders.id, orderId));
      }
      
      res.json({ 
        success: true, 
        message: "Estado de pago actualizado correctamente",
        paymentStatus
      });
    } catch (error) {
      console.error("Error updating payment status:", error);
      res.status(500).json({ error: "Error al actualizar el estado de pago del pedido" });
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
      const validStatuses = ['new', 'preparing', 'shipped', 'completed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ 
          error: "Estado inválido", 
          message: "El estado debe ser uno de: nuevo, preparando, enviado, completado, cancelado"
        });
      }
      
      // Buscar el pedido existente en la base de datos
      const order = await dbNew.query.orders.findFirst({
        where: eq(orders.id, orderId)
      });
      
      if (!order) {
        return res.status(404).json({ error: "Pedido no encontrado" });
      }
      
      // Actualizar el estado del pedido en la base de datos
      await dbNew.update(orders)
        .set({ 
          status: status,
          updatedAt: new Date()
        })
        .where(eq(orders.id, orderId));
      
      // Si hay una razón proporcionada (especialmente para cancelaciones), actualizar las notas
      if (reason) {
        const existingNotes = order.notes;
        const updatedNotes = existingNotes
          ? `${existingNotes}\n[${new Date().toLocaleString()}] Cambio a ${status}: ${reason}`
          : `[${new Date().toLocaleString()}] Cambio a ${status}: ${reason}`;
        
        await dbNew.update(orders)
          .set({ notes: updatedNotes })
          .where(eq(orders.id, orderId));
      }
      
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