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
    try {
      const result = await db.query.customers.findMany({
        orderBy: desc(customers.createdAt),
        with: { sales: true }
      });
      res.json(result);
    } catch (error) {
      console.error('Error fetching customers:', error);
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  });

  app.post("/api/customers", async (req, res) => {
    try {
      if (!req.body.name?.trim()) {
        return res.status(400).json({ error: "Name is required" });
      }

      const customer = await db.insert(customers).values(req.body).returning();
      res.json(customer[0]);

      // Notify integrations
      const webhookList = await db.query.webhooks.findMany({
        where: eq(webhooks.event, "new_customer")
      });

      webhookList.forEach(webhook => {
        if (webhook.active) {
          fetch(webhook.url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(customer[0])
          }).catch(error => console.error('Webhook notification error:', error));
        }
      });
    } catch (error) {
      console.error('Customer creation error:', error);
      res.status(500).json({ error: "Failed to create customer" });
    }
  });

  app.put("/api/customers/:id", async (req, res) => {
    try {
      if (!req.body.name?.trim()) {
        return res.status(400).json({ error: "Name is required" });
      }

      const customer = await db.update(customers)
        .set({
          ...req.body,
          updatedAt: new Date()
        })
        .where(eq(customers.id, parseInt(req.params.id)))
        .returning();

      if (!customer.length) {
        return res.status(404).json({ error: "Customer not found" });
      }

      res.json(customer[0]);
    } catch (error) {
      console.error('Customer update error:', error);
      res.status(500).json({ error: "Failed to update customer" });
    }
  });

  app.delete("/api/customers/:id", async (req, res) => {
    try {
      const result = await db.delete(customers)
        .where(eq(customers.id, parseInt(req.params.id)))
        .returning();

      if (!result.length) {
        return res.status(404).json({ error: "Customer not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Customer deletion error:', error);
      res.status(500).json({ error: "Failed to delete customer" });
    }
  });

  // Sales API
  app.get("/api/sales", async (_req, res) => {
    try {
      const result = await db.query.sales.findMany({
        orderBy: desc(sales.createdAt),
        with: { customer: true }
      });
      res.json(result);
    } catch (error) {
      console.error('Error fetching sales:', error);
      res.status(500).json({ error: "Failed to fetch sales" });
    }
  });

  app.post("/api/sales", async (req, res) => {
    try {
      if (!req.body.customerId) {
        return res.status(400).json({ error: "Customer ID is required" });
      }

      if (!req.body.amount || isNaN(Number(req.body.amount))) {
        return res.status(400).json({ error: "Valid amount is required" });
      }

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
        if (webhook.active) {
          fetch(webhook.url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(saleWithCustomer)
          }).catch(error => console.error('Webhook notification error:', error));
        }
      });
    } catch (error) {
      console.error('Sale creation error:', error);
      res.status(500).json({ error: "Failed to create sale" });
    }
  });

  // Webhooks API
  app.get("/api/webhooks", async (_req, res) => {
    try {
      const result = await db.query.webhooks.findMany();
      res.json(result);
    } catch (error) {
      console.error('Error fetching webhooks:', error);
      res.status(500).json({ error: "Failed to fetch webhooks" });
    }
  });

  app.post("/api/webhooks", async (req, res) => {
    try {
      if (!req.body.name?.trim()) {
        return res.status(400).json({ error: "Webhook name is required" });
      }

      if (!req.body.url?.trim()) {
        return res.status(400).json({ error: "Webhook URL is required" });
      }

      if (!req.body.event?.trim()) {
        return res.status(400).json({ error: "Event type is required" });
      }

      const webhook = await db.insert(webhooks).values(req.body).returning();
      res.json(webhook[0]);
    } catch (error) {
      console.error('Webhook creation error:', error);
      res.status(500).json({ error: "Failed to create webhook" });
    }
  });

  app.delete("/api/webhooks/:id", async (req, res) => {
    try {
      const result = await db.delete(webhooks)
        .where(eq(webhooks.id, parseInt(req.params.id)))
        .returning();

      if (!result.length) {
        return res.status(404).json({ error: "Webhook not found" });
      }

      res.status(204).end();
    } catch (error) {
      console.error('Webhook deletion error:', error);
      res.status(500).json({ error: "Failed to delete webhook" });
    }
  });

  // Leads API
  app.get("/api/leads", async (_req, res) => {
    try {
      const result = await db.query.leads.findMany({
        orderBy: [desc(leads.createdAt)],
        with: {
          convertedCustomer: true
        }
      });
      res.json(result);
    } catch (error) {
      console.error('Error fetching leads:', error);
      res.status(500).json({ error: "Failed to fetch leads" });
    }
  });

  app.post("/api/leads", async (req, res) => {
    try {
      const { name, email, phone, status, source, notes,
        lastContact, nextFollowUp, phoneCountry, street, city,
        province, deliveryInstructions } = req.body;

      if (!name?.trim()) {
        return res.status(400).json({ error: "El nombre es requerido" });
      }

      const lead = await db.insert(leads).values({
        name: name.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        phoneCountry: phoneCountry || null,
        street: street?.trim() || null,
        city: city?.trim() || null,
        province: province || null,
        deliveryInstructions: deliveryInstructions?.trim() || null,
        status: status || 'new',
        source: source || 'website',
        notes: notes?.trim() || null,
        lastContact: lastContact ? new Date(lastContact) : null,
        nextFollowUp: nextFollowUp ? new Date(nextFollowUp) : null,
        customerLifecycleStage: status === 'won' ? 'customer' : 'lead',
        convertedToCustomer: status === 'won'
      }).returning();

      res.json(lead[0]);
    } catch (error: any) {
      console.error('Lead creation error:', error);
      res.status(500).json({ error: "Error al crear el lead: " + error.message });
    }
  });

  app.put("/api/leads/:id", async (req, res) => {
    try {
      const {
        name, email, phone, status, source, notes,
        lastContact, nextFollowUp
      } = req.body;

      if (!name?.trim()) {
        return res.status(400).json({ error: "Name is required" });
      }

      const existingLead = await db.query.leads.findFirst({
        where: eq(leads.id, parseInt(req.params.id))
      });

      if (!existingLead) {
        return res.status(404).json({ error: "Lead not found" });
      }

      // Create customer if status is won
      let convertedCustomerId = existingLead.convertedCustomerId;
      if (status === 'won' && !existingLead.convertedToCustomer) {
        const [customer] = await db.insert(customers)
          .values({
            name: name.trim(),
            email: email?.trim() || null,
            phone: phone?.trim() || null,
            source: source || 'website'
          })
          .returning();
        convertedCustomerId = customer.id;
      }

      // Update lead
      const lead = await db.update(leads)
        .set({
          name: name.trim(),
          email: email?.trim() || null,
          phone: phone?.trim() || null,
          status,
          source: source || 'website',
          notes: notes?.trim() || null,
          customerLifecycleStage: status === 'won' ? 'customer' : 'lead',
          convertedToCustomer: status === 'won',
          convertedCustomerId,
          lastContact: lastContact ? new Date(lastContact) : null,
          nextFollowUp: nextFollowUp ? new Date(nextFollowUp) : null,
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
    try {
      const activity = await db.insert(leadActivities).values({
        leadId: parseInt(req.params.id),
        ...req.body
      }).returning();
      res.json(activity[0]);
    } catch (error) {
      console.error('Lead activity creation error:', error);
      res.status(500).json({ error: "Failed to create lead activity" });
    }
  });

  app.delete("/api/leads/:id", async (req, res) => {
    try {
      const result = await db.delete(leads)
        .where(eq(leads.id, parseInt(req.params.id)))
        .returning();

      if (!result.length) {
        return res.status(404).json({ error: "Lead not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Lead deletion error:', error);
      res.status(500).json({ error: "Failed to delete lead" });
    }
  });

  // Backup API
  app.post("/api/backup", async (_req, res) => {
    try {
      const { backupService } = await import('./lib/backup');
      const result = await backupService.performBackup();
      res.json(result);
    } catch (error) {
      console.error('Error durante el respaldo:', error);
      res.status(500).json({
        error: "Error al realizar el respaldo",
        message: error instanceof Error ? error.message : "Error desconocido"
      });
    }
  });

  return httpServer;
}