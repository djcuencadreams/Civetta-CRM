/**
 * Rutas de la aplicación Express
 */
import { Express, Request, Response, NextFunction } from "express";
import { createServer, Server } from "http";
import { setupVite, serveStatic, log } from "./vite";
import { registerOrderRoutes } from "./routes-orders-new";
import { registerAdditionalRoutes } from "./routes-extension";
import fileUpload from "express-fileupload";
import session from "express-session";
import passport from "passport";
import connectPgSimple from "connect-pg-simple";
import { db } from "../db";
import { backupDatabase, scheduleBackups } from "../db/backup";
import { eq } from "drizzle-orm";
import path from "path";
import fs from "fs";
import * as schema from "../db/schema";

/**
 * Registra las rutas para la API y el frontend
 * @param app Express app
 * @returns HTTP server
 */
export function registerRoutes(app: Express): Server {
  log("Registering routes");
  
  // Middlewares para manejo de archivos y sesiones
  app.use(fileUpload());

  // Configuración básica de sesión
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "your_session_secret",
      resave: false,
      saveUninitialized: false,
      cookie: { 
        secure: process.env.NODE_ENV === "production",
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      },
    })
  );

  // Configuración de Passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Registro de rutas de la API
  app.get("/api/db-backup", async (_req: Request, res: Response) => {
    try {
      const backupPath = await backupDatabase();
      res.json({ 
        success: true, 
        message: "Backup created successfully", 
        path: backupPath 
      });
    } catch (error) {
      console.error("Backup error:", error);
      res.status(500).json({ error: "Failed to create backup" });
    }
  });

  app.get("/api/customers", async (_req: Request, res: Response) => {
    try {
      const customers = await db.select().from(schema.customers).execute();
      res.json(customers);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ error: "Error al obtener clientes" });
    }
  });

  app.get("/api/customers/:id", async (req: Request, res: Response) => {
    try {
      const customer = await db.query.customers.findFirst({
        where: eq(schema.customers.id, parseInt(req.params.id)),
        with: {
          sales: true,
        },
      });

      if (!customer) {
        return res.status(404).json({ error: "Cliente no encontrado" });
      }

      res.json(customer);
    } catch (error) {
      console.error("Error fetching customer:", error);
      res.status(500).json({ error: "Error al obtener cliente" });
    }
  });

  app.post("/api/customers", async (req: Request, res: Response) => {
    try {
      const [newCustomer] = await db
        .insert(schema.customers)
        .values({
          ...req.body,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      res.status(201).json(newCustomer);
    } catch (error) {
      console.error("Error creating customer:", error);
      res.status(500).json({ error: "Error al crear cliente" });
    }
  });

  app.patch("/api/customers/:id", async (req: Request, res: Response) => {
    try {
      const [updatedCustomer] = await db
        .update(schema.customers)
        .set({
          ...req.body,
          updatedAt: new Date(),
        })
        .where(eq(schema.customers.id, parseInt(req.params.id)))
        .returning();

      if (!updatedCustomer) {
        return res.status(404).json({ error: "Cliente no encontrado" });
      }

      res.json(updatedCustomer);
    } catch (error) {
      console.error("Error updating customer:", error);
      res.status(500).json({ error: "Error al actualizar cliente" });
    }
  });

  app.delete("/api/customers/:id", async (req: Request, res: Response) => {
    try {
      // Delete associated sales first
      await db
        .delete(schema.sales)
        .where(eq(schema.sales.customerId, parseInt(req.params.id)))
        .execute();

      // Then delete the customer
      const result = await db
        .delete(schema.customers)
        .where(eq(schema.customers.id, parseInt(req.params.id)))
        .returning({ id: schema.customers.id });

      if (result.length === 0) {
        return res.status(404).json({ error: "Cliente no encontrado" });
      }

      res.json({ success: true, id: result[0].id });
    } catch (error) {
      console.error("Error deleting customer:", error);
      res.status(500).json({ error: "Error al eliminar cliente" });
    }
  });

  app.get("/api/leads", async (_req: Request, res: Response) => {
    try {
      const leads = await db.select().from(schema.leads).execute();
      res.json(leads);
    } catch (error) {
      console.error("Error fetching leads:", error);
      res.status(500).json({ error: "Error al obtener leads" });
    }
  });

  app.get("/api/leads/:id", async (req: Request, res: Response) => {
    try {
      const lead = await db.query.leads.findFirst({
        where: eq(schema.leads.id, parseInt(req.params.id)),
        with: {
          activities: true,
        },
      });

      if (!lead) {
        return res.status(404).json({ error: "Lead no encontrado" });
      }

      res.json(lead);
    } catch (error) {
      console.error("Error fetching lead:", error);
      res.status(500).json({ error: "Error al obtener lead" });
    }
  });

  app.post("/api/leads", async (req: Request, res: Response) => {
    try {
      const [newLead] = await db
        .insert(schema.leads)
        .values({
          ...req.body,
          convertedToCustomer: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      res.status(201).json(newLead);
    } catch (error) {
      console.error("Error creating lead:", error);
      res.status(500).json({ error: "Error al crear lead" });
    }
  });

  app.patch("/api/leads/:id", async (req: Request, res: Response) => {
    try {
      const [updatedLead] = await db
        .update(schema.leads)
        .set({
          ...req.body,
          updatedAt: new Date(),
        })
        .where(eq(schema.leads.id, parseInt(req.params.id)))
        .returning();

      if (!updatedLead) {
        return res.status(404).json({ error: "Lead no encontrado" });
      }

      res.json(updatedLead);
    } catch (error) {
      console.error("Error updating lead:", error);
      res.status(500).json({ error: "Error al actualizar lead" });
    }
  });

  app.delete("/api/leads/:id", async (req: Request, res: Response) => {
    try {
      // Delete associated activities first
      await db
        .delete(schema.leadActivities)
        .where(eq(schema.leadActivities.leadId, parseInt(req.params.id)))
        .execute();

      // Then delete the lead
      const result = await db
        .delete(schema.leads)
        .where(eq(schema.leads.id, parseInt(req.params.id)))
        .returning({ id: schema.leads.id });

      if (result.length === 0) {
        return res.status(404).json({ error: "Lead no encontrado" });
      }

      res.json({ success: true, id: result[0].id });
    } catch (error) {
      console.error("Error deleting lead:", error);
      res.status(500).json({ error: "Error al eliminar lead" });
    }
  });

  app.post("/api/leads/:id/convert", async (req: Request, res: Response) => {
    try {
      const leadId = parseInt(req.params.id);
      const lead = await db.query.leads.findFirst({
        where: eq(schema.leads.id, leadId),
      });

      if (!lead) {
        return res.status(404).json({ error: "Lead no encontrado" });
      }

      if (lead.convertedToCustomer) {
        return res.status(400).json({
          error: "Este lead ya ha sido convertido a cliente",
          customerId: lead.convertedCustomerId,
        });
      }

      // Crear nuevo cliente a partir del lead
      const [newCustomer] = await db
        .insert(schema.customers)
        .values({
          name: lead.name,
          firstName: lead.firstName,
          lastName: lead.lastName,
          email: lead.email,
          phone: lead.phone,
          phoneCountry: lead.phoneCountry,
          phoneNumber: lead.phoneNumber,
          street: lead.street,
          city: lead.city,
          province: lead.province,
          postalCode: lead.postalCode,
          country: lead.country,
          deliveryInstructions: lead.deliveryInstructions,
          address: lead.address,
          source: lead.source,
          brand: lead.brand,
          notes: lead.notes ? `Convertido desde lead. ${lead.notes}` : "Convertido desde lead.",
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      // Actualizar lead para marcarlo como convertido
      await db
        .update(schema.leads)
        .set({
          convertedToCustomer: true,
          convertedCustomerId: newCustomer.id,
          updatedAt: new Date(),
        })
        .where(eq(schema.leads.id, leadId))
        .execute();

      res.json({
        success: true,
        customerId: newCustomer.id,
        message: "Lead convertido a cliente exitosamente",
      });
    } catch (error) {
      console.error("Error converting lead:", error);
      res.status(500).json({ error: "Error al convertir lead a cliente" });
    }
  });

  app.get("/api/sales", async (_req: Request, res: Response) => {
    try {
      const sales = await db.query.sales.findMany({
        with: {
          customer: true,
        },
      });
      res.json(sales);
    } catch (error) {
      console.error("Error fetching sales:", error);
      res.status(500).json({ error: "Error al obtener ventas" });
    }
  });

  app.get("/api/sales/:id", async (req: Request, res: Response) => {
    try {
      const sale = await db.query.sales.findFirst({
        where: eq(schema.sales.id, parseInt(req.params.id)),
        with: {
          customer: true,
        },
      });

      if (!sale) {
        return res.status(404).json({ error: "Venta no encontrada" });
      }

      res.json(sale);
    } catch (error) {
      console.error("Error fetching sale:", error);
      res.status(500).json({ error: "Error al obtener venta" });
    }
  });

  app.post("/api/sales", async (req: Request, res: Response) => {
    try {
      const { customerId } = req.body;

      // Verificar que el cliente existe
      const customer = await db.query.customers.findFirst({
        where: eq(schema.customers.id, customerId),
      });

      if (!customer) {
        return res.status(400).json({ error: "El cliente especificado no existe" });
      }

      const [newSale] = await db
        .insert(schema.sales)
        .values({
          ...req.body,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      // Obtener la venta con detalles del cliente
      const saleWithCustomer = await db.query.sales.findFirst({
        where: eq(schema.sales.id, newSale.id),
        with: {
          customer: true,
        },
      });

      res.status(201).json(saleWithCustomer);
    } catch (error) {
      console.error("Error creating sale:", error);
      res.status(500).json({ error: "Error al crear venta" });
    }
  });

  app.patch("/api/sales/:id", async (req: Request, res: Response) => {
    try {
      if (req.body.customerId) {
        // Verificar que el cliente existe
        const customer = await db.query.customers.findFirst({
          where: eq(schema.customers.id, req.body.customerId),
        });

        if (!customer) {
          return res.status(400).json({ error: "El cliente especificado no existe" });
        }
      }

      const [updatedSale] = await db
        .update(schema.sales)
        .set({
          ...req.body,
          updatedAt: new Date(),
        })
        .where(eq(schema.sales.id, parseInt(req.params.id)))
        .returning();

      if (!updatedSale) {
        return res.status(404).json({ error: "Venta no encontrada" });
      }

      // Obtener la venta actualizada con detalles del cliente
      const saleWithCustomer = await db.query.sales.findFirst({
        where: eq(schema.sales.id, updatedSale.id),
        with: {
          customer: true,
        },
      });

      res.json(saleWithCustomer);
    } catch (error) {
      console.error("Error updating sale:", error);
      res.status(500).json({ error: "Error al actualizar venta" });
    }
  });

  app.delete("/api/sales/:id", async (req: Request, res: Response) => {
    try {
      const result = await db
        .delete(schema.sales)
        .where(eq(schema.sales.id, parseInt(req.params.id)))
        .returning({ id: schema.sales.id });

      if (result.length === 0) {
        return res.status(404).json({ error: "Venta no encontrada" });
      }

      res.json({ success: true, id: result[0].id });
    } catch (error) {
      console.error("Error deleting sale:", error);
      res.status(500).json({ error: "Error al eliminar venta" });
    }
  });

  // Registrar rutas de pedidos
  registerOrderRoutes(app);
  
  // Registrar rutas adicionales (exportaciones, procesamiento de CSV, etc.)
  registerAdditionalRoutes(app);

  // Middleware para manejar errores
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err.stack);
    res.status(500).json({
      error: "Error interno del servidor",
      message: err.message,
    });
  });

  // Crear servidor HTTP para Express y socket.io
  const server = createServer(app);

  // Configurar Vite (sin serveStatic)
  setupVite(app, server);

  // No hay websockets en esta versión

  // Programar backups automáticos
  scheduleBackups()
    .then(() => console.log("Automated database backups scheduled successfully"))
    .catch((err) => console.error("Failed to schedule database backups:", err));

  return server;
}

/**
 * Parsea un archivo CSV
 * @param buffer Buffer del archivo CSV
 * @returns Arreglo de objetos con los datos del CSV
 */
async function parseCSV(buffer: Buffer): Promise<any[]> {
  const content = buffer.toString("utf8");
  const lines = content.split(/\r?\n/).filter(line => line.trim());
  const headers = lines[0].split(",").map(h => h.trim());
  
  const results = [];
  
  for (let i = 1; i < lines.length; i++) {
    // Manejar correctamente líneas con comas dentro de comillas
    const values = parseCSVLine(lines[i], ",");
    
    if (values.length > 0) {
      const obj: Record<string, any> = {};
      headers.forEach((header, index) => {
        obj[header] = values[index];
      });
      
      // Normalizar nombres de claves
      results.push(normalizeObjectKeys(obj));
    }
  }
  
  return results;
}

/**
 * Parsea una línea de CSV respetando comillas
 * @param line Línea de texto CSV
 * @param delimiter Delimitador (por defecto coma)
 * @returns Arreglo de valores
 */
function parseCSVLine(line: string, delimiter: string): string[] {
  const result = [];
  let current = "";
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  
  if (current) {
    result.push(current.trim());
  }
  
  return result;
}

/**
 * Normaliza las claves de un objeto
 * @param obj Objeto a normalizar
 * @returns Objeto normalizado
 */
function normalizeObjectKeys(obj: Record<string, any>): Record<string, any> {
  const normalized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    // Convertir a camelCase y eliminar espacios
    const normalizedKey = key
      .toLowerCase()
      .replace(/[\s-_]+(\w)/g, (_, p1) => p1.toUpperCase());
    
    // Limpiar el valor si es un string
    const normalizedValue = typeof value === 'string' 
      ? value.replace(/^["']|["']$/g, '') // Eliminar comillas
      : value;
    
    normalized[normalizedKey] = normalizedValue;
  }
  
  return normalized;
}

/**
 * Parsea un archivo Excel
 * @param buffer Buffer del archivo Excel
 * @returns Arreglo de objetos con los datos del Excel
 */
function parseExcel(buffer: Buffer): any[] {
  const xlsx = require('xlsx');
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawData = xlsx.utils.sheet_to_json(worksheet, { raw: true });
  
  // Normalizar claves
  return rawData.map(normalizeObjectKeys);
}

/**
 * Valida los datos importados según el tipo
 * @param data Datos a validar
 * @param type Tipo de datos (customers, leads, etc)
 * @returns Objeto con resultado de validación
 */
function validateImportData(data: any[], type: string): { valid: boolean, message?: string } {
  if (!data || !data.length) {
    return { valid: false, message: "No se encontraron datos para importar" };
  }
  
  if (type === 'customers') {
    const requiredFields = ['firstName', 'lastName'];
    for (const entry of data) {
      for (const field of requiredFields) {
        if (!entry[field]) {
          return { 
            valid: false, 
            message: `Campo requerido "${field}" faltante en uno de los registros` 
          };
        }
      }
    }
  } else if (type === 'leads') {
    const requiredFields = ['firstName', 'lastName'];
    for (const entry of data) {
      for (const field of requiredFields) {
        if (!entry[field]) {
          return { 
            valid: false, 
            message: `Campo requerido "${field}" faltante en uno de los registros` 
          };
        }
      }
    }
  }
  
  return { valid: true };
}