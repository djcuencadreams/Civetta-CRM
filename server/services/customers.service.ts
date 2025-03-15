import { Express, Request, Response } from "express";
import { db } from "@db";
import { customers, leads, sales } from "@db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { Service } from "./service-registry";
import { validateParams } from "../validation";
import { appEvents, EventTypes } from "../lib/event-emitter";
import { Customer } from "@db/schema";

/**
 * Interfaz para la dirección de facturación
 */
interface BillingAddress {
  street?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  taxId?: string;
  companyName?: string;
}

/**
 * Customer ID parameter schema
 */
const customerIdSchema = z.object({
  id: z.coerce.number()
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
      
      // Usamos una solución que no causa problemas de tipado
      let query: any;
      
      if (!search && !brand) {
        // Sin filtros, simplemente obtenemos todos los clientes
        query = db.select().from(customers);
      } else {
        // Con filtros, construimos una consulta SQL personalizada
        let sqlQuery = `
          SELECT * FROM customers 
          WHERE 1=1
        `;
        
        const params: any[] = [];
        
        if (search) {
          params.push(`%${search}%`);
          sqlQuery += ` AND (name ILIKE $${params.length} OR email ILIKE $${params.length} OR phone ILIKE $${params.length})`;
        }
        
        if (brand) {
          params.push(brand);
          sqlQuery += ` AND brand = $${params.length}`;
        }
        
        sqlQuery += " ORDER BY created_at DESC";
        
        // Usamos sql`` y db.execute que tiene menos restricciones de tipo
        const result = await db.execute(sql.raw(sqlQuery), params);
        res.json(result);
        return;
      }
      
      // Para el caso simple sin filtros
      const result = await query.orderBy(desc(customers.createdAt));
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
        deliveryInstructions, source, brand, notes, idNumber,
        billingAddress, // Agregamos billingAddress a los campos que extraemos
        phoneCountry, phoneNumber, secondaryPhone, // Campos adicionales
        firstName: firstNameInput, lastName: lastNameInput, // Nombres desde el frontend
        status, type, tags // Campos de clasificación
      } = req.body;

      if (!name?.trim()) {
        res.status(400).json({ error: "El nombre es requerido" });
        return;
      }

      // Split name into first and last name if not provided directly
      let firstName = firstNameInput || name;
      let lastName = lastNameInput || '';
      
      if (!firstNameInput && !lastNameInput) {
        const nameParts = name.trim().split(' ');
        if (nameParts.length > 1) {
          firstName = nameParts[0];
          lastName = nameParts.slice(1).join(' ');
        }
      }

      const [customer] = await db.insert(customers).values({
        name: name.trim(),
        firstName,
        lastName,
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        phoneCountry: phoneCountry || null,
        phoneNumber: phoneNumber || null,
        secondaryPhone: secondaryPhone || null,
        street: street?.trim() || null,
        city: city?.trim() || null,
        province: province?.trim() || null,
        deliveryInstructions: deliveryInstructions?.trim() || null,
        idNumber: idNumber?.trim() || null,
        billingAddress: billingAddress || {}, // Guardamos la dirección de facturación
        tags: tags || [], // Guardamos las etiquetas
        status: status || 'active',
        type: type || 'person',
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
        deliveryInstructions, source, brand, notes, idNumber,
        billingAddress, // Agregamos billingAddress a los campos que extraemos
        phoneCountry, phoneNumber, secondaryPhone, // Campos adicionales
        firstName: firstNameInput, lastName: lastNameInput, // Nombres desde el frontend
        status, type, tags // Campos de clasificación
      } = req.body;

      if (!name?.trim()) {
        res.status(400).json({ error: "El nombre es requerido" });
        return;
      }

      // Check if customer exists
      const existingCustomer = await db.query.customers.findFirst({
        where: eq(customers.id, customerId)
      }) as Customer;

      if (!existingCustomer) {
        res.status(404).json({ error: "Customer not found" });
        return;
      }
      
      // Asegurar que los campos complejos estén inicializados
      const existingBillingAddress = existingCustomer.billingAddress as Record<string, any> || {};
      const existingTags = existingCustomer.tags as any[] || [];
      const existingStatus = existingCustomer.status || 'active';
      const existingType = existingCustomer.type || 'person';

      // Split name into first and last name if not provided directly
      let firstName = firstNameInput || name;
      let lastName = lastNameInput || '';
      
      if (!firstNameInput && !lastNameInput) {
        const nameParts = name.trim().split(' ');
        if (nameParts.length > 1) {
          firstName = nameParts[0];
          lastName = nameParts.slice(1).join(' ');
        }
      }

      const [updatedCustomer] = await db.update(customers)
        .set({
          name: name.trim(),
          firstName,
          lastName,
          email: email?.trim() || null,
          phone: phone?.trim() || null,
          phoneCountry: phoneCountry || existingCustomer.phoneCountry,
          phoneNumber: phoneNumber || existingCustomer.phoneNumber,
          secondaryPhone: secondaryPhone || existingCustomer.secondaryPhone,
          street: street?.trim() || null,
          city: city?.trim() || null,
          province: province?.trim() || null,
          deliveryInstructions: deliveryInstructions?.trim() || null,
          idNumber: idNumber?.trim() || null,
          // Actualizar la dirección de facturación y preservar los campos no proporcionados
          billingAddress: billingAddress || existingBillingAddress,
          // Actualizar etiquetas si se proporcionan, de lo contrario mantener las existentes
          tags: tags || existingTags,
          status: status || existingStatus,
          type: type || existingType,
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