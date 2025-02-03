import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { customers, sales, webhooks } from "@db/schema";
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

  return httpServer;
}