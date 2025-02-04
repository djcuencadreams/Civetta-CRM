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
      const { name, source, status, email, phone, last_contact, next_follow_up } = req.body;
      
      if (!name?.trim()) {
        return res.status(400).json({ error: "Name is required" });
      }

      // Validate email or phone is present
      if (!email?.trim() && !phone?.trim()) {
        return res.status(400).json({ error: "Either email or phone is required" });
      }

      // Check for duplicate leads
      const existingLead = await db.query.leads.findFirst({
        where: (leads, { and, or, eq, isNull }) => and(
          or(
            email ? eq(leads.email, email) : isNull(leads.email),
            phone ? eq(leads.phone, phone) : isNull(leads.phone)
          ),
          eq(leads.convertedToCustomer, false)
        )
      });

      if (existingLead) {
        return res.status(409).json({ error: "Lead already exists with this email or phone" });
      }

      const lead = await db.insert(leads).values({
        ...req.body,
        customerLifecycleStage: status === 'won' ? 'customer' : 'lead',
        convertedToCustomer: status === 'won',
        lastContact: last_contact ? new Date(last_contact) : null,
        nextFollowUp: next_follow_up ? new Date(next_follow_up) : null
      }).returning();

      res.json(lead[0]);
    } catch (error) {
      console.error('Lead creation error:', error);
      res.status(500).json({ error: "Failed to create lead" });
    }
  });

  app.put("/api/leads/:id", async (req, res) => {
    try {
      const { name, email, phone, status, source, notes, address, last_contact, next_follow_up } = req.body;
      
      if (!name?.trim()) {
        return res.status(400).json({ error: "Name is required" });
      }

      const existingLead = await db.query.leads.findFirst({
        where: (leads, { eq }) => eq(leads.id, parseInt(req.params.id))
      });

      if (!existingLead) {
        return res.status(404).json({ error: "Lead not found" });
      }

      const lead = await db.update(leads)
        .set({
          name: name?.trim(),
          email: email?.trim() || null,
          phone: phone ? phone.replace(/\++/g, '+') : null,
          status,
          source: source?.trim() || null,
          notes: notes?.trim() || null,
          address: address?.trim() || null,
          customerLifecycleStage: status === 'won' ? 'customer' : 'lead',
          convertedToCustomer: status === 'won',
          lastContact: last_contact ? new Date(last_contact) : null,
          nextFollowUp: next_follow_up ? new Date(next_follow_up) : null,
          updatedAt: new Date()
        })
        .where(eq(leads.id, parseInt(req.params.id)))
        .returning();

      res.json(lead[0]);
    } catch (error) {
      console.error('Lead update error:', error);
      res.status(500).json({ error: "Failed to update lead" });
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