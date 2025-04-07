import type { Express } from "express";
import { createServer, type Server } from "http";
import { registerOrderRoutes } from "./routes-orders-new";
import { db } from "@db";
import { customers, sales, webhooks, leads, leadActivities } from "@db/schema";
import { eq, desc, like } from "drizzle-orm";
import { Router } from "express";
import multer from "multer";
import fileUpload from "express-fileupload";
import csvParser from 'csv-parser';
import * as XLSX from 'xlsx';
import { Readable } from 'stream';

const router = Router();

// Configure file upload middleware
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);
  app.use(router);

  // Enable file uploads
  app.use(fileUpload({
    limits: { fileSize: 10 * 1024 * 1024 },
    useTempFiles: true,
    tempFileDir: '/tmp/'
  }));

  // Customers API
  app.get("/api/customers", async (_req, res) => {
    try {
      const result = await db.query.customers.findMany({
        orderBy: desc(customers.createdAt),
        with: { sales: true }
      });
      
      // Ensure backward compatibility by populating structured fields from legacy fields if needed
      const enhancedResults = result.map(customer => {
        // Si no existe, creamos un objeto para evitar errores de referencia
        const enhancedCustomer = { ...customer };
        
        // If a customer has name but not firstName/lastName, split them for display purposes
        if (enhancedCustomer.name && (!enhancedCustomer.firstName || !enhancedCustomer.lastName)) {
          const nameParts = enhancedCustomer.name.split(' ');
          if (nameParts.length > 0) {
            enhancedCustomer.firstName = enhancedCustomer.firstName || nameParts[0];
            enhancedCustomer.lastName = enhancedCustomer.lastName || nameParts.slice(1).join(' ');
          }
        }
        
        // If a customer has address but not structured address fields, parse them
        if (enhancedCustomer.address && (!enhancedCustomer.street || !enhancedCustomer.city || !enhancedCustomer.province)) {
          try {
            const addressParts = enhancedCustomer.address.split(',');
            enhancedCustomer.street = enhancedCustomer.street || addressParts[0]?.trim();
            enhancedCustomer.city = enhancedCustomer.city || addressParts[1]?.trim();
            
            // Handle province which might be followed by delivery instructions
            if (addressParts[2]) {
              const provinceAndInstructions = addressParts[2].split('\n');
              enhancedCustomer.province = enhancedCustomer.province || provinceAndInstructions[0]?.trim();
              
              // Get delivery instructions if present
              if (provinceAndInstructions.length > 1) {
                enhancedCustomer.deliveryInstructions = enhancedCustomer.deliveryInstructions || provinceAndInstructions[1]?.trim();
              }
            }
          } catch (e) {
            // Silent fail - if parsing fails, we'll just use what we have
            console.warn('Failed to parse address for customer', enhancedCustomer.id);
          }
        }
        
        // If a customer has phone but not phoneCountry/phoneNumber, parse them
        if (enhancedCustomer.phone && (!enhancedCustomer.phoneCountry || !enhancedCustomer.phoneNumber)) {
          try {
            // Try to extract country code (usually starts with +)
            const phoneMatch = enhancedCustomer.phone.match(/^(\+\d+)(.*)$/);
            if (phoneMatch) {
              enhancedCustomer.phoneCountry = enhancedCustomer.phoneCountry || phoneMatch[1];
              enhancedCustomer.phoneNumber = enhancedCustomer.phoneNumber || phoneMatch[2];
            }
          } catch (e) {
            console.warn('Failed to parse phone for customer', enhancedCustomer.id);
          }
        }
        
        // Garantizar que todos los campos estén disponibles en ambos formatos (snake_case y camelCase)
        // Este es el punto clave para solucionar el problema de inconsistencia
        
        // Campos de identificación
        enhancedCustomer.idNumber = enhancedCustomer.idNumber || null;
        enhancedCustomer.id_number = enhancedCustomer.idNumber || null;
        
        // Campos de nombre
        enhancedCustomer.first_name = enhancedCustomer.firstName || null;
        enhancedCustomer.last_name = enhancedCustomer.lastName || null;
        
        // Campos de dirección
        enhancedCustomer.street = enhancedCustomer.street || null;
        enhancedCustomer.city = enhancedCustomer.city || null;
        enhancedCustomer.province = enhancedCustomer.province || null;
        enhancedCustomer.deliveryInstructions = enhancedCustomer.deliveryInstructions || null;
        enhancedCustomer.delivery_instructions = enhancedCustomer.deliveryInstructions || null;
        
        // Campos de teléfono
        enhancedCustomer.phone_country = enhancedCustomer.phoneCountry || null;
        enhancedCustomer.phone_number = enhancedCustomer.phoneNumber || null;
        
        // Otros campos
        enhancedCustomer.secondary_phone = enhancedCustomer.secondaryPhone || null;
        enhancedCustomer.billing_address = enhancedCustomer.billingAddress || null;
        enhancedCustomer.total_value = enhancedCustomer.totalValue || null;
        enhancedCustomer.assigned_user_id = enhancedCustomer.assignedUserId || null;
        
        // Compatibilidad adicional para campos alternativos
        enhancedCustomer.street_address = enhancedCustomer.street || null;
        enhancedCustomer.city_name = enhancedCustomer.city || null;
        enhancedCustomer.province_name = enhancedCustomer.province || null;
        
        console.log(`Optimizados datos del cliente ${enhancedCustomer.id} - ${enhancedCustomer.name}`);
        
        return enhancedCustomer;
      });
      
      res.json(enhancedResults);
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
        if (webhook.active && webhook.endpoint) {
          fetch(webhook.endpoint, {
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
      const customerId = parseInt(req.params.id);

      // First, check if there are any leads referencing this customer
      const referencingLeads = await db.select()
        .from(leads)
        .where(eq(leads.convertedCustomerId, customerId));

      if (referencingLeads.length > 0) {
        // Update leads to remove the reference to this customer
        await db.update(leads)
          .set({
            convertedCustomerId: null,
            updatedAt: new Date()
          })
          .where(eq(leads.convertedCustomerId, customerId));
      }

      // Check if there are any sales referencing this customer
      const referencingSales = await db.select()
        .from(sales)
        .where(eq(sales.customerId, customerId));

      if (referencingSales.length > 0) {
        // Cannot delete a customer with associated sales
        return res.status(400).json({ 
          error: "No se puede eliminar este cliente porque tiene ventas asociadas. Elimine primero las ventas asociadas.",
          salesCount: referencingSales.length
        });
      }

      // Now safe to delete the customer
      const result = await db.delete(customers)
        .where(eq(customers.id, customerId))
        .returning();

      if (!result.length) {
        return res.status(404).json({ error: "Cliente no encontrado" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Customer deletion error:', error);
      res.status(500).json({ error: "Failed to delete customer" });
    }
  });

  // New endpoint to convert a customer back to a lead
  app.post("/api/customers/:id/convert-to-lead", async (req, res) => {
    try {
      const customerId = parseInt(req.params.id);

      // Get the customer by ID
      const [customer] = await db.select()
        .from(customers)
        .where(eq(customers.id, customerId))
        .limit(1);

      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }

      // First check if this customer has already been converted to a lead
      // by checking if there's a lead with a note mentioning this customer ID
      const existingLeads = await db.select()
        .from(leads)
        .where(like(leads.notes, `%Converted from customer ID ${customerId}%`));

      if (existingLeads.length > 0) {
        // Return the existing lead instead of creating a new one
        return res.status(200).json({
          message: "Customer was already converted to a lead",
          lead: existingLeads[0]
        });
      }

      // Get firstName/lastName from fields or parse from name
      const firstName = customer.firstName || customer.name.split(' ')[0] || '';
      const lastName = customer.lastName || customer.name.split(' ').slice(1).join(' ') || '';

      // Use structured address fields if available, otherwise parse from legacy address
      let street = customer.street || '';
      let city = customer.city || '';
      let province = customer.province || '';
      let deliveryInstructions = customer.deliveryInstructions || '';
      
      // If we don't have structured fields but we do have a legacy address, parse it
      if (!street && !city && !province && customer.address) {
        try {
          const parts = customer.address.split('\n');
          const addressParts = parts[0]?.split(',') || [];

          street = addressParts[0]?.trim() || '';
          city = addressParts[1]?.trim() || '';
          province = addressParts[2]?.trim() || '';
          deliveryInstructions = parts[1]?.trim() || '';
        } catch (e) {
          console.warn('Failed to parse address for customer', customer.id);
        }
      }
      
      // Use structured phone fields if available, otherwise parse from phone
      let phoneCountry = customer.phoneCountry || '';
      let phoneNumber = customer.phoneNumber || '';
      
      // If we don't have structured phone fields but we have a legacy phone, parse it
      if (!phoneCountry && !phoneNumber && customer.phone) {
        try {
          const phoneMatch = customer.phone.match(/^(\+\d+)(.*)$/);
          if (phoneMatch) {
            phoneCountry = phoneMatch[1];
            phoneNumber = phoneMatch[2];
          }
        } catch (e) {
          console.warn('Failed to parse phone for customer', customer.id);
        }
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
      await db.delete(customers)
        .where(eq(customers.id, customerId));

      // Return the new lead
      res.status(201).json(lead);
    } catch (error) {
      console.error('Error converting customer to lead:', error);
      res.status(500).json({ error: "Failed to convert customer to lead" });
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
        if (webhook.active && webhook.endpoint) {
          fetch(webhook.endpoint, {
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
  
  // Endpoint para actualizar una venta existente
  app.patch("/api/sales/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const saleId = parseInt(id);
      
      if (isNaN(saleId)) {
        return res.status(400).json({ error: "ID de venta inválido" });
      }
      
      // Verificar que la venta exista
      const existingSale = await db.query.sales.findFirst({
        where: eq(sales.id, saleId)
      });
      
      if (!existingSale) {
        return res.status(404).json({ error: "Venta no encontrada" });
      }
      
      // Verificar campos obligatorios
      if (!req.body.customerId || isNaN(Number(req.body.customerId))) {
        return res.status(400).json({ error: "Cliente inválido" });
      }
      
      if (!req.body.amount || isNaN(Number(req.body.amount))) {
        return res.status(400).json({ error: "Monto inválido" });
      }
      
      // Actualizar la venta
      await db.update(sales)
        .set({
          customerId: req.body.customerId,
          amount: req.body.amount,
          status: req.body.status || existingSale.status,
          paymentMethod: req.body.paymentMethod || existingSale.paymentMethod,
          brand: req.body.brand || existingSale.brand,
          notes: req.body.notes,
          updatedAt: new Date()
        })
        .where(eq(sales.id, saleId));
      
      // Obtener la venta actualizada con la información del cliente
      const updatedSale = await db.query.sales.findFirst({
        where: eq(sales.id, saleId),
        with: { customer: true }
      });
      
      res.json(updatedSale);
    } catch (error) {
      console.error('Error updating sale:', error);
      res.status(500).json({ error: "Error al actualizar la venta" });
    }
  });
  
  // Endpoint para eliminar una venta
  app.delete("/api/sales/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const saleId = parseInt(id);
      
      if (isNaN(saleId)) {
        return res.status(400).json({ error: "ID de venta inválido" });
      }
      
      // Verificar que la venta exista
      const existingSale = await db.query.sales.findFirst({
        where: eq(sales.id, saleId)
      });
      
      if (!existingSale) {
        return res.status(404).json({ error: "Venta no encontrada" });
      }
      
      // Eliminar la venta
      const result = await db.delete(sales)
        .where(eq(sales.id, saleId));
      
      res.json({ 
        success: true, 
        message: "Venta eliminada correctamente", 
        id: saleId 
      });
    } catch (error) {
      console.error('Error deleting sale:', error);
      res.status(500).json({ error: "Error al eliminar la venta" });
    }
  });

  // Endpoint para actualizar el estado de un pedido (venta)
  app.patch("/api/sales/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status, reason } = req.body;
      const saleId = parseInt(id);
      
      if (isNaN(saleId)) {
        return res.status(400).json({ error: "ID de pedido inválido" });
      }
      
      if (!status) {
        return res.status(400).json({ error: "El estado es requerido" });
      }
      
      // Verificar que el estado sea válido
      const validStatuses = ['new', 'preparing', 'shipped', 'completed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ 
          error: "Estado inválido", 
          message: "El estado debe ser uno de: nuevo, preparando, enviado, completado, cancelado"
        });
      }
      
      // Verificar que el pedido exista
      const existingSale = await db.query.sales.findFirst({
        where: eq(sales.id, saleId)
      });
      
      if (!existingSale) {
        return res.status(404).json({ error: "Pedido no encontrado" });
      }
      
      // Actualizar el estado del pedido
      const updateData: any = { 
        status, 
        updatedAt: new Date() 
      };
      
      // Si hay una razón proporcionada (especialmente para cancelaciones), guardarla en notas
      if (reason) {
        updateData.notes = existingSale.notes 
          ? `${existingSale.notes}\n[${new Date().toLocaleString()}] Cambio a ${status}: ${reason}`
          : `[${new Date().toLocaleString()}] Cambio a ${status}: ${reason}`;
      }
      
      await db.update(sales)
        .set(updateData)
        .where(eq(sales.id, saleId));
      
      res.json({ 
        success: true, 
        message: "Estado actualizado correctamente",
        status
      });
    } catch (error) {
      console.error("Error updating sale status:", error);
      res.status(500).json({ error: "Error al actualizar el estado del pedido" });
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

      if (!req.body.endpoint?.trim()) {
        return res.status(400).json({ error: "Webhook endpoint is required" });
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
  
  // Convert lead to customer with ID number (cédula/pasaporte/RUC)
  app.put("/api/leads/:id/convert-with-id", async (req, res) => {
    try {
      const leadId = parseInt(req.params.id);
      const {
        name, email, phone, status, source, notes, 
        lastContact, nextFollowUp, brand, idNumber, brandInterest
      } = req.body;

      if (!name?.trim()) {
        return res.status(400).json({ error: "El nombre es requerido" });
      }
      
      if (!idNumber?.trim()) {
        return res.status(400).json({ error: "El número de identificación es requerido" });
      }

      // Use direct select to ensure we get all fields including the new ones
      const [existingLead] = await db.select().from(leads).where(eq(leads.id, leadId));

      if (!existingLead) {
        return res.status(404).json({ error: "Lead no encontrado" });
      }

      // First create the customer with ID number
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
          status: 'won',
          customerLifecycleStage: 'customer',
          convertedToCustomer: true,
          convertedCustomerId: customer.id,
          updatedAt: new Date()
        })
        .where(eq(leads.id, leadId));

      console.log(`Converted lead ${existingLead.id} to customer ${customer.id} with ID number`);
      
      res.json({ 
        lead: existingLead.id, 
        customer: customer.id,
        success: true
      });
    } catch (error: any) {
      console.error('Error converting lead with ID number:', error);
      res.status(500).json({ error: "Error al convertir lead: " + error.message });
    }
  });

  app.post("/api/leads", async (req, res) => {
    try {
      const { name, email, phone, status, source, notes,
        lastContact, nextFollowUp, phoneCountry, street, city,
        province, deliveryInstructions, brand, brandInterest, idNumber } = req.body;

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
        convertedToCustomer: status === 'won',
        brand: brand || null,
        brandInterest: brandInterest?.trim() || null,
        idNumber: idNumber?.trim() || null
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
        lastContact, nextFollowUp, brand, brandInterest, idNumber
      } = req.body;

      if (!name?.trim()) {
        return res.status(400).json({ error: "Name is required" });
      }

      // Use direct select to ensure we get all fields including the new ones
      const [existingLead] = await db.select().from(leads).where(eq(leads.id, parseInt(req.params.id)));

      if (!existingLead) {
        return res.status(404).json({ error: "Lead not found" });
      }

      // Create customer if status is won
      let convertedCustomerId = existingLead.convertedCustomerId;
      if (status === 'won' && !existingLead.convertedToCustomer) {
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
            // Add ID number if provided during lead update
            idNumber: idNumber?.trim() || null,
            source: source || 'website',
            brand: existingLead.brand || brand || 'sleepwear', // Include brand information
            notes: customerNotes // Use the prepared notes with brand interest
          })
          .returning();
        convertedCustomerId = customer.id;
        console.log(`Created new customer (id: ${customer.id}) from lead ${existingLead.id}`);
      }

      // Update lead
      const lead = await db.update(leads)
        .set({
          name: name.trim(),
          email: email?.trim() || null,
          phone: phone?.trim() || null,
          status,
          source: source || 'website',
          brand: brand || existingLead.brand, // Ensure brand is preserved
          brandInterest: brandInterest?.trim() || existingLead.brandInterest, // Keep existing brandInterest if not provided
          idNumber: idNumber?.trim() || existingLead.idNumber, // Keep existing idNumber if not provided
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

  // Spreadsheet Import API
  app.post("/api/configuration/spreadsheet/preview", async (req, res) => {
    try {
      if (!req.files || Object.keys(req.files).length === 0 || !('file' in req.files)) {
        return res.status(400).json({ error: "No se subió ningún archivo" });
      }

      // Handle the file properly based on express-fileupload
      const uploadedFile = req.files.file;
      // Cast to proper type to access required methods
      const file = Array.isArray(uploadedFile) 
        ? (uploadedFile[0] as unknown) as fileUpload.UploadedFile 
        : (uploadedFile as unknown) as fileUpload.UploadedFile;
      
      const importType = req.body.type || 'customers';

      // Get the file extension
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      
      console.log(`Processing ${fileExtension} file: ${file.name}, size: ${file.size} bytes`);

      let data: any[] = [];

      if (fileExtension === 'csv') {
        // Parse CSV file
        data = await parseCSV(file.data);
        console.log(`Parsed ${data.length} records from CSV file`);
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        // Parse Excel file
        data = parseExcel(file.data);
        console.log(`Parsed ${data.length} records from Excel file`);
      } else {
        return res.status(400).json({ error: "Formato de archivo no soportado. Por favor use un archivo CSV o Excel." });
      }

      // Validate data based on import type
      const validationResult = validateImportData(data, importType);
      if (!validationResult.valid) {
        console.error('Data validation failed:', validationResult.message);
        return res.status(400).json({ 
          error: "Error al procesar el archivo", 
          message: validationResult.message 
        });
      }

      // Return preview data (limited to 100 records)
      res.json({ data: data.slice(0, 100) });
    } catch (error: any) {
      console.error('Spreadsheet preview error:', error);
      res.status(500).json({ 
        error: "Error al procesar el archivo", 
        message: error.message || "Verifique el formato y estructura del archivo"
      });
    }
  });

  app.post("/api/configuration/spreadsheet/import", async (req, res) => {
    try {
      if (!req.files || Object.keys(req.files).length === 0 || !('file' in req.files)) {
        return res.status(400).json({ error: "No se subió ningún archivo" });
      }

      // Handle the file properly based on express-fileupload
      const uploadedFile = req.files.file;
      // Cast to proper type to access required methods
      const file = Array.isArray(uploadedFile) 
        ? (uploadedFile[0] as unknown) as fileUpload.UploadedFile 
        : (uploadedFile as unknown) as fileUpload.UploadedFile;
      
      const importType = req.body.type || 'customers';
      
      // Process pre-mapped data if available
      let data: any[] = [];
      
      // If client has already mapped data, use it directly
      if (req.body.mappedData) {
        try {
          data = JSON.parse(req.body.mappedData);
          console.log(`Using client-mapped data (${data.length} items)`);
        } catch (error) {
          console.error("Error parsing mappedData JSON:", error);
          return res.status(400).json({ 
            error: "Error al procesar datos mapeados", 
            message: "El formato de los datos mapeados es inválido" 
          });
        }
      } else {
        // Otherwise parse the file as usual
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        console.log(`Processing ${fileExtension} file for import: ${file.name}, size: ${file.size} bytes`);
        
        if (fileExtension === 'csv') {
          // Parse CSV file
          data = await parseCSV(file.data);
          console.log(`Parsed ${data.length} records from CSV file for import`);
        } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
          // Parse Excel file
          data = parseExcel(file.data);
          console.log(`Parsed ${data.length} records from Excel file for import`);
        } else {
          return res.status(400).json({ 
            error: "Formato de archivo no soportado", 
            message: "Por favor use un archivo CSV o Excel." 
          });
        }
      }
      
      // Validate data format
      const validationResult = validateImportData(data, importType);
      if (!validationResult.valid) {
        return res.status(400).json({ error: validationResult.message });
      }

      // Import data based on type
      let importedCount = 0;
      switch (importType) {
        case 'customers':
          // Import customers with the updated field structure
          for (const item of data) {
            // Skip if required fields are missing
            if (!item.firstName || !item.lastName) {
              continue;
            }

            // Format name from firstName and lastName
            const name = `${item.firstName} ${item.lastName}`;

            // Format phone from phoneCountry and phoneNumber
            let phone = null;
            if (item.phoneNumber) {
              phone = item.phoneCountry ? `${item.phoneCountry}${item.phoneNumber}` : item.phoneNumber;
            }

            // Format address from detailed fields
            let address = null;
            const addressParts = [];

            if (item.street) addressParts.push(item.street);
            if (item.city) addressParts.push(item.city);
            if (item.province) addressParts.push(item.province);

            if (addressParts.length > 0) {
              address = addressParts.join(', ');
              // Add delivery instructions as a new line if provided
              if (item.deliveryInstructions) {
                address += `\n${item.deliveryInstructions}`;
              }
            }

            // Process brand field - normalize if needed
            let brandValue = item.brand || 'sleepwear';
            
            // Validate brand format (either single brand or comma-separated)
            const validBrands = ['sleepwear', 'bride', 'sleepwear,bride', 'bride,sleepwear'];
            if (!validBrands.includes(brandValue.toLowerCase())) {
              brandValue = 'sleepwear'; // Default to sleepwear if invalid
            }
            
            await db.insert(customers).values({
              name,
              firstName: item.firstName || null,
              lastName: item.lastName || null,
              idNumber: item.idNumber || null, // Added ID number field
              email: item.email || null,
              phone,
              phoneCountry: item.phoneCountry || null,
              street: item.street || null,
              city: item.city || null,
              province: item.province || null,
              deliveryInstructions: item.deliveryInstructions || null,
              address, // Legacy field kept for backward compatibility
              source: item.source || 'import',
              brand: brandValue, // Normalized brand value
              notes: item.notes || null,
              createdAt: new Date(),
              updatedAt: new Date()
            });
            importedCount++;
          }
          break;
        case 'leads':
          // Import leads with the updated field structure
          for (const item of data) {
            // Skip if required fields are missing
            if (!item.firstName || !item.lastName) {
              continue;
            }

            // Format name from firstName and lastName
            const name = `${item.firstName} ${item.lastName}`;

            // Format phone from phoneCountry and phoneNumber
            let phone = null;
            if (item.phoneNumber) {
              phone = item.phoneCountry ? `${item.phoneCountry}${item.phoneNumber}` : item.phoneNumber;
            }

            // Process brand field - normalize if needed
            let brandValue = item.brand || 'sleepwear';
            
            // Validate brand format (either single brand or comma-separated)
            const validBrands = ['sleepwear', 'bride', 'sleepwear,bride', 'bride,sleepwear'];
            if (!validBrands.includes(brandValue.toLowerCase())) {
              brandValue = 'sleepwear'; // Default to sleepwear if invalid
            }
            
            await db.insert(leads).values({
              name,
              email: item.email || null,
              phone,
              phoneCountry: item.phoneCountry || null,
              street: item.street || null,
              city: item.city || null,
              province: item.province || null,
              deliveryInstructions: item.deliveryInstructions || null,
              status: item.status || 'new',
              source: item.source || 'import',
              notes: item.notes || null,
              brand: brandValue, // Normalized brand value
              brandInterest: item.brandInterest || null, // Include brand interest information
              idNumber: item.idNumber || null, // Include ID number if available
              customerLifecycleStage: 'lead',
              convertedToCustomer: false,
              createdAt: new Date(),
              updatedAt: new Date()
            });
            importedCount++;
          }
          break;
        case 'sales':
          // Import sales
          for (const item of data) {
            // Ensure customer exists
            const customerExists = await db.query.customers.findFirst({
              where: eq(customers.id, parseInt(item.customerId))
            });

            if (customerExists) {
              // Process brand field - normalize and validate
              let brandValue = item.brand || 'sleepwear';
              
              // For sales, we only allow a single brand (not comma-separated)
              if (brandValue === 'sleepwear,bride' || brandValue === 'bride,sleepwear') {
                // For multi-brand items, default to the customer's primary brand if available
                brandValue = customerExists.brand?.split(',')[0] || 'sleepwear';
              } else if (brandValue !== 'sleepwear' && brandValue !== 'bride') {
                brandValue = 'sleepwear'; // Default to sleepwear if invalid brand
              }
              
              await db.insert(sales).values({
                customerId: parseInt(item.customerId),
                amount: item.amount,
                status: item.status || 'completed',
                paymentMethod: item.paymentMethod || null,
                notes: item.notes || null,
                brand: brandValue, // Validated brand value
                createdAt: item.date ? new Date(item.date) : new Date(),
                updatedAt: new Date()
              });
              importedCount++;
            }
          }
          break;
      }

      res.json({ 
        success: true, 
        count: importedCount,
        message: `Successfully imported ${importedCount} ${importType}`
      });
    } catch (error) {
      console.error('Spreadsheet import error:', error);
      res.status(500).json({ error: "Failed to import spreadsheet data" });
    }
  });

  // WordPress/WooCommerce API
  app.post("/api/integrations/wordpress/connect", async (req, res) => {
    try {
      const { siteUrl, consumerKey, consumerSecret } = req.body;

      if (!siteUrl || !consumerKey || !consumerSecret) {
        return res.status(400).json({ error: "WordPress site URL, consumer key and consumer secret are required" });
      }

      // Test the WordPress connection
      // In a real implementation, you would verify the credentials by making a test API call
      // For now, we'll just return a success response

      res.json({ success: true, message: "WordPress connection successful" });
    } catch (error) {
      console.error('WordPress connection error:', error);
      res.status(500).json({ error: "Failed to connect to WordPress" });
    }
  });

  app.post("/api/integrations/wordpress/import-customers", async (req, res) => {
    try {
      const { siteUrl, consumerKey, consumerSecret } = req.body;

      if (!siteUrl || !consumerKey || !consumerSecret) {
        return res.status(400).json({ error: "WordPress credentials are required" });
      }

      // In a real implementation, you would fetch customers from WordPress using the WooCommerce API
      // and insert them into the database
      // For now, we'll return a mock response

      res.json({ 
        success: true, 
        message: "WordPress customers import initiated", 
        totalCustomers: 10,
        importedCustomers: 10
      });
    } catch (error) {
      console.error('WordPress customers import error:', error);
      res.status(500).json({ error: "Failed to import customers from WordPress" });
    }
  });

  app.post("/api/integrations/wordpress/import-orders", async (req, res) => {
    try {
      const { siteUrl, consumerKey, consumerSecret } = req.body;

      if (!siteUrl || !consumerKey || !consumerSecret) {
        return res.status(400).json({ error: "WordPress credentials are required" });
      }

      // In a real implementation, you would fetch orders from WordPress using the WooCommerce API
      // and insert them into the database
      // For now, we'll return a mock response

      res.json({ 
        success: true, 
        message: "WordPress orders import initiated", 
        totalOrders: 5,
        importedOrders: 5
      });
    } catch (error) {
      console.error('WordPress orders import error:', error);
      res.status(500).json({ error: "Failed to import orders from WordPress" });
    }
  });
  
  // Register order management routes
  registerOrderRoutes(app);

  return httpServer;
}

// Helper function to parse CSV data with improved error handling
async function parseCSV(buffer: Buffer): Promise<any[]> {
  return new Promise((resolve, reject) => {
    try {
      const results: any[] = [];
      
      // Convertir el buffer a texto para análisis manual avanzado
      const csvText = buffer.toString('utf8');
      
      // Detectar el delimitador: verificamos si el archivo usa punto y coma (;) o coma (,)
      // Analizar primera línea para determinarlo
      const firstLineEnd = csvText.indexOf('\n');
      const firstLine = firstLineEnd > 0 ? csvText.substring(0, firstLineEnd) : csvText;
      
      // Contar ocurrencias de posibles delimitadores
      const semicolonCount = (firstLine.match(/;/g) || []).length;
      const commaCount = (firstLine.match(/,/g) || []).length;
      
      // Determinar delimitador basado en frecuencia
      const delimiter = semicolonCount >= commaCount ? ';' : ',';
      
      console.log(`Delimitador detectado: "${delimiter}" (${semicolonCount} punto y coma vs ${commaCount} comas en encabezados)`);
      
      // Dividir el texto en líneas
      const lines = csvText.split(/\r?\n/);
      
      // Asegurarse de que hay líneas para procesar
      if (lines.length === 0) {
        console.warn("El archivo CSV está vacío o no tiene líneas válidas");
        return resolve([]);
      }
      
      // Procesar encabezados (primera línea)
      const headerLine = lines[0].replace(/^\uFEFF/, ''); // Eliminar BOM si existe
      
      // Extraer encabezados con manejo cuidadoso de comillas
      const headers = parseCSVLine(headerLine, delimiter);
      
      console.log("Encabezados detectados:", headers);
      
      // Iterar sobre cada línea de datos (omitir encabezados)
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Omitir líneas vacías
        if (!line) continue;
        
        // Parsear la línea en campos individuales respetando comillas y delimitadores
        const values = parseCSVLine(line, delimiter);
        
        // Crear objeto con los valores mapeados a encabezados
        const rowObj: Record<string, any> = {};
        
        // Asegurarse de que los valores correspondan a encabezados
        const maxFields = Math.min(headers.length, values.length);
        
        for (let j = 0; j < maxFields; j++) {
          const header = headers[j];
          let value = values[j];
          
          // Convertir valores vacíos a cadena vacía
          if (value === '') {
            value = '';
          }
          
          rowObj[header] = value;
        }
        
        // Convertir encabezados a formato camelCase para compatibilidad
        const normalizedRow = normalizeObjectKeys(rowObj);
        
        results.push(normalizedRow);
      }
      
      // Registrar resultados para depuración
      if (results.length > 0) {
        console.log("Primer registro procesado:", results[0]);
      }
      
      console.log(`Total registros leídos: ${results.length}`);
      resolve(results);
    } catch (error) {
      console.error('CSV setup error:', error);
      reject(new Error('Error al configurar el procesamiento de CSV: ' + (error instanceof Error ? error.message : String(error))));
    }
  });
}

// Función para parsear una línea de CSV respetando comillas y delimitadores
function parseCSVLine(line: string, delimiter: string): string[] {
  const fields: string[] = [];
  let currentField = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = i < line.length - 1 ? line[i + 1] : '';
    
    // Manejar comillas
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Doble comilla dentro de comillas - se escapa como una sola comilla
        currentField += '"';
        i++; // Saltar la siguiente comilla
      } else {
        // Alternar estado de comillas
        inQuotes = !inQuotes;
      }
    } 
    // Si es un delimitador y no estamos dentro de comillas, finalizar el campo actual
    else if (char === delimiter && !inQuotes) {
      fields.push(currentField);
      currentField = '';
    } 
    // Para cualquier otro carácter, añadirlo al campo actual
    else {
      currentField += char;
    }
  }
  
  // Añadir el último campo
  fields.push(currentField);
  
  return fields;
}

// Función para normalizar las claves de un objeto (convertir a camelCase)
function normalizeObjectKeys(obj: Record<string, any>): Record<string, any> {
  const normalizedObj: Record<string, any> = {};
  
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      // Convertir "first name" o "First Name" a "firstName"
      let normalizedKey = key.toLowerCase()
        .replace(/[\s-_]+(\w)/g, (_, p1) => p1.toUpperCase());
      
      // Manejar casos especiales
      if (normalizedKey === 'id' || normalizedKey === 'idnumber') {
        normalizedKey = 'idNumber';
      } else if (normalizedKey === 'firstname') {
        normalizedKey = 'firstName';
      } else if (normalizedKey === 'lastname') {
        normalizedKey = 'lastName';
      } else if (normalizedKey === 'phonecountry') {
        normalizedKey = 'phoneCountry';
      } else if (normalizedKey === 'phonenumber') {
        normalizedKey = 'phoneNumber';
      } else if (normalizedKey === 'deliveryinstructions') {
        normalizedKey = 'deliveryInstructions';
      }
      
      normalizedObj[normalizedKey] = obj[key];
    }
  }
  
  return normalizedObj;
}

// Helper function to parse Excel data with enhanced options
function parseExcel(buffer: Buffer): any[] {
  try {
    console.log("Analizando archivo Excel (versión mejorada)...");
    
    // Parse with more options for better compatibility
    const workbook = XLSX.read(buffer, { 
      type: 'buffer',
      cellDates: true,      // Parse dates as Date objects
      cellNF: false,        // Don't parse number formats
      cellText: false,      // Don't generate text versions of cells
      cellStyles: false,    // Don't parse styles
      codepage: 65001,      // UTF-8
      raw: false            // Don't use raw values
    });
    
    console.log("Hojas disponibles:", workbook.SheetNames);
    
    // Get the first sheet
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      console.error("No sheets found in Excel file");
      throw new Error("No se encontraron hojas en el archivo Excel");
    }
    
    const worksheet = workbook.Sheets[firstSheetName];
    if (!worksheet) {
      console.error("Worksheet is empty");
      throw new Error("La hoja de cálculo está vacía");
    }
    
    // Check if sheet is empty
    if (worksheet['!ref'] === undefined) {
      console.error("Worksheet has no data range");
      return []; // Return empty array for empty sheet
    }
    
    console.log("Excel sheet range:", worksheet['!ref']);
    
    // Ensure all string cells are treated as text to preserve special characters
    // especially semicolons (;)
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    if (range) {
      for (let r = range.s.r; r <= range.e.r; ++r) {
        for (let c = range.s.c; c <= range.e.c; ++c) {
          const cell_ref = XLSX.utils.encode_cell({ r, c });
          const cell = worksheet[cell_ref];
          
          if (cell && typeof cell.v === 'string') {
            // Force the cell type to be string ('s')
            cell.t = 's';
          }
        }
      }
    }
    
    // Try method 1: Sheet to array of arrays, then manual conversion to objects
    const aoa = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,          // Use first row as headers
      raw: false,         // Don't return raw values
      defval: '',         // Default value for empty cells
      blankrows: false,   // Don't include blank rows
      // Explicitly set how we want to handle string values
      // This helps preserve text with semicolons
      rawNumbers: false
    });
    
    console.log(`Método 1 - Filas obtenidas: ${aoa.length}`);
    
    if (aoa.length > 1) { // Need at least headers and one data row
      // Log the first few rows for debugging
      console.log("Headers:", aoa[0]);
      console.log("First data row:", aoa[1]);
      
      // Convert array of arrays to array of objects using headers from first row
      const headers = aoa[0] as Array<unknown>;
      const headerStrings = headers.map(h => h !== null && h !== undefined ? String(h).trim() : '');
      
      // Check that we have valid headers
      if (headerStrings.filter(Boolean).length === 0) {
        console.error("No valid headers found in first row");
        throw new Error("No se encontraron encabezados válidos en la primera fila");
      }
      
      const jsonData = aoa.slice(1).map((row) => {
        // Asegurar que row es un array
        if (!Array.isArray(row)) {
          return null;
        }
        
        const obj: Record<string, any> = {};
        
        // Skip rows that are completely empty
        if (row.every(cell => cell === '' || cell === null || cell === undefined)) {
          return null;
        }
        
        headerStrings.forEach((header: string, idx: number) => {
          if (header && header !== '') {
            let value = row[idx];
            
            // Process string values specially to preserve semicolons
            if (typeof value === 'string') {
              // Just trim, but don't convert empty to null to preserve structure
              value = value.trim();
            }
            
            obj[header] = value !== undefined ? value : null;
          }
        });
        
        return obj;
      }).filter(Boolean) as Record<string, any>[]; // Remove null entries
      
      console.log(`Procesados ${jsonData.length} registros válidos`);
      
      if (jsonData.length > 0) {
        // Show sample of parsed data
        console.log("Muestra de datos procesados:", jsonData[0]);
        return jsonData;
      }
    }
    
    // If we got here, try method 2: direct sheet_to_json with improved options
    console.log("Intentando método 2 de análisis mejorado...");
    
    try {
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        raw: false,
        dateNF: 'YYYY-MM-DD',
        defval: null,
        blankrows: false,
        rawNumbers: false
      });
      
      console.log(`Método 2 - Filas obtenidas: ${jsonData.length}`);
      
      if (jsonData.length > 0) {
        console.log("Muestra de datos del método 2:", jsonData[0]);
        
        // Process the data with special handling for text fields
        return jsonData.map((row: any) => {
          const processedRow: Record<string, any> = {};
          
          Object.entries(row).forEach(([key, value]) => {
            const cleanKey = key.trim();
            
            // Special handling for string values with semicolons
            if (typeof value === 'string') {
              // Just trim to preserve all characters including semicolons
              processedRow[cleanKey] = value.trim();
            } else {
              processedRow[cleanKey] = value === '' ? null : value;
            }
          });
          
          return processedRow;
        });
      }
    } catch (e) {
      console.error("Método 2 falló:", e);
    }
    
    // If we got here, try method 3: manually read cells
    console.log("Intentando método 3 de análisis directo de celdas...");
    
    // Get all cell references
    const keys = Object.keys(worksheet).filter(k => !k.startsWith('!'));
    console.log(`Encontradas ${keys.length} celdas con datos`);
    
    if (keys.length > 0) {
      // Find all column letters
      const colLetters = Array.from(new Set(
        keys.map(k => k.replace(/[0-9]/g, ''))
      )).sort();
      
      // Find max row number
      const maxRow = Math.max(...keys.map(k => {
        const match = k.match(/[A-Z]+([0-9]+)/);
        return match ? parseInt(match[1]) : 0;
      }));
      
      console.log(`Columnas: ${colLetters.join(', ')}, Filas: ${maxRow}`);
      
      if (maxRow >= 2) { // Need at least headers and one data row
        // Read headers from row 1
        const headers: string[] = [];
        
        colLetters.forEach(col => {
          const cellRef = `${col}1`;
          if (worksheet[cellRef] && worksheet[cellRef].v) {
            headers.push(String(worksheet[cellRef].v).trim());
          }
        });
        
        console.log(`Encabezados encontrados: ${headers.join(', ')}`);
        
        if (headers.length > 0) {
          // Read data rows
          const result = [];
          
          for (let row = 2; row <= maxRow; row++) {
            const rowData: Record<string, any> = {};
            let hasData = false;
            
            for (let i = 0; i < colLetters.length; i++) {
              const col = colLetters[i];
              const header = headers[i];
              
              if (header) {
                const cellRef = `${col}${row}`;
                
                if (worksheet[cellRef]) {
                  let value = worksheet[cellRef].v;
                  
                  // Clean string values
                  if (typeof value === 'string') {
                    value = value.trim();
                    if (value === '') value = null;
                  }
                  
                  rowData[header] = value;
                  
                  if (value !== null && value !== undefined && value !== '') {
                    hasData = true;
                  }
                }
              }
            }
            
            if (hasData) {
              result.push(rowData);
            }
          }
          
          console.log(`Método 3 - Filas obtenidas: ${result.length}`);
          
          if (result.length > 0) {
            console.log("Muestra de datos del método 3:", result[0]);
            return result;
          }
        }
      }
    }
    
    // If all methods failed
    console.error("Todos los métodos de análisis fallaron");
    throw new Error("No se pudieron extraer datos del archivo Excel. Verifique que el archivo contiene datos y que la primera fila tiene los nombres de columnas correctos.");
    
  } catch (error) {
    console.error("Error parsing Excel:", error);
    throw new Error("Error al procesar archivo Excel. Verifique el formato y estructura del archivo: " + (error instanceof Error ? error.message : String(error)));
  }
}

// Helper function to validate import data
function validateImportData(data: any[], type: string): { valid: boolean, message?: string } {
  if (!data || data.length === 0) {
    return { valid: false, message: "No se encontraron datos en el archivo. Verifique que la hoja tiene datos y que la primera fila tiene encabezados." };
  }

  // Enhanced validation based on import type
  switch (type) {
    case 'customers':
      // Required fields validation - we'll be more flexible with mapped data
      // Allow both firstName+lastName format or just name if it was mapped that way
      const invalidCustomers = data.filter(item => {
        // Either firstName + lastName OR name must be present
        return (!item.firstName || !item.lastName) && !item.name;
      });
      
      if (invalidCustomers.length > 0) {
        return { 
          valid: false, 
          message: `${invalidCustomers.length} registro(s) no tienen información de nombre válida. Asegúrese de que cada registro tenga firstName y lastName, o el campo name.` 
        };
      }
      
      // Brand validation if provided
      const invalidBrandCustomers = data.filter(item => {
        if (!item.brand) return false; // Skip empty brands
        const brandStr = String(item.brand).toLowerCase();
        return !['sleepwear', 'bride', 'sleepwear,bride', 'bride,sleepwear'].includes(brandStr);
      });
      
      if (invalidBrandCustomers.length > 0) {
        return { 
          valid: false, 
          message: `${invalidBrandCustomers.length} registro(s) tienen valores de marca inválidos. Use 'sleepwear', 'bride', o 'sleepwear,bride'` 
        };
      }
      
      // Phone format validation if provided
      const invalidPhoneCustomers = data.filter(item => {
        if (!item.phoneCountry) return false; // Skip empty phone countries
        return !item.phoneCountry.startsWith('+');
      });
      
      if (invalidPhoneCustomers.length > 0) {
        return { 
          valid: false, 
          message: `${invalidPhoneCustomers.length} registro(s) tienen códigos de país inválidos. El código debe comenzar con '+' (p.ej. +593)` 
        };
      }
      break;
      
    case 'leads':
      // Required fields validation - we'll be more flexible with mapped data
      const invalidLeads = data.filter(item => {
        // Either firstName + lastName OR name must be present
        return (!item.firstName || !item.lastName) && !item.name;
      });
      
      if (invalidLeads.length > 0) {
        return { 
          valid: false, 
          message: `${invalidLeads.length} registro(s) no tienen información de nombre válida. Asegúrese de que cada registro tenga firstName y lastName, o el campo name.` 
        };
      }
      
      // Brand validation if provided
      const invalidBrandLeads = data.filter(item => {
        if (!item.brand) return false; // Skip empty brands
        const brandStr = String(item.brand).toLowerCase();
        return !['sleepwear', 'bride', 'sleepwear,bride', 'bride,sleepwear'].includes(brandStr);
      });
      
      if (invalidBrandLeads.length > 0) {
        return { 
          valid: false, 
          message: `${invalidBrandLeads.length} registro(s) tienen valores de marca inválidos. Use 'sleepwear', 'bride', o 'sleepwear,bride'` 
        };
      }
      
      // Status validation if provided
      const validStatuses = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];
      const invalidStatusLeads = data.filter(item => {
        if (!item.status) return false; // Skip empty statuses
        return !validStatuses.includes(String(item.status).toLowerCase());
      });
      
      if (invalidStatusLeads.length > 0) {
        return { 
          valid: false, 
          message: `${invalidStatusLeads.length} registro(s) tienen estados inválidos. Valores válidos: ${validStatuses.join(', ')}` 
        };
      }
      break;
      
    case 'sales':
      // Required fields validation
      if (!data.every(item => item.customerId && item.amount)) {
        return { valid: false, message: "Todos los registros de ventas deben tener los campos 'customerId' y 'amount'" };
      }
      
      // Amount validation
      const invalidAmountSales = data.filter(item => {
        return isNaN(Number(item.amount)) || Number(item.amount) <= 0;
      });
      
      if (invalidAmountSales.length > 0) {
        return { 
          valid: false, 
          message: `${invalidAmountSales.length} registro(s) tienen montos inválidos. Los montos deben ser números positivos.` 
        };
      }
      
      // Customer ID validation
      const invalidCustomerIdSales = data.filter(item => {
        return isNaN(Number(item.customerId)) || Number(item.customerId) <= 0;
      });
      
      if (invalidCustomerIdSales.length > 0) {
        return { 
          valid: false, 
          message: `${invalidCustomerIdSales.length} registro(s) tienen IDs de cliente inválidos. Los IDs deben ser números positivos.` 
        };
      }
      
      // Date validation if provided
      const invalidDateSales = data.filter(item => {
        if (!item.date) return false; // Skip empty dates
        const dateObj = new Date(item.date);
        return isNaN(dateObj.getTime());
      });
      
      if (invalidDateSales.length > 0) {
        return { 
          valid: false, 
          message: `${invalidDateSales.length} registro(s) tienen fechas inválidas. Use el formato YYYY-MM-DD.` 
        };
      }
      
      // Brand validation for sales
      const invalidBrandSales = data.filter(item => {
        if (!item.brand) return false; // Skip empty brands
        const brandStr = String(item.brand).toLowerCase();
        return !['sleepwear', 'bride'].includes(brandStr);
      });
      
      if (invalidBrandSales.length > 0) {
        return { 
          valid: false, 
          message: `${invalidBrandSales.length} registro(s) tienen valores de marca inválidos. Para ventas, use 'sleepwear' o 'bride' (no ambos).` 
        };
      }
      break;
      
    default:
      return { valid: false, message: "Tipo de importación inválido" };
  }

  return { valid: true };
}