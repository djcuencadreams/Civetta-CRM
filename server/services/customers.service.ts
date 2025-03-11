import { Express, Request, Response } from "express";
import { db } from "@db";
import { customers, leads, sales } from "@db/schema";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { Service } from "./service-registry";
import { validateParams } from "../validation";
import { appEvents, EventTypes } from "../lib/event-emitter";

/**
 * Customer ID parameter schema
 */
const customerIdSchema = z.object({
  id: z.string().transform(val => parseInt(val, 10))
});

/**
 * Service responsible for managing customers
 */
export class CustomersService implements Service {
  name = "customers";

  registerRoutes(app: Express): void {
    // Get all customers
    app.get("/api/customers", this.getAllCustomers.bind(this));
    
    // Get customer by ID
    app.get("/api/customers/:id", validateParams(customerIdSchema), this.getCustomerById.bind(this));
    
    // Create new customer
    app.post("/api/customers", this.createCustomer.bind(this));
    
    // Update customer
    app.patch("/api/customers/:id", validateParams(customerIdSchema), this.updateCustomer.bind(this));
    
    // Delete customer
    app.delete("/api/customers/:id", validateParams(customerIdSchema), this.deleteCustomer.bind(this));
    
    // Convert customer to lead
    app.post("/api/customers/:id/convert-to-lead", validateParams(customerIdSchema), this.convertCustomerToLead.bind(this));
  }

  /**
   * Get all customers
   */
  async getAllCustomers(req: Request, res: Response): Promise<void> {
    try {
      const { search, brand } = req.query;
      
      let query = db.select().from(customers).orderBy(desc(customers.createdAt));
      
      // Apply filters if provided
      if (search) {
        const searchTerm = `%${search}%`;
        query = query.where(
          sql`${customers.name} ILIKE ${searchTerm} OR 
              ${customers.email} ILIKE ${searchTerm} OR 
              ${customers.phone} ILIKE ${searchTerm}`
        );
      }
      
      if (brand) {
        query = query.where(eq(customers.brand, brand as string));
      }
      
      const result = await query;
      res.json(result);
    } catch (error) {
      console.error('Error fetching customers:', error);
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  }

  /**
   * Get customer by ID
   */
  async getCustomerById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const customerId = parseInt(id);
      
      const result = await db.query.customers.findFirst({
        where: eq(customers.id, customerId),
        with: {
          sales: {
            orderBy: [desc(sales.createdAt)]
          }
        }
      });
      
      if (!result) {
        res.status(404).json({ error: "Customer not found" });
        return;
      }
      
      res.json(result);
    } catch (error) {
      console.error('Error fetching customer:', error);
      res.status(500).json({ error: "Failed to fetch customer" });
    }
  }

  /**
   * Create a new customer
   */
  async createCustomer(req: Request, res: Response): Promise<void> {
    try {
      const { 
        name, email, phone, street, city, province, 
        deliveryInstructions, source, brand, notes, idNumber
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

      const [customer] = await db.insert(customers).values({
        name: name.trim(),
        firstName,
        lastName,
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        street: street?.trim() || null,
        city: city?.trim() || null,
        province: province?.trim() || null,
        deliveryInstructions: deliveryInstructions?.trim() || null,
        idNumber: idNumber?.trim() || null,
        source: source || 'direct',
        brand: brand || 'sleepwear',
        notes: notes?.trim() || null,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      // Emit customer created event
      appEvents.emit(EventTypes.CUSTOMER_CREATED, customer);
      
      res.status(201).json(customer);
    } catch (error) {
      console.error('Error creating customer:', error);
      res.status(500).json({ error: "Failed to create customer" });
    }
  }

  /**
   * Update a customer
   */
  async updateCustomer(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const customerId = parseInt(id);
      
      const { 
        name, email, phone, street, city, province, 
        deliveryInstructions, source, brand, notes, idNumber 
      } = req.body;

      if (!name?.trim()) {
        res.status(400).json({ error: "El nombre es requerido" });
        return;
      }

      // Check if customer exists
      const existingCustomer = await db.query.customers.findFirst({
        where: eq(customers.id, customerId)
      });

      if (!existingCustomer) {
        res.status(404).json({ error: "Customer not found" });
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

      const [updatedCustomer] = await db.update(customers)
        .set({
          name: name.trim(),
          firstName,
          lastName,
          email: email?.trim() || null,
          phone: phone?.trim() || null,
          street: street?.trim() || null,
          city: city?.trim() || null,
          province: province?.trim() || null,
          deliveryInstructions: deliveryInstructions?.trim() || null,
          idNumber: idNumber?.trim() || null,
          source: source || existingCustomer.source,
          brand: brand || existingCustomer.brand,
          notes: notes?.trim() || null,
          updatedAt: new Date()
        })
        .where(eq(customers.id, customerId))
        .returning();

      // Emit customer updated event
      appEvents.emit(EventTypes.CUSTOMER_UPDATED, updatedCustomer);
      
      res.json(updatedCustomer);
    } catch (error) {
      console.error('Error updating customer:', error);
      res.status(500).json({ error: "Failed to update customer" });
    }
  }

  /**
   * Delete a customer
   */
  async deleteCustomer(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const customerId = parseInt(id);

      // Check if customer exists
      const existingCustomer = await db.query.customers.findFirst({
        where: eq(customers.id, customerId),
        with: {
          sales: true
        }
      });

      if (!existingCustomer) {
        res.status(404).json({ error: "Customer not found" });
        return;
      }

      // Check if customer has sales - if so, don't allow deletion
      if (existingCustomer.sales?.length > 0) {
        res.status(400).json({ 
          error: "Cannot delete customer with existing sales records. Please archive the customer instead." 
        });
        return;
      }

      // Delete the customer
      await db.delete(customers).where(eq(customers.id, customerId));

      // Emit customer deleted event
      appEvents.emit(EventTypes.CUSTOMER_DELETED, existingCustomer);
      
      res.status(200).json({ success: true, message: "Customer deleted successfully" });
    } catch (error) {
      console.error('Error deleting customer:', error);
      res.status(500).json({ error: "Failed to delete customer" });
    }
  }

  /**
   * Convert a customer to a lead
   */
  async convertCustomerToLead(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const customerId = parseInt(id);
      
      const { phoneCountry, street, city, province, deliveryInstructions } = req.body;

      // Check if customer exists and get their data
      const customer = await db.query.customers.findFirst({
        where: eq(customers.id, customerId)
      });

      if (!customer) {
        res.status(404).json({ error: "Customer not found" });
        return;
      }

      // Create a new lead from the customer data
      const [lead] = await db.insert(leads).values({
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        phoneCountry: phoneCountry || null,
        street: street || null,
        city: city || null,
        province: province || null,
        deliveryInstructions: deliveryInstructions || null,
        status: 'new', // Default status for converted leads
        source: customer.source || 'website',
        brand: customer.brand,
        notes: `Converted from customer ID ${customerId} on ${new Date().toISOString()}`,
        customerLifecycleStage: 'lead',
        convertedToCustomer: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      // Now delete the customer to prevent duplication
      await db.delete(customers).where(eq(customers.id, customerId));

      // Emit customer deleted event
      appEvents.emit(EventTypes.CUSTOMER_DELETED, customer);
      
      // Emit lead created event
      appEvents.emit(EventTypes.LEAD_CREATED, lead);

      // Return the new lead
      res.status(201).json(lead);
    } catch (error) {
      console.error('Error converting customer to lead:', error);
      res.status(500).json({ error: "Failed to convert customer to lead" });
    }
  }
}

// Create and export the service instance
export const customersService = new CustomersService();

// Import sql for complex filters
import { sql } from "drizzle-orm";