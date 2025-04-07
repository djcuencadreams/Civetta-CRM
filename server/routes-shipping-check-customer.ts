/**
 * API mejorada para la verificación y recuperación de datos de clientes
 * Asegura que todos los campos de dirección se incluyan en la respuesta
 */
import { Express, Request, Response } from 'express';
import { db } from '@db';
import { customers } from '@db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { validateBody } from './validation';
import cors from 'cors';

// Esquema de validación para la búsqueda de clientes
const customerCheckSchema = z.object({
  query: z.string().min(1),
  type: z.enum(['identification', 'email', 'phone'])
});

type CustomerCheckData = z.infer<typeof customerCheckSchema>;

// Opciones de CORS
const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

/**
 * Registrar el endpoint para verificar clientes
 * Este endpoint devuelve todos los datos del cliente, incluida la dirección
 */
export function registerCustomerCheckEndpoint(app: Express) {
  app.post('/api/shipping/check-customer-v2',
    cors(corsOptions),
    validateBody(customerCheckSchema),
    async (req: Request, res: Response) => {
      try {
        const { query, type } = req.body as CustomerCheckData;
        console.log('🔍 Verificando cliente:', query, 'tipo:', type);
        
        // Construir la condición de búsqueda según el tipo
        let whereCondition;
        switch (type) {
          case 'identification':
            whereCondition = eq(customers.idNumber, query);
            break;
          case 'email':
            whereCondition = eq(customers.email, query);
            break;
          case 'phone':
            whereCondition = eq(customers.phone, query);
            break;
          default:
            return res.status(400).json({ error: 'Tipo de búsqueda no válido' });
        }
        
        // Buscar el cliente utilizando Drizzle ORM
        const customer = await db.query.customers.findFirst({
          where: whereCondition
        });
        
        if (customer) {
          console.log('✅ Cliente encontrado:', customer.id, customer.name);
          console.log('📋 Datos de dirección:', {
            street: customer.street,
            city: customer.city,
            province: customer.province,
            deliveryInstructions: customer.deliveryInstructions
          });
          
          // Construir la respuesta incluyendo todos los campos necesarios
          const customerResponse = {
            id: customer.id,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            idNumber: customer.idNumber,
            // Información de dirección - estos son los campos que necesitamos incluir
            street: customer.street || '',
            city: customer.city || '',
            province: customer.province || '',
            deliveryInstructions: customer.deliveryInstructions || ''
          };
          
          // Verificar que la respuesta incluya los campos de dirección
          console.log('🚚 Respuesta con dirección:', 
            customerResponse.street ? '✓' : '✗',
            customerResponse.city ? '✓' : '✗',
            customerResponse.province ? '✓' : '✗'
          );
          
          return res.json({
            found: true,
            customer: customerResponse
          });
        } else {
          console.log('❌ Cliente no encontrado:', query);
          return res.json({ found: false });
        }
      } catch (error) {
        console.error('🔴 Error al verificar cliente:', error);
        return res.status(500).json({ 
          error: 'Error al verificar cliente',
          details: error instanceof Error ? error.message : 'Error desconocido'
        });
      }
    });
    
  console.log('✅ Endpoint de verificación de clientes registrado: /api/shipping/check-customer-v2');
}