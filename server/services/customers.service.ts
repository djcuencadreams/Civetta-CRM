import { Express, Request, Response } from "express";
import { db, pool } from "@db";
import { customers, leads, sales } from "@db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { Service } from "./service-registry";
import { validateParams } from "../validation";
import { appEvents, EventTypes } from "../lib/event-emitter";
import { Customer } from "@db/schema";
import { generateFullName, ensureNameField } from "../utils/name-utils";

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
    
    // Service status endpoint
    app.get("/api/customers-service/status", this.getServiceStatus.bind(this));
  }

  /**
   * Get all customers
   */
  async getAllCustomers(req: Request, res: Response): Promise<void> {
    try {
      const { search, brand } = req.query;
      
      // Construir una consulta SQL directa para evitar problemas de tipado
      let conditions = [];
      let values: any[] = [];
      let index = 1;
      
      if (search) {
        const searchTerm = `%${search}%`;
        conditions.push(`(name ILIKE $${index} OR email ILIKE $${index} OR phone ILIKE $${index})`);
        values.push(searchTerm);
        index++;
      }
      
      if (brand) {
        conditions.push(`brand = $${index}`);
        values.push(brand);
        index++;
      }
      
      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      
      // Ejecutar consulta SQL directa
      const query = `
        SELECT * FROM customers 
        ${whereClause}
        ORDER BY created_at DESC
      `;
      
      const { rows } = await pool.query(query, values);
      
      // Procesar todos los clientes para garantizar la consistencia de los campos
      const enhancedCustomers = rows.map(customer => {
        // Crear una copia del cliente para modificarlo
        const enhancedCustomer = { ...customer };
        
        // Garantizar que todos los campos estén disponibles en ambos formatos (snake_case y camelCase)
        
        // Conversión de snake_case a camelCase
        if (enhancedCustomer.id_number !== undefined) {
          enhancedCustomer.idNumber = enhancedCustomer.id_number;
        }
        
        if (enhancedCustomer.first_name !== undefined) {
          enhancedCustomer.firstName = enhancedCustomer.first_name;
        }
        
        if (enhancedCustomer.last_name !== undefined) {
          enhancedCustomer.lastName = enhancedCustomer.last_name;
        }
        
        if (enhancedCustomer.phone_country !== undefined) {
          enhancedCustomer.phoneCountry = enhancedCustomer.phone_country;
        }
        
        if (enhancedCustomer.phone_number !== undefined) {
          enhancedCustomer.phoneNumber = enhancedCustomer.phone_number;
        }
        
        if (enhancedCustomer.secondary_phone !== undefined) {
          enhancedCustomer.secondaryPhone = enhancedCustomer.secondary_phone;
        }
        
        if (enhancedCustomer.delivery_instructions !== undefined) {
          enhancedCustomer.deliveryInstructions = enhancedCustomer.delivery_instructions;
        }
        
        if (enhancedCustomer.total_value !== undefined) {
          enhancedCustomer.totalValue = enhancedCustomer.total_value;
        }
        
        if (enhancedCustomer.assigned_user_id !== undefined) {
          enhancedCustomer.assignedUserId = enhancedCustomer.assigned_user_id;
        }
        
        // Conversión de camelCase a snake_case
        if (enhancedCustomer.idNumber !== undefined) {
          enhancedCustomer.id_number = enhancedCustomer.idNumber;
        }
        
        if (enhancedCustomer.firstName !== undefined) {
          enhancedCustomer.first_name = enhancedCustomer.firstName;
        }
        
        if (enhancedCustomer.lastName !== undefined) {
          enhancedCustomer.last_name = enhancedCustomer.lastName;
        }
        
        if (enhancedCustomer.phoneCountry !== undefined) {
          enhancedCustomer.phone_country = enhancedCustomer.phoneCountry;
        }
        
        if (enhancedCustomer.phoneNumber !== undefined) {
          enhancedCustomer.phone_number = enhancedCustomer.phoneNumber;
        }
        
        if (enhancedCustomer.secondaryPhone !== undefined) {
          enhancedCustomer.secondary_phone = enhancedCustomer.secondaryPhone;
        }
        
        if (enhancedCustomer.deliveryInstructions !== undefined) {
          enhancedCustomer.delivery_instructions = enhancedCustomer.deliveryInstructions;
        }
        
        if (enhancedCustomer.totalValue !== undefined) {
          enhancedCustomer.total_value = enhancedCustomer.totalValue;
        }
        
        if (enhancedCustomer.assignedUserId !== undefined) {
          enhancedCustomer.assigned_user_id = enhancedCustomer.assignedUserId;
        }
        
        // Compatibilidad adicional para campos alternativos
        enhancedCustomer.street_address = enhancedCustomer.street || null;
        enhancedCustomer.city_name = enhancedCustomer.city || null;
        enhancedCustomer.province_name = enhancedCustomer.province || null;
        
        return enhancedCustomer;
      });
      
      console.log(`✅ [GET:ALL] Optimizados datos de ${enhancedCustomers.length} clientes`);
      
      res.json(enhancedCustomers);
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
        columns: {
          id: true,
          name: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          phoneCountry: true,
          phoneNumber: true,
          secondaryPhone: true,
          street: true,
          city: true,
          province: true,
          deliveryInstructions: true,
          idNumber: true,
          source: true,
          brand: true,
          status: true,
          type: true,
          createdAt: true,
          updatedAt: true
        },
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
      
      // Crear objeto de respuesta limpio con solo los campos necesarios
      const enhancedCustomer = {
        id: result.id,
        name: result.name,
        firstName: result.firstName || null,
        lastName: result.lastName || null,
        email: result.email || null,
        phone: result.phone || null,
        phoneCountry: result.phoneCountry || null,
        phoneNumber: result.phoneNumber || null,
        secondaryPhone: result.secondaryPhone || null,
        street: result.street || null,
        city: result.city || null,
        province: result.province || null,
        deliveryInstructions: result.deliveryInstructions || null,
        idNumber: result.idNumber || null,
        source: result.source || null,
        brand: result.brand || null,
        status: result.status || 'active',
        type: result.type || 'person',
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
        sales: result.sales || []
      };
      
      console.log(`✅ [GET:ID] Optimizados datos del cliente ${enhancedCustomer.id} - ${enhancedCustomer.name}`);
      console.log(`📋 [GET:ID] Datos de dirección: street=${enhancedCustomer.street}, city=${enhancedCustomer.city}, province=${enhancedCustomer.province}`);
      console.log(`🆔 [GET:ID] Datos de ID: idNumber=${enhancedCustomer.idNumber}`);
      
      res.json(enhancedCustomer);
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
        firstName, lastName, email, phone, street, city, province, 
        deliveryInstructions, source, brand, notes, idNumber,
        billingAddress, // Agregamos billingAddress a los campos que extraemos
        phoneCountry, phoneNumber, secondaryPhone, // Campos adicionales
        name, // Mantener para compatibilidad temporal
        status, type, tags // Campos de clasificación
      } = req.body;

      // Validar que se proporcionaron firstName y lastName
      if (!firstName?.trim()) {
        res.status(400).json({ error: "El nombre (firstName) es requerido" });
        return;
      }

      if (!lastName?.trim()) {
        res.status(400).json({ error: "El apellido (lastName) es requerido" });
        return;
      }
      
      // Generar el campo name a partir de firstName y lastName usando la función de utilidad
      const customerData = ensureNameField({
        firstName,
        lastName
      });

      // Creamos un objeto sin el campo tags para la inserción principal
      // Esto evita problemas con el tipo de datos (array en el schema vs. JSONB en la BD)
      const customerData2Insert = {
        name: customerData.name,
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
        billingAddress: billingAddress || null, // Guardamos la dirección de facturación si existe
        status: status || 'active',
        type: type || 'person',
        source: source || 'direct',
        brand: brand || 'sleepwear',
        notes: notes?.trim() || null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Log the parsed data for debugging
      console.log(`Creating customer with data:`, {
        name: customerData.name,
        firstName,
        lastName,
        tagsType: typeof tags,
        tagsValue: tags
      });

      // Crear el cliente sin los tags inicialmente
      const [customer] = await db.insert(customers).values(customerData2Insert).returning();
      
      // Si se proporcionaron tags, actualizamos usando SQL nativo para manejar el tipo JSONB
      if (tags) {
        try {
          // Ensure tags is properly formatted as a string array
          const formattedTags = Array.isArray(tags) ? tags : (tags ? [tags] : []);
          
          // Actualizar el campo tags como JSONB usando SQL nativo
          await db.$client.query(
            `UPDATE customers SET tags = $1::jsonb WHERE id = $2`,
            [JSON.stringify(formattedTags), customer.id]
          );
          console.log(`[TAGS] Agregado campo tags para nuevo cliente ${customer.id}`);
        } catch (tagsError) {
          console.error('[TAGS] Error agregando tags:', tagsError);
        }
      }

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
        firstName, lastName, email, phone, street, city, province, 
        deliveryInstructions, source, brand, notes, idNumber,
        billingAddress, phoneCountry, phoneNumber, secondaryPhone,
        status, type, tags 
      } = req.body;

      // Validaciones básicas
      if (!firstName?.trim() || !lastName?.trim()) {
        res.status(400).json({ error: "El nombre y apellido son requeridos" });
        return;
      }

      // Verificar existencia del cliente
      const existingCustomer = await db.query.customers.findFirst({
        where: eq(customers.id, customerId)
      }) as Customer;

      if (!existingCustomer) {
        res.status(404).json({ error: "Customer not found" });
        return;
      }

      // Generar el nombre completo
      const customerData = ensureNameField({ firstName, lastName });

      // Preparar datos de actualización
      const updateData = {
        name: customerData.name,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email?.trim() || null,
        phoneCountry: phoneCountry || null,
        phoneNumber: phoneNumber || null,
        phone: buildPhoneNumber({ phoneCountry, phoneNumber }),
        secondaryPhone: secondaryPhone || null,
        street: street?.trim() || null,
        city: city?.trim() || null,
        province: province || null,
        deliveryInstructions: deliveryInstructions?.trim() || null,
        idNumber: idNumber?.trim() || null,
        billingAddress: billingAddress || null,
        status: status || 'active',
        type: type || 'person',
        source: source || 'direct',
        brand: brand || 'sleepwear',
        notes: notes?.trim() || null,
        updatedAt: new Date()
      };

      console.log("[DEBUG] updateCustomer - Datos preparados para actualización:", {
        name: updateData.name,
        firstName: updateData.firstName,
        lastName: updateData.lastName,
        email: updateData.email
      });

      // Actualizar primero los datos principales del cliente
      const [updatedCustomer] = await db.update(customers)
        .set(updateData)
        .where(eq(customers.id, customerId))
        .returning();

      // Actualizamos los tags utilizando el enfoque que vimos funcionar en SQL directo
      if (tags !== undefined) {
        try {
          // Preparamos los tags como un array filtrado de cadenas
          const formattedTags = Array.isArray(tags) 
            ? tags.filter(tag => typeof tag === 'string') 
            : (typeof tags === 'string' ? [tags] : []);
          
          console.log(`[TAGS] Intentando actualizar tags para cliente ${customerId}:`, 
            JSON.stringify(formattedTags, null, 2));
          
          // Creamos un string con formato de array JSON válido: '["tag1", "tag2"]'
          // Al usar JSON.stringify obtenemos el formato exacto que PostgreSQL espera
          const jsonArrayString = JSON.stringify(formattedTags);
          
          // Ejecutamos la actualización con la sintaxis correcta
          await db.$client.query(
            `UPDATE customers SET tags = $1::jsonb WHERE id = $2`,
            [jsonArrayString, customerId]
          );
          
          console.log(`[TAGS] Tags actualizados exitosamente para cliente ${customerId}`);
          
          // Agregamos los tags al objeto de respuesta
          updatedCustomer.tags = formattedTags;
        } catch (tagsError: any) {
          console.error('[TAGS] Error actualizando tags:', tagsError);
          console.error('[TAGS] Error detallado:', tagsError.message);
          console.error('[TAGS] Input tags:', JSON.stringify(tags));
          // No fallamos la operación completa si hay un error con los tags
          // pero registramos el error para depuración
        }
      }

      // Emit customer updated event
      appEvents.emit(EventTypes.CUSTOMER_UPDATED, updatedCustomer);
      
      // Log del cliente actualizado
      console.log(`[DEBUG] updateCustomer - Cliente actualizado:`, JSON.stringify({
        id: updatedCustomer.id,
        name: updatedCustomer.name,
        idNumber: updatedCustomer.idNumber,
        deliveryInstructions: updatedCustomer.deliveryInstructions
      }, null, 2));
      
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
      // Aseguramos que firstName y lastName estén siempre presentes
      const customerName = typeof customer.name === 'string' ? customer.name : '';
      const leadFirstName = customer.firstName || (customerName ? customerName.split(' ')[0] : '') || 'Unknown';
      const leadLastName = customer.lastName || 
        (customerName && customerName.split(' ').length > 1 ? customerName.split(' ').slice(1).join(' ') : '') || 'Unknown';
      
      // Generamos el campo name a partir de firstName y lastName usando la función de utilidad
      // No es necesario calcular leadFullName, ya que lo haremos con ensureNameField

      // Usar ensureNameField para garantizar la consistencia entre firstName, lastName y name
      const leadData = ensureNameField({
        firstName: leadFirstName,
        lastName: leadLastName || 'Unknown', // Aseguramos que lastName siempre tenga un valor
      });

      const [lead] = await db.insert(leads).values({
        name: leadData.name,
        firstName: leadData.firstName,
        lastName: leadData.lastName,
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
  
  /**
   * Get service status
   */
  async getServiceStatus(_req: Request, res: Response): Promise<void> {
    try {
      // Get basic statistics from the customers table
      const { rows } = await pool.query(`
        SELECT 
          COUNT(*) as total_customers,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_customers,
          COUNT(CASE WHEN source = 'instagram' THEN 1 END) as instagram_customers,
          COUNT(CASE WHEN source = 'facebook' THEN 1 END) as facebook_customers,
          COUNT(CASE WHEN source = 'direct' THEN 1 END) as direct_customers,
          COUNT(CASE WHEN source = 'referral' THEN 1 END) as referral_customers,
          COUNT(CASE WHEN brand = 'sleepwear' THEN 1 END) as sleepwear_customers,
          COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END) as new_customers_30d
        FROM customers
      `);
      
      const stats = rows[0];
      
      res.json({
        status: 'active',
        serviceName: this.name,
        statistics: stats,
        version: '1.0.0',
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error getting service status:', error);
      res.status(500).json({ 
        status: 'error',
        error: "Failed to retrieve service status",
        serviceName: this.name,
        timestamp: new Date().toISOString()
      });
    }
  }
}

// Create and export the service instance
export const customersService = new CustomersService();