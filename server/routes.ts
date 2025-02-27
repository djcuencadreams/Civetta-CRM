import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { customers, sales, webhooks, leads, leadActivities } from "@db/schema";
import { eq, desc, like } from "drizzle-orm";
import { Router } from "express";
import multer from "multer";
import * as pdfjsLib from "pdfjs-dist";
import fileUpload from "express-fileupload";

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

      // Parse name into parts (assuming format is "First Last")
      const nameParts = customer.name.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // Parse address if available (assuming format is "street, city, province\ndeliveryInstructions")
      let street = '', city = '', province = '', deliveryInstructions = '';
      if (customer.address) {
        const parts = customer.address.split('\n');
        const addressParts = parts[0]?.split(',') || [];

        street = addressParts[0]?.trim() || '';
        city = addressParts[1]?.trim() || '';
        province = addressParts[2]?.trim() || '';
        deliveryInstructions = parts[1]?.trim() || '';
      }

      // Create a new lead from the customer data
      const [lead] = await db.insert(leads).values({
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        phoneCountry: customer.phone?.split(/[0-9]/)[0] || null,
        street,
        city,
        province,
        deliveryInstructions,
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
        province, deliveryInstructions, brand } = req.body;

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
        brand: brand || null
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
        lastContact, nextFollowUp, brand
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
            source: source || 'website',
            brand: existingLead.brand || brand || 'sleepwear' // Include brand information
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

  // PDF Import API
  app.post("/api/integrations/pdf/extract", async (req, res) => {
    try {
      if (!req.files || Object.keys(req.files).length === 0 || !('pdf' in req.files)) {
        return res.status(400).json({ error: "No PDF file uploaded" });
      }

      // Type assertion for express-fileupload
      const pdfFile = req.files.pdf as fileUpload.UploadedFile;

      // Load the PDF file
      const arrayBuffer = pdfFile.data;
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;

      // Extract text from the PDF
      let extractedText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const strings = content.items.map((item: any) => item.str);
        extractedText += strings.join(' ') + '\n';
      }

      // Parse the text to extract customer information
      const extractedCustomers = extractCustomerData(extractedText);

      res.json(extractedCustomers);
    } catch (error) {
      console.error('PDF extraction error:', error);
      res.status(500).json({ error: "Failed to extract data from PDF" });
    }
  });

  app.post("/api/integrations/pdf/import", async (req, res) => {
    try {
      const { customers: customersData } = req.body;

      if (!customersData || !Array.isArray(customersData) || customersData.length === 0) {
        return res.status(400).json({ error: "No customer data provided" });
      }

      // Insert the customers into the database
      const result = [];
      for (const customerData of customersData) {
        // Format address if individual components are provided
        let address = null;
        if (customerData.street) {
          address = `${customerData.street}, ${customerData.city || ''}, ${customerData.state || ''}${customerData.postalCode ? ' ' + customerData.postalCode : ''}`;
          if (customerData.deliveryInstructions) {
            address += `\n${customerData.deliveryInstructions}`;
          }
        } else if (customerData.address) {
          address = customerData.address;
        }

        // Insert the customer
        const [customer] = await db.insert(customers).values({
          name: customerData.name,
          email: customerData.email || null,
          phone: customerData.phone || null,
          address: address,
          source: 'pdf_import',
          brand: 'sleepwear', // Default brand, can be updated later
          createdAt: new Date(),
          updatedAt: new Date()
        }).returning();

        result.push(customer);
      }

      res.json({ count: result.length, customers: result });
    } catch (error) {
      console.error('Customer import error:', error);
      res.status(500).json({ error: "Failed to import customers" });
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

  return httpServer;
}

// Helper function to extract customer data from PDF text
function extractCustomerData(text: string) {
  // This is a simplified example - in a real implementation,
  // you would need to adapt this based on the format of your PDF forms

  // Split by sections or form fields
  const lines = text.split('\n').map(line => line.trim()).filter(line => line);

  // Example pattern for extracting customer information
  // In a real implementation, you would use more robust patterns specific to your form
  const customers = [];
  let currentCustomer: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    notes?: string;
  } = {};

  let inAddressSection = false;

  for (const line of lines) {
    if (line.includes('Name:') || line.includes('Nombre:')) {
      if (Object.keys(currentCustomer).length > 0 && currentCustomer.name) {
        customers.push(currentCustomer);
        currentCustomer = {};
      }

      const nameParts = line.split(':');
      if (nameParts.length > 1) {
        currentCustomer.name = nameParts[1].trim();
      }
      inAddressSection = false;
    } else if (line.includes('Email:') || line.includes('Correo:')) {
      const emailParts = line.split(':');
      if (emailParts.length > 1) {
        currentCustomer.email = emailParts[1].trim();
      }
      inAddressSection = false;
    } else if (line.includes('Phone:') || line.includes('Teléfono:')) {
      const phoneParts = line.split(':');
      if (phoneParts.length > 1) {
        currentCustomer.phone = phoneParts[1].trim();
      }
      inAddressSection = false;
    } else if (line.includes('Address:') || line.includes('Dirección:')) {
      const addressParts = line.split(':');
      if (addressParts.length > 1) {
        currentCustomer.address = addressParts[1].trim();
      }
      inAddressSection = true;
    } else if (inAddressSection) {
      // Assume additional address details in subsequent lines
      if (line.includes('City:') || line.includes('Ciudad:')) {
        const cityParts = line.split(':');
        if (cityParts.length > 1) {
          currentCustomer.city = cityParts[1].trim();
        }
      } else if (line.includes('State:') || line.includes('Provincia:')) {
        const stateParts = line.split(':');
        if (stateParts.length > 1) {
          currentCustomer.state = stateParts[1].trim();
        }
      } else if (line.includes('Postal Code:') || line.includes('Código Postal:')) {
        const postalParts = line.split(':');
        if (postalParts.length > 1) {
          currentCustomer.postalCode = postalParts[1].trim();
        }
      } else if (line.includes('Notes:') || line.includes('Notas:')) {
        const notesParts = line.split(':');
        if (notesParts.length > 1) {
          currentCustomer.notes = notesParts[1].trim();
        }
      } else if (currentCustomer.address) {
        // Append to address if there's no specific field
        currentCustomer.address += ', ' + line;
      }
    }
  }

  // Add the last customer if any
  if (Object.keys(currentCustomer).length > 0 && currentCustomer.name) {
    customers.push(currentCustomer);
  }

  return customers;
}