/**
 * Implementación oficial y limpia de las rutas para el formulario de envío React
 * Este archivo contiene la versión única y definitiva de las rutas del formulario de envío
 */

import { Express, Request, Response } from 'express';
import { db } from '@db';
import { customers, orders } from '@db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { validateBody } from './validation';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

// Esquema de validación para guardar datos del formulario
const shippingFormSchema = z.object({
  firstName: z.string().min(2, { message: "El nombre es requerido" }),
  lastName: z.string().min(2, { message: "El apellido es requerido" }),
  phoneNumber: z.string().min(7, { message: "Número de teléfono inválido" }),
  email: z.string().email({ message: "Email inválido" }),
  document: z.string().min(5, { message: "Documento de identificación inválido" }),
  address: z.string().min(5, { message: "Dirección inválida" }),
  city: z.string().min(2, { message: "Ciudad inválida" }),
  province: z.string().min(2, { message: "Provincia inválida" }),
  instructions: z.string().optional(),
});

type ShippingFormData = z.infer<typeof shippingFormSchema>;

// Opciones de CORS
const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

/**
 * Registrar las rutas necesarias para el formulario React
 */
export function registerReactShippingRoutes(app: Express) {
  // Endpoint para guardar el formulario de envío
  app.post('/api/guardar-formulario-envio',
    cors(corsOptions),
    validateBody(shippingFormSchema),
    async (req: Request, res: Response) => {
      try {
        const formData = req.body as ShippingFormData;
        console.log('📝 Guardando datos del formulario de envío:', formData);
        
        // Verificar si el cliente ya existe por documento, email o teléfono
        const existingCustomer = await db.query.customers.findFirst({
          where: or(
            eq(customers.idNumber, formData.document),
            eq(customers.email, formData.email),
            eq(customers.phone, formData.phoneNumber)
          ),
          columns: {
            id: true,
            name: true,
            email: true
          }
        });
        
        let customerId;
        let customerName;
        
        if (existingCustomer) {
          // Actualizar cliente existente
          customerId = existingCustomer.id;
          customerName = `${formData.firstName} ${formData.lastName}`;
          
          console.log(`✅ Actualizando cliente existente: ${customerId} (${existingCustomer.name})`);
          
          await db.update(customers)
            .set({
              name: customerName,
              firstName: formData.firstName,
              lastName: formData.lastName,
              email: formData.email,
              phone: formData.phoneNumber,
              idNumber: formData.document,
              street: formData.address,
              city: formData.city,
              province: formData.province,
              deliveryInstructions: formData.instructions || '',
              updatedAt: new Date()
            })
            .where(eq(customers.id, customerId));
          
          console.log(`✅ Cliente actualizado correctamente`);
        } else {
          // Crear nuevo cliente
          customerName = `${formData.firstName} ${formData.lastName}`;
          console.log(`🆕 Creando nuevo cliente: ${customerName}`);
          
          const insertResult = await db.insert(customers)
            .values({
              name: customerName,
              firstName: formData.firstName,
              lastName: formData.lastName,
              email: formData.email,
              phone: formData.phoneNumber,
              idNumber: formData.document,
              street: formData.address,
              city: formData.city,
              province: formData.province,
              deliveryInstructions: formData.instructions || '',
              source: 'web_form',
              status: 'active',
              type: 'person',
              createdAt: new Date(),
              updatedAt: new Date()
            })
            .returning({ id: customers.id });
          
          if (insertResult.length === 0) {
            throw new Error('Error al insertar el nuevo cliente');
          }
          
          customerId = insertResult[0].id;
          console.log(`✅ Nuevo cliente creado con ID: ${customerId}`);
        }
        
        // Crear una nueva orden pendiente
        const orderNumber = generateOrderNumber();
        
        // Crear dirección de envío en formato JSON
        const shippingAddressJson = JSON.stringify({
          address: formData.address,
          city: formData.city,
          province: formData.province,
          instructions: formData.instructions || ''
        });
        
        await db.insert(orders)
          .values({
            customerId: customerId,
            orderNumber: orderNumber,
            status: 'pendiente',
            createdAt: new Date(),
            updatedAt: new Date(),
            shippingAddress: shippingAddressJson,
            totalAmount: '0.00', // Se actualizará cuando se agreguen productos
            source: 'shipping_form',
            isFromWebForm: true
          });
        
        console.log(`✅ Orden creada correctamente: ${orderNumber}`);
        
        return res.status(200).json({ 
          success: true, 
          message: 'Datos guardados correctamente',
          customer: {
            id: customerId,
            name: customerName
          }
        });
      } catch (error) {
        console.error('❌ Error al guardar datos del formulario:', error);
        return res.status(500).json({ 
          success: false, 
          message: 'Error al guardar los datos', 
          error: error instanceof Error ? error.message : 'Error desconocido' 
        });
      }
    });
  
  console.log('✅ Rutas del formulario React registradas: /api/guardar-formulario-envio');
}

// Función auxiliar para generar número de orden
function generateOrderNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  
  return `OR-${year}${month}${day}-${random}`;
}

// Función auxiliar para condiciones OR
function or(...conditions: any[]): any {
  if (conditions.length === 0) return undefined;
  if (conditions.length === 1) return conditions[0];
  return conditions.reduce((acc, condition) => and(acc, condition));
}