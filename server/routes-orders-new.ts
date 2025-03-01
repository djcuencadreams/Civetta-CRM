/**
 * Rutas de API para pedidos (orders)
 */
import { Express, Request, Response } from "express";
import { db } from "../db";
import { customers } from "../db/schema";
import { eq } from "drizzle-orm";
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
      const orderId = parseInt(req.params.id);
      
      if (isNaN(orderId)) {
        return res.status(400).json({ error: "ID de pedido inválido" });
      }
      
      // Buscar pedido en datos de ejemplo basado en ID
      let order = mockOrders.find(o => o.id === orderId) || null;
      
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
      
      // Simular creación de pedido con datos mock
      const newOrder = {
        id: mockOrders.length + 1,
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
        updatedAt: new Date(),
        customer: {
          id: customer.id,
          name: customer.name,
          email: customer.email
        },
        items: items ? items.map((item, index) => ({
          id: mockOrders.length * 10 + index + 1,
          orderId: mockOrders.length + 1,
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount || 0,
          subtotal: item.subtotal,
          createdAt: new Date()
        })) : []
      };
      
      // Agregar el nuevo pedido al array de datos mock
      mockOrders.push(newOrder);
      
      res.status(201).json(newOrder);
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
      
      // Buscar el pedido existente
      const orderIndex = mockOrders.findIndex(o => o.id === orderId);
      
      if (orderIndex === -1) {
        return res.status(404).json({ error: "Pedido no encontrado" });
      }
      
      const { customerId, totalAmount, status, paymentStatus, paymentMethod, 
              source, brand, notes, items, orderNumber, leadId } = req.body;
      
      // Actualizar el pedido
      mockOrders[orderIndex] = {
        ...mockOrders[orderIndex],
        customerId,
        leadId: leadId || null,
        orderNumber: orderNumber || mockOrders[orderIndex].orderNumber,
        totalAmount,
        status,
        paymentStatus,
        paymentMethod: paymentMethod || null,
        source: source || mockOrders[orderIndex].source,
        brand: brand || mockOrders[orderIndex].brand,
        notes: notes || mockOrders[orderIndex].notes,
        updatedAt: new Date(),
        items: items ? items.map((item, index) => {
          if (item.id) {
            // Actualizar item existente
            const existingItemIndex = mockOrders[orderIndex].items.findIndex(i => i.id === item.id);
            
            if (existingItemIndex !== -1) {
              return {
                ...mockOrders[orderIndex].items[existingItemIndex],
                productId: item.productId,
                productName: item.productName,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discount: item.discount || 0,
                subtotal: item.subtotal
              };
            }
          }
          
          // Crear nuevo item
          return {
            id: Math.max(...mockOrders[orderIndex].items.map(i => i.id)) + index + 1,
            orderId,
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount || 0,
            subtotal: item.subtotal,
            createdAt: new Date()
          };
        }) : mockOrders[orderIndex].items
      };
      
      res.json(mockOrders[orderIndex]);
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
      
      // Buscar el pedido existente
      const orderIndex = mockOrders.findIndex(o => o.id === orderId);
      
      if (orderIndex === -1) {
        return res.status(404).json({ error: "Pedido no encontrado" });
      }
      
      // Eliminar el pedido
      const deletedOrderId = mockOrders[orderIndex].id;
      mockOrders.splice(orderIndex, 1);
      
      res.json({ 
        success: true, 
        message: "Pedido eliminado correctamente",
        id: deletedOrderId
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
      const validStatuses = ['new', 'preparing', 'shipped', 'completed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ 
          error: "Estado inválido", 
          message: "El estado debe ser uno de: nuevo, preparando, enviado, completado, cancelado"
        });
      }
      
      // Buscar el pedido existente
      const orderIndex = mockOrders.findIndex(o => o.id === orderId);
      
      if (orderIndex === -1) {
        return res.status(404).json({ error: "Pedido no encontrado" });
      }
      
      // Actualizar el estado del pedido
      mockOrders[orderIndex].status = status;
      mockOrders[orderIndex].updatedAt = new Date();
      
      // Si hay una razón proporcionada (especialmente para cancelaciones), guardarla en notas
      if (reason) {
        const existingNotes = mockOrders[orderIndex].notes;
        mockOrders[orderIndex].notes = existingNotes
          ? `${existingNotes}\n[${new Date().toLocaleString()}] Cambio a ${status}: ${reason}`
          : `[${new Date().toLocaleString()}] Cambio a ${status}: ${reason}`;
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