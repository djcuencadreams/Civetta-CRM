/**
 * Rutas mejoradas para el manejo de etiquetas de envío
 * Este módulo gestiona:
 * 1. Verificación de clientes existentes por cédula, email o teléfono
 * 2. Guardar la información de envío en el perfil del cliente
 * 3. Generación de etiquetas basadas en los datos actualizados del cliente
 * 4. Integración con sitios externos vía CORS
 */

import { Express, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { customers, orders, orderStatusEnum, paymentStatusEnum, sourceEnum, paymentMethodEnum, brandEnum } from '../db/schema';
import { eq, or, and, like, ilike } from 'drizzle-orm';
import cors from 'cors';
import { appEvents, EventTypes } from './lib/event-emitter';
import { generateShippingLabelPdf } from './lib/shipping-label.service';
import { validateBody } from './validation';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { ordersService } from './services/orders.service';

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
  phone: z.string().min(7, "El teléfono es obligatorio"),
  street: z.string().min(3, "La dirección es obligatoria"),
  city: z.string().min(2, "La ciudad es obligatoria"),
  province: z.string().min(2, "La provincia es obligatoria"),
  companyName: z.string().optional(),
  idNumber: z.string().optional(),
  deliveryInstructions: z.string().optional(),
  email: z.string().email("Email inválido").optional().nullish(),
  saveCustomer: z.boolean().optional().default(true),
  updateCustomerInfo: z.boolean().optional().default(true), // Actualizar información del cliente
  alwaysUpdateCustomer: z.boolean().optional().default(false) // Forzar actualización aunque no haya cambios
});

// Validación para la búsqueda de clientes
export const customerCheckSchema = z.object({
  query: z.string().min(4, "Ingrese al menos 4 caracteres para buscar"),
  type: z.enum(["identification", "email", "phone"])
});

type ShippingFormData = z.infer<typeof shippingFormSchema>;
type CustomerCheckData = z.infer<typeof customerCheckSchema>;

/**
 * Registra las rutas mejoradas para el manejo de etiquetas de envío
 * que almacenan la información en la ficha del cliente
 * 
 * @param app Aplicación Express
 */
export function registerImprovedShippingRoutes(app: Express) {
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
            whereClause = eq(customers.idNumber, query); // Usamos el nombre definido en el esquema Drizzle
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

        // Construir la consulta SQL para debugging - incluimos explícitamente todos los campos relevantes
        const sqlQuery = `
          SELECT id, name, email, phone, id_number, 
                 street, city, province, delivery_instructions,
                 created_at, updated_at
          FROM customers 
          WHERE ${type === 'identification' ? 'id_number' : 
                 type === 'email' ? 'email' : 
                 'phone'} = $1 
          LIMIT 1`;
        
        console.log('[SHIPPING-DEBUG] Ejecutando consulta SQL:', sqlQuery, 'con parámetro:', query);
        
        // Buscar cliente directamente en la base de datos para obtener todos los campos
        const result = await db.$client.query(sqlQuery, [query]);
        
        if (result.rows.length > 0) {
          const dbCustomer = result.rows[0];
          console.log('[SHIPPING-DEBUG] Cliente encontrado en base de datos (SQL directo):', dbCustomer);
          
          // Verificar explícitamente los campos de dirección
          console.log('[SHIPPING-DEBUG] Datos de dirección disponibles:',
            'street:', dbCustomer.street ? 'SI' : 'NO',
            'city:', dbCustomer.city ? 'SI' : 'NO',
            'province:', dbCustomer.province ? 'SI' : 'NO',
            'delivery_instructions:', dbCustomer.delivery_instructions ? 'SI' : 'NO'
          );
          
          // Convertir de snake_case (DB) a camelCase (API)
          console.log('[SHIPPING-DEBUG] Datos completos del cliente encontrado:', JSON.stringify(dbCustomer, null, 2));
          
          // Construir el objeto de respuesta manteniendo todos los campos
          const responseCustomer = {
            id: dbCustomer.id,
            name: dbCustomer.name,
            email: dbCustomer.email,
            phone: dbCustomer.phone,
            idNumber: dbCustomer.id_number,
            
            // Incluir explícitamente la información de dirección con valores por defecto en caso de null
            street: dbCustomer.street || '',
            city: dbCustomer.city || '',
            province: dbCustomer.province || '',
            deliveryInstructions: dbCustomer.delivery_instructions || ''
          };
          
          console.log('[SHIPPING-DEBUG] Respuesta preparada para el cliente:', JSON.stringify(responseCustomer, null, 2));
          
          // Respuesta como JSON completa
          return res.json({
            found: true,
            customer: responseCustomer
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
   * Endpoint para guardar los datos del formulario de envío sin generar PDF
   * Guarda o actualiza los datos del cliente y crea una orden pendiente
   */
  app.post('/api/shipping/save-data',
    cors(corsOptions),
    validateBody(shippingFormSchema),
    async (req: Request, res: Response) => {
      try {
        const formData: ShippingFormData = req.body;
        let customerId: number | undefined;
        let orderId: number | undefined;

        // Verificar si el cliente ya existe (por teléfono, cédula o email)
        let customer = null;
        const searchQueries = [];

        if (formData.idNumber) {
          searchQueries.push(eq(customers.idNumber, formData.idNumber));
        }

        if (formData.phone) {
          const phoneQueries = createPhoneQueries(formData.phone);
          searchQueries.push(...phoneQueries);
        }

        if (formData.email) {
          searchQueries.push(eq(customers.email, formData.email));
        }

        if (searchQueries.length > 0) {
          customer = await db.query.customers.findFirst({
            where: or(...searchQueries)
          });
        }

        // Si no se encontró el cliente, crear uno nuevo
        if (!customer) {
          const [newCustomer] = await db.insert(customers)
            .values({
              name: formData.name,
              firstName: formData.name.split(' ')[0],
              lastName: formData.name.split(' ').slice(1).join(' '),
              email: formData.email || null,
              phone: formData.phone,
              idNumber: formData.idNumber || null,
              street: formData.street,
              city: formData.city,
              province: formData.province,
              deliveryInstructions: formData.deliveryInstructions || null,
              source: 'web_form',
              type: 'person',
              status: 'active',
              createdAt: new Date(),
              updatedAt: new Date()
            })
            .returning();

          customer = newCustomer;
          console.log('Nuevo cliente creado con ID:', newCustomer.id);
        } 
        // Si se encontró el cliente, actualizar su información de dirección si se requiere
        else if (formData.updateCustomerInfo) {
          // Solo actualizar si se requiere (campo updateCustomerInfo es true)
          // o si alwaysUpdateCustomer es true (forzar actualización)
          // o si el cliente no tiene alguno de los campos de dirección
          const shouldUpdate = formData.alwaysUpdateCustomer || 
                              !customer.street || 
                              !customer.city || 
                              !customer.province;
          
          if (shouldUpdate) {
            await db.update(customers)
              .set({
                street: formData.street,
                city: formData.city,
                province: formData.province,
                deliveryInstructions: formData.deliveryInstructions || customer.deliveryInstructions,
                // Actualizamos también los campos de contacto si el cliente no los tiene
                phone: customer.phone || formData.phone,
                email: customer.email || formData.email || null,
                updatedAt: new Date()
              })
              .where(eq(customers.id, customer.id));
            
            console.log(`Actualizada información de envío para cliente ID: ${customer.id}`);
          }
        }

        customerId = customer.id;

        // Si tenemos un cliente, crear una orden pendiente
        if (customerId) {
          // Crear una orden pendiente de completar
          try {
            const orderResult = await ordersService.createOrderFromShippingForm({
              customerId,
              customerName: formData.name,
              source: sourceEnum.WEBSITE,
              status: 'pendiente_de_completar', // Estado especial para órdenes web
              paymentStatus: 'pending'
            });

            orderId = orderResult.id;

            // Generar número de orden si no existe
            if (!orderResult.orderNumber) {
              await db.update(orders)
                .set({
                  orderNumber: `WEB-${orderResult.id.toString().padStart(6, '0')}`,
                  updatedAt: new Date()
                })
                .where(eq(orders.id, orderResult.id));
            }
          } catch (orderError) {
            console.error('Error al crear orden:', orderError);
            // Continuar el flujo aunque haya error en la creación de la orden
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
   * Endpoint que genera etiquetas de envío utilizando la información actualizada del cliente
   */
  app.post('/api/shipping/generate-label',
    cors(corsOptions),
    validateBody(shippingFormSchema),
    async (req: Request, res: Response) => {
      try {
        const formData: ShippingFormData = req.body;
        let customerId: number | undefined;
        let orderId: number | undefined;

        // Verificar si el cliente ya existe
        let customer = null;
        const searchQueries = [];

        if (formData.idNumber) {
          searchQueries.push(eq(customers.idNumber, formData.idNumber));
        }

        if (formData.phone) {
          const phoneQueries = createPhoneQueries(formData.phone);
          searchQueries.push(...phoneQueries);
        }

        if (formData.email) {
          searchQueries.push(eq(customers.email, formData.email));
        }

        if (searchQueries.length > 0) {
          customer = await db.query.customers.findFirst({
            where: or(...searchQueries)
          });
        }

        // Si no se encontró el cliente, crear uno nuevo
        if (!customer) {
          const [newCustomer] = await db.insert(customers)
            .values({
              name: formData.name,
              firstName: formData.name.split(' ')[0],
              lastName: formData.name.split(' ').slice(1).join(' '),
              email: formData.email || null,
              phone: formData.phone,
              idNumber: formData.idNumber || null,
              street: formData.street,
              city: formData.city,
              province: formData.province,
              deliveryInstructions: formData.deliveryInstructions || null,
              source: 'web_form',
              type: 'person',
              status: 'active',
              createdAt: new Date(),
              updatedAt: new Date()
            })
            .returning();

          customer = newCustomer;
          console.log('Nuevo cliente creado con ID:', newCustomer.id);
        } 
        // Si se encontró el cliente, actualizar su información de dirección si se requiere
        else if (formData.updateCustomerInfo) {
          const shouldUpdate = formData.alwaysUpdateCustomer || 
                              !customer.street || 
                              !customer.city || 
                              !customer.province;
          
          if (shouldUpdate) {
            await db.update(customers)
              .set({
                street: formData.street,
                city: formData.city,
                province: formData.province,
                deliveryInstructions: formData.deliveryInstructions || customer.deliveryInstructions,
                // Actualizamos también los campos de contacto si el cliente no los tiene
                phone: customer.phone || formData.phone,
                email: customer.email || formData.email || null,
                updatedAt: new Date()
              })
              .where(eq(customers.id, customer.id));
            
            // Refrescar los datos del cliente
            const updatedCustomer = await db.query.customers.findFirst({
              where: eq(customers.id, customer.id)
            });
            
            if (updatedCustomer) {
              customer = updatedCustomer;
              console.log(`Actualizada información de envío para cliente ID: ${customer.id}`);
            } else {
              console.error(`Error: No se pudo encontrar el cliente actualizado con ID: ${customer.id}`);
            }
          }
        }

        // Verificar que el cliente no sea nulo o indefinido
        if (!customer) {
          throw new Error('Error inesperado: El cliente no existe después de crear/actualizar');
        }
        
        customerId = customer.id;

        // Siempre usamos la información más reciente del cliente para generar el PDF
        // Esto garantiza que se usen siempre los datos actualizados
        const pdfData = {
          name: customer.name,
          phone: customer.phone || 'N/A',
          street: customer.street || 'Dirección no especificada',
          city: customer.city || 'Ciudad no especificada',
          province: customer.province || 'Provincia no especificada',
          idNumber: customer.idNumber || 'N/A',
          deliveryInstructions: customer.deliveryInstructions || '',
          companyName: formData.companyName || ''
        };

        // Generar el PDF con los datos del cliente
        const pdfBuffer = await generateShippingLabelPdf(pdfData);

        // Si tenemos un cliente, crear una orden pendiente
        if (customerId) {
          // Crear una orden pendiente de completar
          try {
            const orderResult = await ordersService.createOrderFromShippingForm({
              customerId,
              customerName: customer.name,
              source: sourceEnum.WEBSITE,
              status: 'pendiente_de_completar',
              paymentStatus: 'pending'
            });

            orderId = orderResult.id;

            // Generar número de orden si no existe
            if (!orderResult.orderNumber) {
              await db.update(orders)
                .set({
                  orderNumber: `WEB-${orderResult.id.toString().padStart(6, '0')}`,
                  updatedAt: new Date()
                })
                .where(eq(orders.id, orderResult.id));
            }
          } catch (orderError) {
            console.error('Error al crear orden:', orderError);
            // Continuar el flujo aunque haya error en la creación de la orden
          }
        }

        // Configurar cabeceras para enviar el PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=etiqueta-envio.pdf');

        // Enviar el PDF como respuesta
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
        console.error('[ETIQUETA] Error: ID de orden inválido:', req.params.orderId);
        return res.status(400).json({ error: 'ID de orden inválido' });
      }

      console.log('[ETIQUETA] Solicitando etiqueta para orden ID:', orderId);

      // Obtener la orden con datos del cliente
      const order = await db.query.orders.findFirst({
        where: eq(orders.id, orderId),
        with: {
          customer: true
        }
      });

      if (!order) {
        console.error('[ETIQUETA] Error: Orden no encontrada con ID:', orderId);
        return res.status(404).json({ error: 'Orden no encontrada' });
      }

      // Verificar que exista el cliente
      if (!order.customer) {
        console.error('[ETIQUETA] Error: Cliente no encontrado para orden ID:', orderId, 'customerId:', order.customerId);
        return res.status(404).json({ error: 'Cliente no encontrado para esta orden' });
      }

      console.log('[ETIQUETA] Orden encontrada:', { 
        id: order.id, 
        orderNumber: order.orderNumber,
        customerId: order.customerId,
        customerName: order.customer?.name
      });
      
      console.log('[ETIQUETA] Usando datos del cliente ID:', order.customer.id);

      // Crear número de orden formateado si no existe
      const formattedOrderNumber = 
        order.orderNumber || 
        `ORD-${order.id.toString().padStart(6, '0')}`;

      // Preparar datos para el PDF directamente desde los datos del cliente
      const pdfData = {
        name: order.customer.name,
        phone: order.customer.phone || 'No disponible',
        street: order.customer.street || 'Dirección no especificada',
        city: order.customer.city || 'Ciudad no especificada',
        province: order.customer.province || 'Provincia no especificada',
        idNumber: order.customer.idNumber || 'N/A',
        // Instrucciones especiales tomadas directamente de la ficha del cliente
        deliveryInstructions: order.customer.deliveryInstructions || 'Sin instrucciones especiales',
        orderNumber: formattedOrderNumber,
        companyName: order.customer.type === 'company' ? order.customer.name : ''
      };

      console.log('[ETIQUETA] Datos preparados para generar PDF:', pdfData);

      // Generar el PDF incluso con datos incompletos
      const pdfBuffer = await generateShippingLabelPdf(pdfData);

      console.log('[ETIQUETA] PDF generado correctamente, tamaño:', pdfBuffer.length, 'bytes');

      if (!pdfBuffer || pdfBuffer.length < 100) {
        console.error('[ETIQUETA] Error: El PDF generado es demasiado pequeño o está vacío');
        return res.status(500).json({ 
          error: 'Error al generar la etiqueta de envío: PDF inválido'
        });
      }

      // Configurar cabeceras para enviar el PDF
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=etiqueta-envio-${formattedOrderNumber}.pdf`);

      // Enviar el PDF como respuesta
      console.log('[ETIQUETA] Enviando PDF al cliente');
      res.send(pdfBuffer);
      console.log('[ETIQUETA] PDF enviado con éxito');
    } catch (error) {
      console.error('[ETIQUETA] Error al generar etiqueta interna:', error);

      // Determinar si el error está relacionado con la biblioteca jsPDF
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      const errorStack = error instanceof Error ? error.stack : '';

      if (errorStack && errorStack.includes('jspdf')) {
        console.error('[ETIQUETA] Error relacionado con jsPDF:', errorStack);
        return res.status(500).json({
          error: 'Error al generar el PDF con jsPDF',
          details: errorMessage,
          suggestion: 'Puede ser un problema con la biblioteca de generación de PDF'
        });
      }

      res.status(500).json({ 
        error: 'Error al generar la etiqueta de envío',
        details: errorMessage
      });
    }
  });

  console.log('[shipping-service-improved] Improved shipping routes registered');
}