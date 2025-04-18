import type { Express, Request, Response } from "express";
import { createServer } from "http";
import { db } from "@db";
import { customers, sales, webhooks, leads, leadActivities } from "@db/schema";
import { eq, desc, like } from "drizzle-orm";
import { Router } from "express";
import multer from "multer";
import fileUpload from "express-fileupload";

const router = Router();

// Configure file upload middleware
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

export function registerRoutes(app: Express): void {
  // No need to create a new HTTP server here
  app.use(router);

  // Enable file uploads
  app.use(fileUpload({
    limits: { fileSize: 10 * 1024 * 1024 },
    useTempFiles: true,
    tempFileDir: '/tmp/'
  }));

  // Customers API - Simplified for diagnostics
  app.get("/api/customers", async (_req: Request, res: Response) => {
    try {
      // Seleccionar solo las columnas que sabemos que funcionan 
      // y evitar campos como tags que tienen problemas de tipo
      const result = await db.select({
        id: customers.id,
        firstName: customers.firstName,
        lastName: customers.lastName,
        email: customers.email,
        phone: customers.phone,
        status: customers.status,
        createdAt: customers.createdAt
      }).from(customers);
      
      console.log('Consulta simple exitosa, tipo de resultado:', typeof result);
      console.log('¿Es un Array?', Array.isArray(result));
      console.log('Número de resultados:', result.length || 0);
      
      return res.json(result || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  });

  // Sales API - Simplified
  app.get("/api/sales", async (_req: Request, res: Response) => {
    try {
      // Seleccionar solo columnas específicas para evitar problemas de tipo
      const result = await db.select({
        id: sales.id,
        customerId: sales.customerId,
        amount: sales.amount,
        status: sales.status,
        paymentMethod: sales.paymentMethod,
        createdAt: sales.createdAt,
      }).from(sales);
      
      console.log('Consulta ventas exitosa, número de resultados:', result.length || 0);
      
      res.json(result || []);
    } catch (error) {
      console.error('Error fetching sales:', error);
      res.status(500).json({ error: "Failed to fetch sales" });
    }
  });

  // Test route to check if routes are working
  app.get("/api/test", (_req: Request, res: Response) => {
    res.json({ success: true, message: "API is working" });
  });
}