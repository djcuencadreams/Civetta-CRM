/**
 * Rutas para el manejo de etiquetas de envío (versión mejorada con firstName/lastName)
 * Este módulo gestiona:
 * 1. Verificación de clientes existentes por cédula, email o teléfono
 * 2. Guardar formularios de envío con o sin generación de PDF
 * 3. Integración con sitios externos vía CORS
 * 4. Soporte para firstName y lastName en todos los flujos
 */

import { Express, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { 
  customers, 
  orders,
  orderStatusEnum,
  paymentStatusEnum, 
  paymentMethodEnum, 
  sourceEnum, 
  brandEnum 
} from '../db/schema';
import { eq, or, and, like, ilike } from 'drizzle-orm';
import cors from 'cors';
import { appEvents, EventTypes } from './lib/event-emitter';
import { generateShippingLabelPdf } from './lib/shipping-label.service';
import { validateBody } from './validation';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

/**
 * Función para generar consultas de búsqueda por teléfono
 * Maneja diferentes formatos de teléfono (con/sin prefijo, solo dígitos finales)
 * 
 * @param phoneNumber Número de teléfono a buscar
 * @returns Array de consultas SQL para buscar el teléfono
 */
function createPhoneQueries(phoneNumber: string) {
  const queries = [];
  const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
  
  // Búsqueda exacta
  queries.push(eq(customers.phone, phoneNumber));
  
  // Búsqueda con comodín al inicio para encontrar coincidencias parciales
  // Ejemplo: Si el teléfono es "0991234567", buscar "*1234567"
  if (cleanPhone.length > 6) {
    const lastDigits = cleanPhone.slice(-7);
    queries.push(like(customers.phone, `%${lastDigits}`));
  }
  
  return queries;
}

// Validación del formulario de envío
export const shippingFormSchema = z.object({
  name: z.string().min(2, "El nombre es obligatorio"),
  // Se incluyen firstName y lastName como campos opcionales ya que pueden no estar presentes en formularios antiguos
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().min(7, "El teléfono es obligatorio"),
  street: z.string().min(3, "La dirección es obligatoria"),
  city: z.string().min(2, "La ciudad es obligatoria"),
  province: z.string().min(2, "La provincia es obligatoria"),
  companyName: z.string().optional(),
  idNumber: z.string().optional(),
  deliveryInstructions: z.string().optional(),
  email: z.string().email("Email inválido").optional().nullish(),
  saveCustomer: z.boolean().optional().default(true)
});

// Validación para la búsqueda de clientes
export const customerCheckSchema = z.object({
  query: z.string().min(4, "Ingrese al menos 4 caracteres para buscar"),
  type: z.enum(["identification", "email", "phone"])
});

type ShippingFormData = z.infer<typeof shippingFormSchema>;
type CustomerCheckData = z.infer<typeof customerCheckSchema>;

/**
 * Registra las rutas para el manejo de etiquetas de envío
 * @param app Aplicación Express
 */
export function registerShippingRoutesWithNames(app: Express) {
  // Configuración CORS para permitir acceso desde sitios WordPress
  const corsOptions = {
    origin: '*', // Permitir cualquier origen para facilitar la integración
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
  };
  
  /**
   * Endpoint para verificar si un cliente existe por cédula, email o teléfono
   */
  app.post('/api/shipping/check-customer', 
    cors(corsOptions),
    validateBody(customerCheckSchema),
    async (req: Request, res: Response) => {
      try {
        const { query, type } = req.body;
        let whereClause;
        
        // Construir la consulta según el tipo de búsqueda
        switch (type) {
          case 'identification':
            whereClause = or(
              eq(customers.idNumber, query),
              eq(customers.ruc, query)  // Usamos ruc en lugar de taxId ya que así está definido en el esquema
            );
            break;
          case 'email':
            whereClause = eq(customers.email, query);
            break;
          case 'phone':
            whereClause = or(...createPhoneQueries(query));
            break;
          default:
            return res.status(400).json({ error: 'Tipo de búsqueda no válido' });
        }
        
        // Buscar cliente
        const customer = await db.query.customers.findFirst({
          where: whereClause
        });
        
        if (customer) {
          // Asegurar que firstName y lastName estén definidos
          const firstName = customer.firstName || customer.name.split(' ')[0] || '';
          const lastName = customer.lastName || customer.name.split(' ').slice(1).join(' ') || '';
          
          res.json({
            found: true,
            customer: {
              id: customer.id,
              name: customer.name,
              firstName: firstName,
              lastName: lastName,
              email: customer.email,
              phone: customer.phone,
              idNumber: customer.idNumber
            }
          });
        } else {
          res.json({ found: false });
        }
      } catch (error) {
        console.error('Error al verificar cliente:', error);
        res.status(500).json({ error: 'Error al verificar cliente' });
      }
    });
  
  /**
   * Guarda los datos del formulario de envío en el CRM sin generar PDF inmediatamente
   * Este endpoint acepta solicitudes CORS para integrarse con el sitio web de Civetta
   */
  app.post('/api/shipping/save-data',
    cors(corsOptions),
    validateBody(shippingFormSchema),
    async (req: Request, res: Response) => {
      // Forzar el tipo de contenido a JSON
      res.setHeader('Content-Type', 'application/json');
      try {
        const formData: ShippingFormData = req.body;
        let customerId: number | undefined;
        let orderId: number | undefined;
        
        // Extraer firstName y lastName del nombre o usar los campos directos si están disponibles
        const firstName = formData.firstName || formData.name.split(' ')[0] || '';
        const lastName = formData.lastName || formData.name.split(' ').slice(1).join(' ') || '';
        
        // Asegurar que name sea consistente con firstName y lastName
        const fullName = `${firstName} ${lastName}`.trim();
        
        // Verificar si el cliente ya existe (por teléfono o cédula)
        let customer = null;
        if (formData.idNumber) {
          customer = await db.query.customers.findFirst({
            where: eq(customers.idNumber, formData.idNumber)
          });
        }
        
        if (!customer && formData.phone) {
          customer = await db.query.customers.findFirst({
            where: or(...createPhoneQueries(formData.phone))
          });
        }
        
        if (!customer && formData.email) {
          customer = await db.query.customers.findFirst({
            where: eq(customers.email, formData.email)
          });
        }
        
        // Si el cliente existe, usarlo; si no, crear uno nuevo
        if (customer) {
          customerId = customer.id;
          
          // Actualizar sus datos si es necesario
          if (formData.saveCustomer !== false) {
            console.log(`[FIXED-SHIPPING] Actualizando cliente con nombre: "${fullName}" (firstName: "${firstName}", lastName: "${lastName}")`);
            
            await db
              .update(customers)
              .set({
                name: fullName,
                firstName: firstName,
                lastName: lastName,
                phone: formData.phone,
                email: formData.email || customer.email,
                street: formData.street || customer.street,
                city: formData.city || customer.city,
                province: formData.province || customer.province,
                updatedAt: new Date()
              })
              .where(eq(customers.id, customer.id));
          }
        } else if (formData.saveCustomer !== false) {
          // Crear nuevo cliente con firstName y lastName
          console.log(`[FIXED-SHIPPING] Creando cliente con nombre: "${fullName}" (firstName: "${firstName}", lastName: "${lastName}")`);
          
          const insertedCustomer = await db
            .insert(customers)
            .values({
              name: fullName,
              firstName: firstName,
              lastName: lastName,
              phone: formData.phone,
              email: formData.email || null,
              idNumber: formData.idNumber || null,
              street: formData.street,
              city: formData.city,
              province: formData.province,
              createdAt: new Date(),
              updatedAt: new Date()
            })
            .returning({ id: customers.id });
            
          customerId = insertedCustomer[0]?.id;
        }
        
        // Si tenemos un cliente, crear una orden pendiente
        if (customerId) {
          // Crear objeto con los datos de envío
          const shippingInfo = {
              name: fullName, // Usar el nombre normalizado
              firstName: firstName,
              lastName: lastName,
              phone: formData.phone,
              street: formData.street,
              city: formData.city,
              province: formData.province,
              instructions: formData.deliveryInstructions || ''
          };
          
          // Generar un número de orden
          const orderPrefix = 'SHIP-';
          const orderNumber = orderPrefix + Date.now().toString().slice(-6);
          
          // Crear la orden pendiente
          const insertedOrder = await db
            .insert(orders)
            .values({
              customerId: customerId,
              orderNumber: orderNumber,
              totalAmount: "0.00", // Se deberá actualizar cuando se complete la orden
              subtotal: "0.00",
              status: orderStatusEnum.NEW,
              paymentStatus: paymentStatusEnum.PENDING,
              paymentMethod: paymentMethodEnum.OTHER, // Campo requerido para evitar nulos
              source: sourceEnum.WEBSITE,
              isFromWebForm: true,
              shippingAddress: shippingInfo,
              brand: brandEnum.SLEEPWEAR, // Asignar una marca por defecto
              shippingMethod: "Por determinar", // Campo adicional requerido
              notes: "Orden creada desde formulario de envío - Pendiente completar detalles",
              createdAt: new Date(),
              updatedAt: new Date()
            })
            .returning({ id: orders.id });
            
          orderId = insertedOrder[0]?.id;
          
          if (orderId) {
            // Emitir evento de creación de orden
            appEvents.emit(EventTypes.ORDER_CREATED, { 
              id: orderId,
              customerId,
              orderNumber,
              status: orderStatusEnum.NEW,
              paymentStatus: paymentStatusEnum.PENDING,
              source: sourceEnum.WEBSITE
            });
          }
        }
        
        return res.json({
          success: true,
          message: "Datos guardados correctamente",
          customerId,
          orderId
        });
      } catch (error) {
        console.error('Error al guardar datos de envío:', error);
        res.status(500).json({ 
          error: 'Error al guardar los datos de envío',
          details: error instanceof Error ? error.message : 'Error desconocido'
        });
      }
    });
    
  /**
   * Endpoint para guardar los datos de envío sin generar PDF
   * y crear una orden pendiente en el sistema
   */
  app.post('/api/shipping/submit-data',
    cors(corsOptions),
    validateBody(shippingFormSchema),
    async (req: Request, res: Response) => {
      // Forzar el tipo de contenido a JSON
      res.setHeader('Content-Type', 'application/json');
      try {
        const formData: ShippingFormData = req.body;
        let customerId: number | undefined;
        let orderId: number | undefined;
        
        // Extraer firstName y lastName del nombre o usar los campos directos si están disponibles
        const firstName = formData.firstName || formData.name.split(' ')[0] || '';
        const lastName = formData.lastName || formData.name.split(' ').slice(1).join(' ') || '';
        
        // Asegurar que name sea consistente con firstName y lastName
        const fullName = `${firstName} ${lastName}`.trim();
        
        // Verificar si el cliente ya existe (por teléfono, cédula o email)
        let customer = null;
        if (formData.idNumber) {
          customer = await db.query.customers.findFirst({
            where: eq(customers.idNumber, formData.idNumber)
          });
        }
        
        if (!customer && formData.phone) {
          customer = await db.query.customers.findFirst({
            where: or(...createPhoneQueries(formData.phone))
          });
        }
        
        if (!customer && formData.email) {
          customer = await db.query.customers.findFirst({
            where: eq(customers.email, formData.email)
          });
        }
        
        // Si el cliente existe, usarlo; si no, crear uno nuevo
        if (customer) {
          customerId = customer.id;
          
          // Actualizar sus datos si es necesario
          if (formData.saveCustomer !== false) {
            console.log(`[FIXED-SHIPPING] Actualizando cliente con nombre: "${fullName}" (firstName: "${firstName}", lastName: "${lastName}")`);
            
            await db
              .update(customers)
              .set({
                name: fullName,
                firstName: firstName,
                lastName: lastName,
                phone: formData.phone,
                email: formData.email || customer.email,
                street: formData.street || customer.street,
                city: formData.city || customer.city,
                province: formData.province || customer.province,
                updatedAt: new Date()
              })
              .where(eq(customers.id, customer.id));
          }
        } else if (formData.saveCustomer !== false) {
          // Crear nuevo cliente con firstName y lastName
          console.log(`[FIXED-SHIPPING] Creando cliente con nombre: "${fullName}" (firstName: "${firstName}", lastName: "${lastName}")`);
          
          const insertedCustomer = await db
            .insert(customers)
            .values({
              name: fullName,
              firstName: firstName,
              lastName: lastName,
              phone: formData.phone,
              email: formData.email || null,
              idNumber: formData.idNumber || null,
              street: formData.street,
              city: formData.city,
              province: formData.province,
              createdAt: new Date(),
              updatedAt: new Date()
            })
            .returning({ id: customers.id });
            
          customerId = insertedCustomer[0]?.id;
        }
        
        // Si tenemos un cliente, crear una orden pendiente
        if (customerId) {
          // Crear objeto con los datos de envío
          const shippingInfo = {
              name: fullName, // Usar el nombre normalizado
              firstName: firstName,
              lastName: lastName,
              phone: formData.phone,
              street: formData.street,
              city: formData.city,
              province: formData.province,
              instructions: formData.deliveryInstructions || ''
          };
          
          // Generar un número de orden
          const orderPrefix = 'SHIP-';
          const orderNumber = orderPrefix + Date.now().toString().slice(-6);
          
          // Crear la orden pendiente
          const insertedOrder = await db
            .insert(orders)
            .values({
              customerId: customerId,
              orderNumber: orderNumber,
              totalAmount: "0.00", // Se deberá actualizar cuando se complete la orden
              subtotal: "0.00",
              status: orderStatusEnum.NEW,
              paymentStatus: paymentStatusEnum.PENDING,
              paymentMethod: paymentMethodEnum.OTHER, // Campo requerido para evitar nulos
              source: sourceEnum.WEBSITE,
              isFromWebForm: true,
              shippingAddress: shippingInfo,
              brand: brandEnum.SLEEPWEAR, // Asignar una marca por defecto
              shippingMethod: "Por determinar", // Campo adicional requerido
              notes: "Orden creada desde formulario de envío - Pendiente completar detalles",
              createdAt: new Date(),
              updatedAt: new Date()
            })
            .returning({ id: orders.id });
            
          orderId = insertedOrder[0]?.id;
          
          if (orderId) {
            // Emitir evento de creación de orden
            appEvents.emit(EventTypes.ORDER_CREATED, { 
              id: orderId,
              customerId,
              orderNumber,
              status: orderStatusEnum.NEW,
              paymentStatus: paymentStatusEnum.PENDING,
              source: sourceEnum.WEBSITE
            });
          }
        }
        
        return res.json({
          success: true,
          message: "Datos guardados correctamente y orden creada",
          customerId,
          orderId
        });
      } catch (error) {
        console.error('Error al procesar formulario de envío:', error);
        res.status(500).json({ 
          error: 'Error al procesar el formulario de envío',
          details: error instanceof Error ? error.message : 'Error desconocido'
        });
      }
    });
    
  /**
   * Endpoint original que genera el PDF inmediatamente (se mantiene para compatibilidad)
   */
  app.post('/api/shipping/generate-label',
    cors(corsOptions),
    validateBody(shippingFormSchema),
    async (req: Request, res: Response) => {
      try {
        const formData: ShippingFormData = req.body;
        let customerId: number | undefined;
        let orderId: number | undefined;
        
        // Extraer firstName y lastName del nombre o usar los campos directos si están disponibles
        const firstName = formData.firstName || formData.name.split(' ')[0] || '';
        const lastName = formData.lastName || formData.name.split(' ').slice(1).join(' ') || '';
        
        // Asegurar que name sea consistente con firstName y lastName
        const fullName = `${firstName} ${lastName}`.trim();
        
        // Verificar si el cliente ya existe
        let customer = null;
        if (formData.idNumber) {
          customer = await db.query.customers.findFirst({
            where: eq(customers.idNumber, formData.idNumber)
          });
        }
        
        if (!customer && formData.phone) {
          customer = await db.query.customers.findFirst({
            where: or(...createPhoneQueries(formData.phone))
          });
        }
        
        if (!customer && formData.email) {
          customer = await db.query.customers.findFirst({
            where: eq(customers.email, formData.email)
          });
        }
        
        // Si el cliente existe, usarlo; si no, crear uno nuevo
        if (customer) {
          customerId = customer.id;
          
          // Actualizar los datos del cliente si es necesario
          if (formData.saveCustomer !== false) {
            console.log(`[FIXED-SHIPPING] Actualizando cliente con nombre: "${fullName}" (firstName: "${firstName}", lastName: "${lastName}")`);
            
            await db
              .update(customers)
              .set({
                name: fullName,
                firstName: firstName,
                lastName: lastName,
                phone: formData.phone,
                email: formData.email || customer.email,
                street: formData.street || customer.street,
                city: formData.city || customer.city,
                province: formData.province || customer.province,
                updatedAt: new Date()
              })
              .where(eq(customers.id, customer.id));
          }
        } else if (formData.saveCustomer !== false) {
          // Crear nuevo cliente con firstName y lastName
          console.log(`[FIXED-SHIPPING] Creando cliente con nombre: "${fullName}" (firstName: "${firstName}", lastName: "${lastName}")`);
          
          const insertedCustomer = await db
            .insert(customers)
            .values({
              name: fullName,
              firstName: firstName,
              lastName: lastName,
              phone: formData.phone,
              email: formData.email || null,
              idNumber: formData.idNumber || null,
              street: formData.street,
              city: formData.city,
              province: formData.province,
              createdAt: new Date(),
              updatedAt: new Date()
            })
            .returning({ id: customers.id });
            
          customerId = insertedCustomer[0]?.id;
        }
        
        // Generar un número de orden para la etiqueta
        const orderPrefix = 'FORM-';
        const formOrderNumber = orderPrefix + Date.now().toString().slice(-6);
        
        // Preparar datos para el PDF
        const pdfData = {
          name: fullName, // Usar el nombre normalizado
          phone: formData.phone || 'N/A',
          street: formData.street,
          city: formData.city,
          province: formData.province,
          idNumber: formData.idNumber || 'N/A',
          deliveryInstructions: formData.deliveryInstructions || 'N/A',
          companyName: formData.companyName || '',
          orderNumber: formOrderNumber
        };
        
        // Generar el PDF
        const pdfBuffer = await generateShippingLabelPdf(pdfData);
        
        // Si tenemos un cliente, crear una orden pendiente
        if (customerId) {
          // Crear objeto con los datos de envío
          const shippingInfo = {
              name: fullName, // Usar el nombre normalizado
              firstName: firstName,
              lastName: lastName,
              phone: formData.phone,
              street: formData.street,
              city: formData.city,
              province: formData.province,
              instructions: formData.deliveryInstructions || ''
          };
          
          // Generar un número de orden
          const orderPrefix = 'SHIP-';
          const orderNumber = orderPrefix + Date.now().toString().slice(-6);
          
          // Crear la orden pendiente
          const insertedOrder = await db
            .insert(orders)
            .values({
              customerId: customerId,
              orderNumber: orderNumber,
              totalAmount: "0.00", // Se deberá actualizar cuando se complete la orden
              subtotal: "0.00",
              status: orderStatusEnum.NEW,
              paymentStatus: paymentStatusEnum.PENDING,
              paymentMethod: paymentMethodEnum.OTHER, // Campo requerido para evitar nulos
              source: sourceEnum.WEBSITE,
              isFromWebForm: true,
              shippingAddress: shippingInfo,
              brand: brandEnum.SLEEPWEAR, // Asignar una marca por defecto
              shippingMethod: "Por determinar", // Campo adicional requerido
              notes: "Orden creada desde formulario de envío - Pendiente completar detalles",
              createdAt: new Date(),
              updatedAt: new Date()
            })
            .returning({ id: orders.id });
            
          orderId = insertedOrder[0]?.id;
          
          if (orderId) {
            // Emitir evento de creación de orden
            appEvents.emit(EventTypes.ORDER_CREATED, { 
              id: orderId,
              customerId,
              orderNumber,
              status: orderStatusEnum.NEW,
              paymentStatus: paymentStatusEnum.PENDING,
              source: sourceEnum.WEBSITE
            });
          }
        }
        
        // Enviar el PDF como respuesta
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="etiqueta-${formOrderNumber}.pdf"`);
        res.send(pdfBuffer);
        
      } catch (error) {
        console.error('Error al generar etiqueta de envío:', error);
        res.status(500).json({ 
          error: 'Error al generar la etiqueta de envío',
          details: error instanceof Error ? error.message : 'Error desconocido'
        });
      }
    });
  
  /**
   * Endpoint para que el personal genere etiquetas de envío para órdenes existentes
   * siempre usando los datos actualizados del cliente
   */
  app.get('/api/shipping/generate-label-internal/:orderId', async (req: Request, res: Response) => {
    try {
      const orderId = parseInt(req.params.orderId);
      
      if (isNaN(orderId)) {
        return res.status(400).json({ error: 'ID de orden inválido' });
      }
      
      // Buscar la orden junto con los datos del cliente
      const order = await db.query.orders.findFirst({
        where: eq(orders.id, orderId),
        with: {
          customer: true
        }
      });
      
      if (!order) {
        return res.status(404).json({ error: 'Orden no encontrada' });
      }
      
      if (!order.customer) {
        return res.status(404).json({ error: 'Cliente no encontrado para esta orden' });
      }
      
      // Extraer firstName y lastName para asegurar consistencia
      const customer = order.customer;
      const firstName = customer.firstName || customer.name.split(' ')[0] || '';
      const lastName = customer.lastName || customer.name.split(' ').slice(1).join(' ') || '';
      const fullName = `${firstName} ${lastName}`.trim();
      
      // Usar la dirección de envío de la orden si existe, o los datos del cliente
      const shippingAddress = order.shippingAddress ? order.shippingAddress : {
        name: fullName,
        firstName: firstName,
        lastName: lastName,
        phone: customer.phone || '',
        street: customer.street || '',
        city: customer.city || '',
        province: customer.province || '',
        instructions: ''
      };
      
      // Preparar datos para el PDF
      const pdfData = {
        name: shippingAddress.name || fullName,
        phone: shippingAddress.phone || customer.phone || 'N/A',
        street: shippingAddress.street || customer.street || 'N/A',
        city: shippingAddress.city || customer.city || 'N/A',
        province: shippingAddress.province || customer.province || 'N/A',
        idNumber: customer.idNumber || 'N/A',
        deliveryInstructions: shippingAddress.instructions || 'N/A',
        companyName: customer.companyName || '',
        orderNumber: order.orderNumber
      };
      
      // Generar el PDF
      const pdfBuffer = await generateShippingLabelPdf(pdfData);
      
      // Enviar el PDF como respuesta
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="etiqueta-${order.orderNumber}.pdf"`);
      res.send(pdfBuffer);
      
    } catch (error) {
      console.error('Error al generar etiqueta interna:', error);
      res.status(500).json({ 
        error: 'Error al generar la etiqueta',
        details: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  });
}