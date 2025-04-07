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
  // Endpoint POST para verificaciones desde el formulario
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
        
        // Primero obtenemos el ID del cliente para luego hacer una consulta fresca
        const customerBasic = await db.query.customers.findFirst({
          where: whereCondition,
          columns: {
            id: true
          }
        });
        
        if (!customerBasic) {
          console.log('❌ Cliente no encontrado:', query);
          return res.json({ found: false });
        }
        
        console.log('🔄 Consultando datos actualizados del cliente ID:', customerBasic.id);
        
        // Con el ID, hacemos una consulta fresca para asegurar datos actualizados
        const customer = await db.query.customers.findFirst({
          where: eq(customers.id, customerBasic.id),
          columns: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            idNumber: true,
            // Campos explícitos de dirección
            street: true,
            city: true,
            province: true,
            deliveryInstructions: true,
            // Incluir timestamp de última actualización para diagnóstico
            updatedAt: true
          }
        });
        
        if (customer) {
          console.log('⏱️ Datos recuperados. Última actualización:', customer.updatedAt);
          console.log('✅ Cliente encontrado:', customer.id, customer.name);
          console.log('📋 Datos de dirección:', {
            street: customer.street,
            city: customer.city,
            province: customer.province,
            deliveryInstructions: customer.deliveryInstructions
          });
          
          // Construir la respuesta con todos los campos necesarios
          const customerResponse = {
            // Información básica del cliente
            id: customer.id,
            name: customer.name,
            firstName: customer.firstName || '',
            lastName: customer.lastName || '',
            email: customer.email,
            phone: customer.phone,
            
            // Campos en formato camelCase (formato principal)
            idNumber: customer.idNumber || '',
            street: customer.street || '',
            city: customer.city || '',
            province: customer.province || '',
            deliveryInstructions: customer.deliveryInstructions || '',
            
            // Campos en formato snake_case (para compatibilidad)
            id_number: customer.idNumber || '',
            first_name: customer.firstName || '',
            last_name: customer.lastName || '',
            delivery_instructions: customer.deliveryInstructions || ''
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
          console.log('❌ Cliente no encontrado después de segunda consulta');
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
    
  // Endpoint GET para pruebas directas y depuración
  app.get('/api/shipping/check-customer-v2', 
    cors(corsOptions),
    async (req: Request, res: Response) => {
      try {
        const searchType = req.query.searchType as string;
        const identifier = req.query.identifier as string;
        
        if (!searchType || !identifier) {
          return res.status(400).json({ 
            error: 'Parámetros faltantes', 
            message: 'Se requieren searchType e identifier' 
          });
        }
        
        // Validar el tipo de búsqueda
        if (!['identification', 'email', 'phone'].includes(searchType)) {
          return res.status(400).json({ 
            error: 'Tipo de búsqueda inválido', 
            message: 'searchType debe ser identification, email o phone' 
          });
        }
        
        console.log(`🔍 [GET] Verificando cliente: "${identifier}", tipo: "${searchType}"`);
        
        // Construir la condición de búsqueda según el tipo
        let whereCondition;
        switch (searchType) {
          case 'identification':
            whereCondition = eq(customers.idNumber, identifier);
            break;
          case 'email':
            whereCondition = eq(customers.email, identifier);
            break;
          case 'phone':
            whereCondition = eq(customers.phone, identifier);
            break;
          default:
            return res.status(400).json({ error: 'Tipo de búsqueda no válido' });
        }
        
        // Obtener el cliente directamente con todos los campos necesarios
        const customer = await db.query.customers.findFirst({
          where: whereCondition,
          columns: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            idNumber: true,
            street: true,
            city: true,
            province: true,
            deliveryInstructions: true,
            updatedAt: true
          }
        });
        
        if (!customer) {
          console.log(`❌ [GET] Cliente no encontrado: "${identifier}"`);
          return res.json({ found: false });
        }
        
        console.log(`✅ [GET] Cliente encontrado: ${customer.id}, ${customer.name}`);
        
        // Construir la respuesta con todos los campos necesarios
        const customerResponse = {
          // Información básica
          id: customer.id,
          name: customer.name,
          firstName: customer.firstName || '',
          lastName: customer.lastName || '',
          email: customer.email,
          phone: customer.phone,
          
          // Campos en formato camelCase (formato principal)
          idNumber: customer.idNumber || '',
          street: customer.street || '',
          city: customer.city || '',
          province: customer.province || '',
          deliveryInstructions: customer.deliveryInstructions || '',
          
          // Campos en formato snake_case (para compatibilidad)
          id_number: customer.idNumber || '',
          first_name: customer.firstName || '',
          last_name: customer.lastName || '',
          delivery_instructions: customer.deliveryInstructions || ''
        };
        
        return res.json({
          found: true,
          customer: customerResponse,
          updatedAt: customer.updatedAt
        });
        
      } catch (error) {
        console.error(`🔴 [GET] Error al verificar cliente:`, error);
        return res.status(500).json({ 
          error: 'Error al verificar cliente',
          details: error instanceof Error ? error.message : 'Error desconocido'
        });
      }
    });
  
  console.log('✅ Endpoints de verificación de clientes registrados: /api/shipping/check-customer-v2 (POST y GET)');
}