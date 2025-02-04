import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { customers, sales, webhooks, leads, leadActivities } from "@db/schema";
import { eq, desc } from "drizzle-orm";
import { Router } from "express";
import multer from "multer";
const router = Router();

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);
  app.use(router);

  // Customers API
  app.get("/api/customers", async (_req, res) => {
    const result = await db.query.customers.findMany({
      orderBy: desc(customers.createdAt),
      with: { sales: true }
    });
    res.json(result);
  });

  app.post("/api/customers", async (req, res) => {
    const customer = await db.insert(customers).values(req.body).returning();
    res.json(customer[0]);

    // Notify integrations
    const webhookList = await db.query.webhooks.findMany({
      where: eq(webhooks.event, "new_customer")
    });
  });

  app.delete("/api/customers/:id", async (req, res) => {
    try {
      await db.delete(customers).where(eq(customers.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete customer" });
    }

    webhookList.forEach(webhook => {
      fetch(webhook.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customer[0])
      }).catch(console.error);
    });
  });

  // Sales API
  app.get("/api/sales", async (_req, res) => {
    const result = await db.query.sales.findMany({
      orderBy: desc(sales.createdAt),
      with: { customer: true }
    });
    res.json(result);
  });

  app.post("/api/sales", async (req, res) => {
    const sale = await db.insert(sales).values(req.body).returning();
    const saleWithCustomer = await db.query.sales.findFirst({
      where: eq(sales.id, sale[0].id),
      with: { customer: true }
    });

    res.json(saleWithCustomer);

    // Notify integrations
    const webhookList = await db.query.webhooks.findMany({
      where: eq(webhooks.event, "new_sale")
    });

    webhookList.forEach(webhook => {
      fetch(webhook.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(saleWithCustomer)
      }).catch(console.error);
    });
  });

  // Webhooks API
  app.get("/api/webhooks", async (_req, res) => {
    const result = await db.query.webhooks.findMany();
    res.json(result);
  });

  app.post("/api/webhooks", async (req, res) => {
    const webhook = await db.insert(webhooks).values(req.body).returning();
    res.json(webhook[0]);
  });

  app.delete("/api/webhooks/:id", async (req, res) => {
    await db.delete(webhooks).where(eq(webhooks.id, parseInt(req.params.id)));
    res.status(204).end();
  });

  // Leads API
  app.get("/api/leads", async (_req, res) => {
    const result = await db.query.leads.findMany({
      orderBy: desc(leads.createdAt),
      with: { activities: true }
    });
    res.json(result);
  });

  app.post("/api/leads", async (req, res) => {
    try {
      // Validate required fields
      const { name, source, status } = req.body;
      if (!name || !source || !status) {
        return res.status(400).json({ 
          error: "Missing required fields: name, source, and status are required" 
        });
      }

      // Check for duplicate leads
      const existingLead = await db.query.leads.findFirst({
        where: (leads) => {
          return req.body.email 
            ? eq(leads.email, req.body.email)
            : req.body.phone 
              ? eq(leads.phone, req.body.phone)
              : undefined;
        }
      });

      if (existingLead) {
        return res.status(409).json({ 
          error: "Lead already exists with this email or phone" 
        });
      }

      const lead = await db.insert(leads).values(req.body).returning();
      res.json(lead[0]);
    } catch (error) {
      console.error('Lead creation error:', error);
      res.status(500).json({ error: "Failed to create lead" });
    }
  });

  app.post("/api/leads/:id/activities", async (req, res) => {
    const activity = await db.insert(leadActivities).values({
      leadId: parseInt(req.params.id),
      ...req.body
    }).returning();
    res.json(activity[0]);
  });

  app.delete("/api/leads/:id", async (req, res) => {
    try {
      await db.delete(leads).where(eq(leads.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete lead" });
    }
  });

  return httpServer;
}