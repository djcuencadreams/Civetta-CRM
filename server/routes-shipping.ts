/**
 * Rutas para el manejo de etiquetas de envío
 * Este módulo gestiona:
 * 1. Verificación de clientes existentes por cédula, email o teléfono
 * 2. Guardar formularios de envío con o sin generación de PDF
 * 3. Integración con sitios externos vía CORS
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
import { forceUpdateDeliveryInstructions } from './delivery-instructions-fix';
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
 * Registra las rutas para el manejo de etiquetas de envío
 * @param app Aplicación Express
 */
export function registerShippingRoutes(app: Express) {
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
            whereClause = eq(customers.idNumber, query);
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
          res.json({
            found: true,
            customer: {
              id: customer.id,
              name: customer.name,
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
   * Genera una etiqueta de envío y opcionalmente guarda el cliente en la base de datos
   * Este endpoint acepta solicitudes CORS para integrarse con el sitio web de Civetta
   */
  /**
   * Guarda los datos del formulario de envío en el CRM sin generar PDF inmediatamente
   * Este endpoint acepta solicitudes CORS para integrarse con el sitio web de Civetta
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
              source: 'web_form',
              type: 'person',
              status: 'active',
              createdAt: new Date(),
              updatedAt: new Date()
            })
            .returning();

          customer = newCustomer;
        }

        customerId = customer.id;

        // Si tenemos un cliente, crear una orden pendiente
        if (customerId) {
          // Crear objeto con los datos de envío
          const shippingInfo = {
              fullName: formData.name,
              phone: formData.phone,
              street: formData.street,
              city: formData.city,
              province: formData.province,
              instructions: formData.deliveryInstructions || '',
              idNumber: formData.idNumber || null,
              email: formData.email || null
          };

          // Crear una orden pendiente de completar
          try {
            const orderResult = await ordersService.createOrderFromShippingForm({
              customerId,
              customerName: formData.name,
              shippingAddress: shippingInfo,
              items: [],
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
   * Endpoint para guardar los datos de envío sin generar PDF
   * y crear una orden pendiente en el sistema
   */
  app.post('/api/shipping/submit-data',
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
              source: 'web_form',
              type: 'person',
              status: 'active',
              createdAt: new Date(),
              updatedAt: new Date()
            })
            .returning();

          customer = newCustomer;
        }

        customerId = customer.id;

        // Si tenemos un cliente, crear una orden pendiente
        if (customerId) {
          // Crear objeto con los datos de envío
          const shippingInfo = {
              fullName: formData.name,
              phone: formData.phone,
              street: formData.street,
              city: formData.city,
              province: formData.province,
              instructions: formData.deliveryInstructions || '',
              idNumber: formData.idNumber || null,
              email: formData.email || null
          };

          // Crear una orden pendiente de completar
          try {
            const orderResult = await ordersService.createOrderFromShippingForm({
              customerId,
              customerName: formData.name,
              shippingAddress: shippingInfo,
              items: [],
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
        // Si se encontró el cliente, actualizar siempre su información para mantener consistencia
        else {
          // Siempre actualizar los datos del cliente existente
          console.log(`Actualizando información para cliente ID: ${customer.id}`);
          console.log(`Instrucciones de entrega actuales: "${customer.deliveryInstructions}"`);
          console.log(`Instrucciones de entrega nuevas: "${formData.deliveryInstructions}"`);
          
          // Actualizamos TODOS los campos recibidos del formulario para mantener consistencia
          await db.update(customers)
            .set({
              firstName: formData.name.split(' ')[0] || customer.firstName,
              lastName: formData.name.split(' ').slice(1).join(' ') || customer.lastName,
              street: formData.street,
              city: formData.city,
              province: formData.province,
              phone: formData.phone,
              email: formData.email || customer.email || null,
              idNumber: formData.idNumber || customer.idNumber || null,
              updatedAt: new Date()
            })
            .where(eq(customers.id, customer.id));
          
          // Actualizar las instrucciones de entrega usando la función especializada
          console.log(`⚡️ ACTUALIZANDO INSTRUCCIONES DE ENTREGA - Cliente ID: ${customer.id}`);
          console.log(`⚡️ Valor a establecer: "${formData.deliveryInstructions}"`);
          const updateResult = await forceUpdateDeliveryInstructions(customer.id, formData.deliveryInstructions, true);
          console.log(`⚡️ Resultado de actualización de instrucciones: ${updateResult ? '✅ EXITOSO' : '❌ FALLIDO'}`);
          
          // Verificación adicional para asegurar que se reflejó el cambio
          const verificacionCliente = await db.query.customers.findFirst({
            where: eq(customers.id, customer.id),
            columns: { 
              id: true,
              firstName: true,
              lastName: true,
              name: true,
              street: true,
              city: true,
              province: true,
              phone: true,
              email: true,
              deliveryInstructions: true
            }
          });
          
          console.log(`⚡️ Verificación de datos actualizados:`, JSON.stringify(verificacionCliente, null, 2));
          console.log(`✅ Información de cliente actualizada, ID: ${customer.id}`);
          
          // Recargamos el objeto customer con los datos actualizados para usarlos más adelante
          customer = await db.query.customers.findFirst({
            where: eq(customers.id, customer.id)
          });
        }

        customerId = customer.id;

        // Recargar los datos del cliente para asegurarnos que estamos usando la información más actualizada
        const clienteActualizado = await db.query.customers.findFirst({
          where: eq(customers.id, customerId)
        });
        
        if (!clienteActualizado) {
          console.error('⚠️ Error: Cliente no encontrado después de actualización, ID:', customerId);
          return res.status(500).json({ error: 'Error interno: Cliente no encontrado después de actualización' });
        }
        
        console.log('✅ Cliente recargado con datos actualizados:', clienteActualizado.id, clienteActualizado.name);
        
        // Preparar datos para el PDF (usando los datos actualizados del cliente)
        const pdfData = {
          name: clienteActualizado.firstName && clienteActualizado.lastName 
            ? `${clienteActualizado.firstName} ${clienteActualizado.lastName}`
            : clienteActualizado.name,
          phone: clienteActualizado.phone || 'N/A',
          street: clienteActualizado.street || 'Sin dirección',
          city: clienteActualizado.city || 'Sin ciudad',
          province: clienteActualizado.province || 'Sin provincia',
          idNumber: clienteActualizado.idNumber || 'N/A',
          deliveryInstructions: clienteActualizado.deliveryInstructions || 'N/A',
          companyName: formData.companyName || ''
        };

        console.log('📄 Generando PDF con datos actualizados del cliente:', {
          nombre: pdfData.name,
          telefono: pdfData.phone,
          direccion: pdfData.street,
          ciudad: pdfData.city,
          provincia: pdfData.province,
          instrucciones: pdfData.deliveryInstructions
        });

        // Generar el PDF
        const pdfBuffer = await generateShippingLabelPdf(pdfData);

        // Siempre crear una nueva orden para registrar cada envío
        // Crear objeto con los datos de envío
        const shippingInfo = {
            fullName: clienteActualizado.name,
            firstName: clienteActualizado.firstName,
            lastName: clienteActualizado.lastName,
            phone: clienteActualizado.phone,
            street: clienteActualizado.street,
            city: clienteActualizado.city,
            province: clienteActualizado.province,
            instructions: clienteActualizado.deliveryInstructions || '',
            idNumber: clienteActualizado.idNumber || null,
            email: clienteActualizado.email || null
        };

        // Crear una orden nueva para cada envío
        try {
          console.log('🔄 Creando nueva orden para el cliente actualizado ID:', customerId);
          const orderResult = await ordersService.createOrderFromShippingForm({
            customerId,
            customerName: clienteActualizado.name,
            shippingAddress: shippingInfo,
            items: [],
            source: sourceEnum.WEBSITE,
            status: 'pendiente_de_completar', // Estado especial para órdenes web
            paymentStatus: 'pending',
            isFromWebForm: true, // Marcar explícitamente que viene del formulario web
            notes: "Orden creada desde formulario de envío - Pendiente completar detalles"
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
   * Servir el formulario HTML independiente para integrarlo en sitios externos
   * Se proporciona en múltiples rutas para mayor compatibilidad
   * 
   * IMPORTANTE: Esta función sirve el mismo archivo HTML en varias rutas
   * para garantizar consistencia en la integración con WordPress
   */
  const serveShippingForm = (req: Request, res: Response) => {
    try {
      const formPath = path.join(__dirname, '../templates/shipping/embed-form.html');
      res.setHeader('Content-Type', 'text/html');
      res.sendFile(formPath);
    } catch (error) {
      console.error('Error al servir formulario de envío:', error);
      res.status(500).send('Error al cargar el formulario de envío');
    }
  };

  // Rutas para el formulario de envío
  app.get('/shipping-form', cors(corsOptions), serveShippingForm);
  app.get('/shipping', cors(corsOptions), serveShippingForm);
  app.get('/etiqueta', cors(corsOptions), serveShippingForm);
  app.get('/etiqueta-de-envio', cors(corsOptions), serveShippingForm);
  app.get('/embed/shipping-form-static', cors(corsOptions), serveShippingForm);
  
  // Nota: La ruta /embed/shipping-form está manejada por el frontend React

  app.get('/wordpress-guide', cors(corsOptions), (req: Request, res: Response) => {
    try {
      const guidePath = path.join(__dirname, '../templates/shipping/wordpress-integration-guide.html');
      res.setHeader('Content-Type', 'text/html');
      res.sendFile(guidePath);
    } catch (error) {
      console.error('Error al servir guía de WordPress:', error);
      res.status(500).send('Error al cargar la guía de integración');
    }
  });

  app.get('/wordpress-examples-advanced', cors(corsOptions), (req: Request, res: Response) => {
    try {
      const examplesPath = path.join(__dirname, '../templates/shipping/wordpress-advanced-examples.html');
      res.setHeader('Content-Type', 'text/html');
      res.sendFile(examplesPath);
    } catch (error) {
      console.error('Error al servir ejemplos avanzados:', error);
      res.status(500).send('Error al cargar los ejemplos avanzados');
    }
  });

  /**
   * Endpoint para que el personal genere etiquetas de envío para órdenes existentes
   * Este endpoint no tiene CORS habilitado ya que es solo para uso interno del CRM
   */
  app.get('/api/shipping/generate-label-internal/:orderId', async (req: Request, res: Response) => {
    try {
      const orderId = parseInt(req.params.orderId);
      if (isNaN(orderId)) {
        console.error('[ETIQUETA] Error: ID de orden inválido:', req.params.orderId);
        return res.status(400).json({ error: 'ID de orden inválido' });
      }

      console.log('[ETIQUETA] Solicitando etiqueta para orden ID:', orderId);

      // Obtener la orden
      const order = await db.query.orders.findFirst({
        where: eq(orders.id, orderId)
      });

      if (!order) {
        console.error('[ETIQUETA] Error: Orden no encontrada con ID:', orderId);
        return res.status(404).json({ error: 'Orden no encontrada' });
      }

      console.log('[ETIQUETA] Orden encontrada ID:', orderId);
      
      // Obtener los datos actualizados del cliente directamente de la base de datos
      // en lugar de usar la relación en la orden para garantizar que siempre
      // tenemos la información más reciente
      const customer = await db.query.customers.findFirst({
        where: eq(customers.id, order.customerId)
      });

      // Verificar que exista el cliente
      if (!customer) {
        console.error('[ETIQUETA] Error: Cliente no encontrado para orden ID:', orderId, 'customerId:', order.customerId);
        return res.status(404).json({ error: 'Cliente no encontrado para esta orden' });
      }

      console.log('[ETIQUETA] Cliente encontrado:', { 
        id: customer.id, 
        name: customer.name, 
        firstName: customer.firstName,
        lastName: customer.lastName
      });
      
      console.log('[ETIQUETA] Usando datos actualizados del cliente ID:', customer.id);

      // Crear número de orden formateado si no existe
      const formattedOrderNumber = 
        order.orderNumber || 
        `ORD-${order.id.toString().padStart(6, '0')}`;
        
      // Obtener nombre completo formateado correctamente
      const fullName = customer.firstName && customer.lastName
        ? `${customer.firstName} ${customer.lastName}`
        : customer.name || '';

      // Preparar datos para el PDF usando los datos más actualizados del cliente
      const pdfData = {
        name: fullName || "Cliente #" + customer.id,
        phone: customer.phone || 'No disponible',
        street: customer.street || 'Dirección no especificada',
        city: customer.city || 'Ciudad no especificada',
        province: customer.province || 'Provincia no especificada',
        idNumber: customer.idNumber || 'N/A',
        // Instrucciones especiales tomadas directamente de la ficha del cliente
        deliveryInstructions: customer.deliveryInstructions || 'Sin instrucciones especiales',
        orderNumber: formattedOrderNumber,
        companyName: customer.type === 'company' ? customer.name || '' : ''
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

  // Servir el script de carga del formulario para WordPress
  app.get('/shipping-form-loader.js', cors(), (req: Request, res: Response) => {
    try {
      const loaderPath = path.join(__dirname, '../templates/shipping/shipping-form-loader.js');
      res.setHeader('Content-Type', 'application/javascript');
      res.sendFile(loaderPath);
    } catch (error) {
      console.error('Error al servir script de carga:', error);
      res.status(500).send('console.error("Error al cargar el script de formulario de envío");');
    }
  });

  console.log('[shipping-service] Shipping routes registered');
}