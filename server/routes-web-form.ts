/**
 * Rutas para el formulario web de envío
 * Este módulo gestiona:
 * 1. Guardar la información de un cliente desde el formulario web
 * 2. Crear una nueva orden siempre
 * 3. Validar los datos y proporcionar respuestas claras al frontend
 */

import { Express, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { customers, orders, orderStatusEnum, paymentStatusEnum, sourceEnum, brandEnum } from '../db/schema';
import { eq, or } from 'drizzle-orm';
import cors from 'cors';
import { validateBody } from './validation';
import { ordersService } from './services/orders.service';

/**
 * Función para crear consultas de búsqueda por teléfono
 * Maneja diferentes formatos de teléfono (con/sin prefijo, solo dígitos finales)
 */
function createPhoneQueries(phoneNumber: string) {
  const queries = [];
  const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');

  // Búsqueda exacta
  queries.push(eq(customers.phone, phoneNumber));

  // Búsqueda con comodín al inicio para encontrar coincidencias parciales
  if (cleanPhone.length > 6) {
    const lastDigits = cleanPhone.slice(-7);
    queries.push(eq(customers.phone, `%${lastDigits}`));
  }

  return queries;
}

// Validación del formulario web
export const webFormSchema = z.object({
  firstName: z.string().min(2, "El nombre es obligatorio"),
  lastName: z.string().min(2, "El apellido es obligatorio"),
  email: z.string().email("Email inválido").optional().nullish(),
  phoneNumber: z.string().min(7, "El teléfono es obligatorio"),
  document: z.string().min(5, "El documento de identidad es obligatorio"),
  address: z.string().min(3, "La dirección es obligatoria"),
  city: z.string().min(2, "La ciudad es obligatoria"),
  province: z.string().min(2, "La provincia es obligatoria"),
  instructions: z.string().optional()
});

type WebFormData = z.infer<typeof webFormSchema>;

/**
 * Registra las rutas para el formulario web de envío
 */
export function registerWebFormRoutes(app: Express) {
  // Configuración CORS para permitir acceso desde sitios WordPress
  const corsOptions = {
    origin: '*', // Permitir cualquier origen para facilitar la integración
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
  };

  /**
   * Endpoint para guardar los datos del formulario web de envío
   * Actualiza al cliente si ya existe y crea una nueva orden siempre
   */
  app.post('/api/guardar-formulario-envio',
    cors(corsOptions),
    validateBody(webFormSchema),
    async (req: Request, res: Response) => {
      try {
        const formData: WebFormData = req.body;
        console.log('📩 Datos recibidos del formulario web:', JSON.stringify(req.body, null, 2));
        
        // Verificar si el cliente ya existe (por documento, teléfono o email)
        const existingCustomer = await db.query.customers.findFirst({
          where: or(
            eq(customers.idNumber, formData.document),
            eq(customers.email, formData.email),
            or(...createPhoneQueries(formData.phoneNumber))
          )
        });

        let customerId;

        if (existingCustomer) {
          console.log(`Cliente existente encontrado (ID: ${existingCustomer.id}). Actualizando datos...`);
          
          // Actualizar al cliente existente
          const [updatedCustomer] = await db.update(customers)
            .set({
              firstName: formData.firstName,
              lastName: formData.lastName,
              name: `${formData.firstName} ${formData.lastName}`,
              email: formData.email || existingCustomer.email,
              phone: formData.phoneNumber,
              idNumber: formData.document,
              street: formData.address,
              city: formData.city,
              province: formData.province,
              deliveryInstructions: formData.instructions || null,
              updatedAt: new Date()
            })
            .where(eq(customers.id, existingCustomer.id))
            .returning();
          
          customerId = updatedCustomer.id;
          console.log(`Cliente actualizado con éxito (ID: ${customerId})`);
        } else {
          console.log('Cliente no encontrado. Creando nuevo cliente...');
          
          // Crear un nuevo cliente
          const [newCustomer] = await db.insert(customers)
            .values({
              firstName: formData.firstName,
              lastName: formData.lastName,
              name: `${formData.firstName} ${formData.lastName}`,
              email: formData.email || null,
              phone: formData.phoneNumber,
              idNumber: formData.document,
              street: formData.address,
              city: formData.city,
              province: formData.province,
              deliveryInstructions: formData.instructions || null,
              source: 'web_form',
              type: 'person',
              status: 'active',
              createdAt: new Date(),
              updatedAt: new Date()
            })
            .returning();
          
          customerId = newCustomer.id;
          console.log(`Nuevo cliente creado con éxito (ID: ${customerId})`);
        }

        // Siempre crear una nueva orden
        try {
          console.log(`Creando nueva orden para el cliente ID: ${customerId}`);
          
          const newOrder = await ordersService.createOrderFromShippingForm({
            customerId,
            customerName: `${formData.firstName} ${formData.lastName}`,
            source: sourceEnum.WEBSITE,
            status: 'nuevo',
            paymentStatus: 'pendiente',
            brand: brandEnum.SLEEPWEAR,
            isFromWebForm: true
          });

          if (!newOrder || !newOrder.id) {
            throw new Error('No se pudo crear la orden');
          }

          // Generar número de orden si no existe
          if (!newOrder.orderNumber) {
            await db.update(orders)
              .set({
                orderNumber: `WEB-${newOrder.id.toString().padStart(6, '0')}`,
                updatedAt: new Date()
              })
              .where(eq(orders.id, newOrder.id));
          }

          console.log(`Orden creada con éxito (ID: ${newOrder.id})`);

          return res.status(200).json({
            success: true,
            message: '¡Gracias! Hemos recibido tu información correctamente.',
            orderId: newOrder.id
          });
        } catch (orderError) {
          console.error('Error al crear la orden:', orderError);
          return res.status(500).json({
            success: false,
            message: 'Ocurrió un error al guardar tu información. Inténtalo nuevamente.',
            error: orderError instanceof Error ? orderError.message : 'Error desconocido'
          });
        }
      } catch (error) {
        console.error('Error al procesar el formulario web:', error);
        return res.status(500).json({
          success: false,
          message: 'Ocurrió un error al guardar tu información. Inténtalo nuevamente.',
          error: error instanceof Error ? error.message : 'Error desconocido'
        });
      }
    });
}