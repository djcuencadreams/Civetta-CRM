import { Express, Request, Response } from "express";
import { db } from "@db";
import { leads, customers, leadActivities } from "@db/schema";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { Service } from "./service-registry";
import { validateBody, validateParams } from "../validation";
import { appEvents, EventTypes } from "../lib/event-emitter";

/**
 * Lead conversion schema for validation
 */
const leadConversionSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  email: z.string().email("Email inválido").optional().nullable(),
  phone: z.string().optional().nullable(),
  status: z.string().optional(),
  source: z.string().optional(),
  notes: z.string().optional().nullable(),
  lastContact: z.string().optional().nullable(),
  nextFollowUp: z.string().optional().nullable(),
  brand: z.string().optional(),
  idNumber: z.string().min(1, "El número de identificación es requerido"),
  brandInterest: z.string().optional().nullable()
});

/**
 * Lead ID parameter schema
 */
const leadIdSchema = z.object({
  id: z.string().transform(val => parseInt(val, 10))
});

/**
 * Service responsible for managing leads
 */
export class LeadsService implements Service {
  name = "leads";

  registerRoutes(app: Express): void {
    // Get all leads
    app.get("/api/leads", this.getAllLeads.bind(this));
    
    // Get lead by ID
    app.get("/api/leads/:id", validateParams(leadIdSchema), this.getLeadById.bind(this));
    
    // Create new lead
    app.post("/api/leads", this.createLead.bind(this));
    
    // Update lead
    app.put("/api/leads/:id", validateParams(leadIdSchema), this.updateLead.bind(this));
    
    // Delete lead
    app.delete("/api/leads/:id", validateParams(leadIdSchema), this.deleteLead.bind(this));
    
    // Convert lead to customer
    app.put("/api/leads/:id/convert-with-id", 
      validateParams(leadIdSchema), 
      validateBody(leadConversionSchema), 
      this.convertLeadToCustomer.bind(this)
    );
  }

  /**
   * Get all leads
   */
  async getAllLeads(_req: Request, res: Response): Promise<void> {
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
  }

  /**
   * Get lead by ID
   */
  async getLeadById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const leadId = parseInt(id);
      
      const result = await db.query.leads.findFirst({
        where: eq(leads.id, leadId),
        with: {
          convertedCustomer: true,
          activities: {
            orderBy: [desc(leadActivities.createdAt)]
          }
        }
      });
      
      if (!result) {
        res.status(404).json({ error: "Lead not found" });
        return;
      }
      
      res.json(result);
    } catch (error) {
      console.error('Error fetching lead:', error);
      res.status(500).json({ error: "Failed to fetch lead" });
    }
  }

  /**
   * Create a new lead
   */
  async createLead(req: Request, res: Response): Promise<void> {
    try {
      const { 
        name, email, phone, status, source, notes,
        lastContact, nextFollowUp, phoneCountry, street, city,
        province, deliveryInstructions, brand, brandInterest, idNumber 
      } = req.body;

      if (!name?.trim()) {
        res.status(400).json({ error: "El nombre es requerido" });
        return;
      }

      // Split name into first and last name
      let firstName = name;
      let lastName = '';
      
      const nameParts = name.trim().split(' ');
      if (nameParts.length > 1) {
        firstName = nameParts[0];
        lastName = nameParts.slice(1).join(' ');
      }

      const [lead] = await db.insert(leads).values({
        name: name.trim(),
        firstName,
        lastName,
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        phoneCountry: phoneCountry?.trim() || null,
        street: street?.trim() || null,
        city: city?.trim() || null,
        province: province?.trim() || null,
        deliveryInstructions: deliveryInstructions?.trim() || null,
        status: status || 'new',
        source: source || 'website',
        brand: brand || 'sleepwear',
        notes: notes?.trim() || null,
        lastContact: lastContact ? new Date(lastContact) : null,
        nextFollowUp: nextFollowUp ? new Date(nextFollowUp) : null,
        brandInterest: brandInterest?.trim() || null,
        idNumber: idNumber?.trim() || null,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      // Emit lead created event
      appEvents.emit(EventTypes.LEAD_CREATED, lead);
      
      res.status(201).json(lead);
    } catch (error) {
      console.error('Error creating lead:', error);
      res.status(500).json({ error: "Failed to create lead" });
    }
  }

  /**
   * Update a lead
   */
  async updateLead(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const leadId = parseInt(id);
      
      const {
        name, email, phone, status, source, notes,
        lastContact, nextFollowUp, phoneCountry, street, city,
        province, deliveryInstructions, brand, brandInterest, idNumber
      } = req.body;

      if (!name?.trim()) {
        res.status(400).json({ error: "El nombre es requerido" });
        return;
      }

      // Split name into first and last name
      let firstName = name;
      let lastName = '';
      
      const nameParts = name.trim().split(' ');
      if (nameParts.length > 1) {
        firstName = nameParts[0];
        lastName = nameParts.slice(1).join(' ');
      }

      // Check if lead exists
      const existingLead = await db.query.leads.findFirst({
        where: eq(leads.id, leadId)
      });

      if (!existingLead) {
        res.status(404).json({ error: "Lead not found" });
        return;
      }

      // If status changed to 'converted', convert lead to customer automatically
      if (status === 'converted' && existingLead.status !== 'converted') {
        // Create new customer from lead data
        const [customer] = await db.insert(customers).values({
          name: name.trim(),
          firstName,
          lastName,
          email: email?.trim() || existingLead.email,
          phone: phone?.trim() || existingLead.phone,
          phoneCountry: phoneCountry?.trim() || existingLead.phoneCountry,
          street: street?.trim() || existingLead.street,
          city: city?.trim() || existingLead.city,
          province: province?.trim() || existingLead.province,
          deliveryInstructions: deliveryInstructions?.trim() || existingLead.deliveryInstructions,
          idNumber: idNumber?.trim() || existingLead.idNumber,
          source: source || existingLead.source || 'website',
          brand: brand || existingLead.brand || 'sleepwear',
          notes: notes?.trim() || existingLead.notes,
          createdAt: new Date(),
          updatedAt: new Date()
        }).returning();

        // Update lead to mark as converted
        await db.update(leads).set({
          convertedToCustomer: true,
          convertedCustomerId: customer.id,
          status: 'converted',
          updatedAt: new Date()
        }).where(eq(leads.id, leadId));

        console.log(`Created new customer (id: ${customer.id}) from lead ${leadId}`);

        // Emit lead converted event
        appEvents.emit(EventTypes.LEAD_CONVERTED, { 
          lead: existingLead, 
          customer 
        });

        res.json({
          id: leadId,
          name: name.trim(),
          firstName,
          lastName,
          email: email?.trim() || existingLead.email,
          phone: phone?.trim() || existingLead.phone,
          status: 'converted',
          convertedToCustomer: true,
          convertedCustomerId: customer.id,
          // Include other updated fields...
          updatedAt: new Date()
        });
        return;
      }

      // Regular update (not conversion)
      const [updatedLead] = await db.update(leads)
        .set({
          name: name.trim(),
          firstName,
          lastName,
          email: email?.trim() || null,
          phone: phone?.trim() || null,
          phoneCountry: phoneCountry?.trim() || null,
          street: street?.trim() || null,
          city: city?.trim() || null,
          province: province?.trim() || null,
          deliveryInstructions: deliveryInstructions?.trim() || null,
          status: status || existingLead.status,
          source: source || existingLead.source,
          brand: brand || existingLead.brand,
          notes: notes?.trim() || null,
          lastContact: lastContact ? new Date(lastContact) : existingLead.lastContact,
          nextFollowUp: nextFollowUp ? new Date(nextFollowUp) : existingLead.nextFollowUp,
          brandInterest: brandInterest?.trim() || existingLead.brandInterest,
          idNumber: idNumber?.trim() || existingLead.idNumber,
          updatedAt: new Date()
        })
        .where(eq(leads.id, leadId))
        .returning();

      // Emit lead updated event
      appEvents.emit(EventTypes.LEAD_UPDATED, updatedLead);
      
      res.json(updatedLead);
    } catch (error) {
      console.error('Error updating lead:', error);
      res.status(500).json({ error: "Failed to update lead" });
    }
  }

  /**
   * Delete a lead
   */
  async deleteLead(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const leadId = parseInt(id);

      // Check if lead exists
      const existingLead = await db.query.leads.findFirst({
        where: eq(leads.id, leadId)
      });

      if (!existingLead) {
        res.status(404).json({ error: "Lead not found" });
        return;
      }

      // Delete the lead's activities first (maintain referential integrity)
      await db.delete(leadActivities).where(eq(leadActivities.leadId, leadId));
      
      // Now delete the lead
      await db.delete(leads).where(eq(leads.id, leadId));

      // Emit lead deleted event
      appEvents.emit(EventTypes.LEAD_DELETED, existingLead);
      
      res.status(200).json({ success: true, message: "Lead deleted successfully" });
    } catch (error) {
      console.error('Error deleting lead:', error);
      res.status(500).json({ error: "Failed to delete lead" });
    }
  }

  /**
   * Convert a lead to a customer
   */
  async convertLeadToCustomer(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const leadId = parseInt(id);
      
      const {
        name, email, phone, status, source, notes, 
        lastContact, nextFollowUp, brand, idNumber, brandInterest
      } = req.body;

      // Use direct select to ensure we get all fields including the new ones
      const [existingLead] = await db.select().from(leads).where(eq(leads.id, leadId));

      if (!existingLead) {
        res.status(404).json({ error: "Lead no encontrado" });
        return;
      }

      // Format notes to include brand interest if it exists
      let customerNotes = existingLead.notes || notes || null;
      
      // If brandInterest is provided in the request, use it
      if (brandInterest) {
        customerNotes = `Interés específico: ${brandInterest}\n${customerNotes || ''}`.trim();
      } 
      // Otherwise, if lead has brandInterest field, use that
      else if (existingLead.brandInterest) {
        customerNotes = `Interés específico: ${existingLead.brandInterest}\n${customerNotes || ''}`.trim();
      }
      
      const [customer] = await db.insert(customers)
        .values({
          name: name.trim(),
          email: email?.trim() || null,
          phone: phone?.trim() || null,
          // Copy lead's address info to customer if available
          street: existingLead.street || null,
          city: existingLead.city || null,
          province: existingLead.province || null,
          deliveryInstructions: existingLead.deliveryInstructions || null,
          // Add ID number from the conversion process
          idNumber: idNumber?.trim() || null,
          source: source || 'website',
          brand: existingLead.brand || brand || 'sleepwear', // Include brand information
          notes: customerNotes // Use the prepared notes with brand interest
        })
        .returning();
      
      // Then update lead to mark as converted
      await db.update(leads)
        .set({
          convertedToCustomer: true,
          convertedCustomerId: customer.id,
          status: 'converted',
          updatedAt: new Date()
        })
        .where(eq(leads.id, leadId));

      console.log(`Converted lead ${existingLead.id} to customer ${customer.id} with ID number`);
      
      // Emit lead converted event
      appEvents.emit(EventTypes.LEAD_CONVERTED, { 
        lead: existingLead, 
        customer 
      });
      
      res.json({ 
        lead: existingLead.id, 
        customer: customer.id,
        success: true
      });
    } catch (error: any) {
      console.error('Error converting lead with ID number:', error);
      res.status(500).json({ error: "Error al convertir lead: " + error.message });
    }
  }
}

// Create and export the service instance
export const leadsService = new LeadsService();