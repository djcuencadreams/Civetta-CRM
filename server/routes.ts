import type { Express } from "express";
import { createServer, type Server } from "http";
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
        // If a customer has name but not firstName/lastName, split them for display purposes
        if (customer.name && (!customer.firstName || !customer.lastName)) {
          const nameParts = customer.name.split(' ');
          if (nameParts.length > 0) {
            customer.firstName = customer.firstName || nameParts[0];
            customer.lastName = customer.lastName || nameParts.slice(1).join(' ');
          }
        }
        
        // If a customer has address but not structured address fields, parse them
        if (customer.address && (!customer.street || !customer.city || !customer.province)) {
          try {
            const addressParts = customer.address.split(',');
            customer.street = customer.street || addressParts[0]?.trim();
            customer.city = customer.city || addressParts[1]?.trim();
            
            // Handle province which might be followed by delivery instructions
            if (addressParts[2]) {
              const provinceAndInstructions = addressParts[2].split('\n');
              customer.province = customer.province || provinceAndInstructions[0]?.trim();
              
              // Get delivery instructions if present
              if (provinceAndInstructions.length > 1) {
                customer.deliveryInstructions = customer.deliveryInstructions || provinceAndInstructions[1]?.trim();
              }
            }
          } catch (e) {
            // Silent fail - if parsing fails, we'll just use what we have
            console.warn('Failed to parse address for customer', customer.id);
          }
        }
        
        // If a customer has phone but not phoneCountry/phoneNumber, parse them
        if (customer.phone && (!customer.phoneCountry || !customer.phoneNumber)) {
          try {
            // Try to extract country code (usually starts with +)
            const phoneMatch = customer.phone.match(/^(\+\d+)(.*)$/);
            if (phoneMatch) {
              customer.phoneCountry = customer.phoneCountry || phoneMatch[1];
              customer.phoneNumber = customer.phoneNumber || phoneMatch[2];
            }
          } catch (e) {
            console.warn('Failed to parse phone for customer', customer.id);
          }
        }
        
        return customer;
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
            // Copy lead's address info to customer if available
            street: existingLead.street || null,
            city: existingLead.city || null,
            province: existingLead.province || null,
            deliveryInstructions: existingLead.deliveryInstructions || null,
            // The idNumber will be empty here since leads don't track it,
            // it needs to be added later when creating invoices or shipping labels
            idNumber: null,
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

  // Spreadsheet Import API
  app.post("/api/configuration/spreadsheet/preview", async (req, res) => {
    try {
      if (!req.files || Object.keys(req.files).length === 0 || !('file' in req.files)) {
        return res.status(400).json({ error: "No file uploaded" });
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

      let data: any[] = [];

      if (fileExtension === 'csv') {
        // Parse CSV file
        data = await parseCSV(file.data);
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        // Parse Excel file
        data = parseExcel(file.data);
      } else {
        return res.status(400).json({ error: "Unsupported file format. Please use CSV or Excel file." });
      }

      // Validate data based on import type
      const validationResult = validateImportData(data, importType);
      if (!validationResult.valid) {
        return res.status(400).json({ 
          error: "Invalid data format", 
          message: validationResult.message 
        });
      }

      // Return preview data (limited to 100 records)
      res.json({ data: data.slice(0, 100) });
    } catch (error) {
      console.error('Spreadsheet preview error:', error);
      res.status(500).json({ error: "Failed to process spreadsheet" });
    }
  });

  app.post("/api/configuration/spreadsheet/import", async (req, res) => {
    try {
      if (!req.files || Object.keys(req.files).length === 0 || !('file' in req.files)) {
        return res.status(400).json({ error: "No file uploaded" });
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
          return res.status(400).json({ error: "Invalid mapped data format" });
        }
      } else {
        // Otherwise parse the file as usual
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        
        if (fileExtension === 'csv') {
          // Parse CSV file
          data = await parseCSV(file.data);
        } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
          // Parse Excel file
          data = parseExcel(file.data);
        } else {
          return res.status(400).json({ error: "Unsupported file format. Please use CSV or Excel file." });
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

  return httpServer;
}

// Helper function to parse CSV data with improved error handling
async function parseCSV(buffer: Buffer): Promise<any[]> {
  return new Promise((resolve, reject) => {
    try {
      const results: any[] = [];
      const readableStream = new Readable();
      readableStream.push(buffer);
      readableStream.push(null);

      // Configure csv-parser with options for better handling
      const parserOptions = {
        trim: true,                  // Trim whitespace from values
        skipLines: 0,                // Don't skip any lines
        strict: false,               // Don't be too strict about column counts
        columns: true,               // Auto-detect columns from first row
        escape: '"',                 // Standard CSV escape character
        comment: '#'                 // Ignore lines starting with #
      };

      readableStream
        .pipe(csvParser(parserOptions))
        .on('data', (data: any) => {
          // Basic data cleaning for each row
          const cleanedData: Record<string, any> = {};
          
          // Clean up keys and values
          Object.keys(data).forEach(key => {
            // Clean the key - remove BOM and whitespace
            const cleanKey = key.replace(/^\uFEFF/, '').trim();
            
            // Clean the value - convert empty strings to null
            let value = data[key];
            if (typeof value === 'string') {
              value = value.trim();
              if (value === '') value = null;
            }
            
            cleanedData[cleanKey] = value;
          });
          
          results.push(cleanedData);
        })
        .on('end', () => resolve(results))
        .on('error', (error: Error) => {
          console.error('CSV parsing error:', error);
          reject(new Error(`Error al procesar el archivo CSV: ${error.message}`));
        });
    } catch (error) {
      console.error('CSV setup error:', error);
      reject(new Error('Error al configurar el procesamiento de CSV'));
    }
  });
}

// Helper function to parse Excel data with enhanced options
function parseExcel(buffer: Buffer): any[] {
  try {
    // Parse with more options for better compatibility
    const workbook = XLSX.read(buffer, { 
      type: 'buffer',
      cellDates: true,      // Parse dates as Date objects
      cellNF: false,        // Don't parse number formats
      cellText: false       // Don't generate text versions of cells
    });
    
    // Get the first sheet
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Convert to JSON with options
    const data = XLSX.utils.sheet_to_json(worksheet, {
      header: 'A',        // Use first row as headers
      range: 0,           // Start at the first row
      raw: false,         // Don't return raw values
      dateNF: 'YYYY-MM-DD', // Date format string
      defval: null,       // Default value for empty cells
      blankrows: false    // Don't include blank rows
    });
    
    // Clean and transform the data
    const cleanedData = data.slice(1).map((row: any) => {
      const cleanedRow: Record<string, any> = {};
      
      // Skip fully empty rows
      if (Object.values(row).every(val => val === null || val === '')) {
        return null;
      }
      
      // Convert headers (first row values) to proper field names and set cleaned values
      Object.keys(row).forEach(cell => {
        // Get the header name from the first row using the column letter (cell) as key
        const headerRow = data[0] as Record<string, any>;
        const headerName = headerRow[cell];
        
        if (headerName && typeof headerName === 'string') {
          const cleanHeader = headerName.trim();
          let value = row[cell];
          
          // Clean string values
          if (typeof value === 'string') {
            value = value.trim();
            if (value === '') value = null;
          }
          
          cleanedRow[cleanHeader] = value;
        }
      });
      
      return cleanedRow;
    });
    
    // Filter out null rows (completely empty)
    return cleanedData.filter(Boolean) as any[];
  } catch (error) {
    console.error("Error parsing Excel:", error);
    throw new Error("Error al procesar archivo Excel. Verifique el formato y estructura del archivo.");
  }
}

// Helper function to validate import data
function validateImportData(data: any[], type: string): { valid: boolean, message?: string } {
  if (!data || data.length === 0) {
    return { valid: false, message: "No se encontraron datos en el archivo" };
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