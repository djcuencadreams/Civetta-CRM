/**
 * Rutas para el manejo de etiquetas de envío y datos de clientes
 */

import { Request, Response, Express } from "express";
import { z } from "zod";
import { db } from "../db";
import { customers } from "../db/schema";
import { eq, or, like } from "drizzle-orm";
import { generateShippingLabelPdf } from "./lib/shipping-label.service";
import { log } from "./vite";
import { validateBody } from "./validation";
import { handleDatabaseError } from "./validation";
import { appEvents, EventTypes } from "./lib/event-emitter";
import cors from "cors";
import * as fs from "fs";
import * as path from "path";

/**
 * Función para generar consultas de búsqueda por teléfono
 * Maneja diferentes formatos de teléfono (con/sin prefijo, solo dígitos finales)
 * 
 * @param phoneNumber Número de teléfono a buscar
 * @returns Array de consultas SQL para buscar el teléfono
 */
function createPhoneQueries(phoneNumber: string) {
  const queries = [];
  
  // 1. El teléfono completo tal como se proporcionó
  queries.push(eq(customers.phone, phoneNumber));
  
  // 2. Con prefijo "+" si no lo tiene
  if (!phoneNumber.startsWith('+')) {
    queries.push(eq(customers.phone, `+${phoneNumber}`));
    // 3. Con prefijo común de Ecuador si no tiene ningún prefijo
    queries.push(eq(customers.phone, `+593${phoneNumber}`));
  }
  
  // 4. Sin prefijo "+" si lo tiene
  if (phoneNumber.startsWith('+')) {
    queries.push(eq(customers.phone, phoneNumber.substring(1)));
  }
  
  // 5. Solo los dígitos finales (últimos 9 dígitos)
  if (phoneNumber.length >= 9) {
    const last9Digits = phoneNumber.slice(-9);
    queries.push(like(customers.phone, `%${last9Digits}`));
  }
  
  return queries;
}

// Esquema para validar el formulario de envío
export const shippingFormSchema = z.object({
  name: z.string().min(2, { message: "El nombre es requerido" }),
  phone: z.string().min(5, { message: "El teléfono es requerido" }),
  email: z.string().email({ message: "Correo electrónico inválido" }).optional().nullable(),
  street: z.string().min(5, { message: "La dirección es requerida" }),
  city: z.string().min(2, { message: "La ciudad es requerida" }),
  province: z.string().min(2, { message: "La provincia es requerida" }),
  idNumber: z.string().optional().nullable(),
  companyName: z.string().optional().nullable(),
  deliveryInstructions: z.string().optional().nullable(),
  orderNumber: z.string().optional().nullable(),
  saveToDatabase: z.boolean().optional().default(false),
  // Campos para el formulario web con nombres separados
  firstName: z.string().optional(),
  lastName: z.string().optional()
});

// Esquema para verificar clientes existentes
export const customerCheckSchema = z.object({
  identifier: z.string().min(3, { message: "El identificador debe tener al menos 3 caracteres" }),
  type: z.enum(["idNumber", "email", "phone"], { 
    errorMap: () => ({ message: "Tipo de identificador inválido, debe ser idNumber, email o phone" })
  })
});

// Tipo para los datos del formulario de envío
type ShippingFormData = z.infer<typeof shippingFormSchema>;
type CustomerCheckData = z.infer<typeof customerCheckSchema>;

/**
 * Registra las rutas para el manejo de etiquetas de envío
 * @param app Aplicación Express
 */
export function registerShippingRoutes(app: Express) {
  log("Shipping routes registered", "shipping-service");

  // Configuración de CORS para permitir solicitudes desde otros dominios
  // Lista de dominios permitidos, incluyendo el dominio principal de Civetta
  const allowedOrigins = [
    'https://civetta.com',        // Sitio principal
    'https://www.civetta.com',    // Con www
    'https://civettacrm.replit.app',  // App en Replit
    'https://civettacrm.repl.co',     // App en Replit (dominio alternativo)
    'http://localhost:3000',      // Desarrollo local
    'http://localhost:5173'       // Vite dev server
  ];

  // En desarrollo, permitir cualquier origen
  const corsOptions = {
    origin: function(origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
      // Permitir solicitudes sin origen (como curl o Postman)
      if (!origin) {
        callback(null, true);
        return;
      }
      
      // En desarrollo, permitir cualquier origen
      if (process.env.NODE_ENV === 'development') {
        callback(null, true);
        return;
      }
      
      // En producción, verificar contra la lista de orígenes permitidos
      if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.replit.app')) {
        callback(null, true);
      } else {
        console.log(`Origen bloqueado por CORS: ${origin}`);
        callback(new Error('Origen no permitido por política CORS'));
      }
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  };

  /**
   * Endpoint para verificar si un cliente existe por cédula, email o teléfono
   */
  app.post('/api/shipping/check-customer', 
    cors(corsOptions),
    validateBody(customerCheckSchema), 
    async (req: Request, res: Response) => {
      try {
        const { identifier, type } = req.body as CustomerCheckData;
        
        // Determinar qué campo usar para la búsqueda
        let query;
        switch (type) {
          case 'idNumber':
            query = eq(customers.idNumber, identifier);
            break;
          case 'email':
            // Verificar si identifier es null o undefined
            if (!identifier) {
              return res.status(400).json({ success: false, message: 'Correo electrónico no válido' });
            }
            query = eq(customers.email, identifier);
            break;
          case 'phone':
            console.log("Teléfono a buscar:", identifier);
            const phoneQueries = createPhoneQueries(identifier);
            console.log("Variantes de búsqueda:", phoneQueries.map(q => String(q)));
            
            query = or(...phoneQueries);
            break;
          default:
            return res.status(400).json({ success: false, message: 'Tipo de identificador no válido' });
        }
        
        // Loggear la búsqueda para depuración
        console.log(`Buscando cliente por ${type}: "${identifier}"`);
        
        // Buscar el cliente
        const existingCustomer = await db.query.customers.findFirst({
          where: query
        });
        
        // Loggear el resultado
        console.log("Resultado búsqueda:", existingCustomer ? "Cliente encontrado" : "Cliente no encontrado");
        
        if (existingCustomer) {
          // Extraer nombre y apellido de manera más robusta
          const nameParts = existingCustomer.name.split(' ');
          // Si hay campos first_name y last_name, usarlos primero
          let firstName = existingCustomer.firstName || '';
          let lastName = existingCustomer.lastName || '';
          
          // Si no hay campos separados, extraer del nombre completo
          if (!firstName && nameParts.length > 0) {
            firstName = nameParts[0];
            lastName = nameParts.slice(1).join(' ');
          }
          
          console.log('Extrayendo nombre del cliente:', { 
            fullName: existingCustomer.name,
            firstName,
            lastName
          });
          
          // Devolver los datos del cliente sin información sensible
          return res.json({
            success: true,
            exists: true,
            customer: {
              firstName,
              lastName,
              phone: existingCustomer.phone || '',
              email: existingCustomer.email || '',
              street: existingCustomer.address || existingCustomer.street || '',
              city: existingCustomer.city || '',
              province: existingCustomer.province || '',
              idNumber: existingCustomer.idNumber || ''
            }
          });
        } else {
          return res.json({ success: true, exists: false });
        }
      } catch (error) {
        console.error('Error verificando cliente:', error);
        return res.status(500).json({ 
          success: false, 
          message: 'Error al verificar el cliente',
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  );

  /**
   * Genera una etiqueta de envío y opcionalmente guarda el cliente en la base de datos
   * Este endpoint acepta solicitudes CORS para integrarse con el sitio web de Civetta
   */
  app.post('/api/shipping/generate-label', 
    cors(corsOptions),
    validateBody(shippingFormSchema), 
    async (req: Request, res: Response) => {
      try {
        const formData: ShippingFormData = req.body;
        
        // Si tenemos firstName y lastName, construir el nombre completo
        if (formData.firstName && formData.lastName) {
          formData.name = `${formData.firstName} ${formData.lastName}`;
        }
        
        // Si se solicita guardar en base de datos, crear o actualizar cliente
        let customerId: number | undefined;
        
        if (formData.saveToDatabase) {
          try {
            // Verificar si el cliente ya existe por teléfono, email o número de identificación
            let existingCustomer = null;
            
            if (formData.idNumber) {
              console.log(`Buscando cliente por idNumber: "${formData.idNumber}"`);
              existingCustomer = await db.query.customers.findFirst({
                where: eq(customers.idNumber, formData.idNumber)
              });
            }
            
            if (!existingCustomer && formData.email) {
              console.log(`Buscando cliente por email: "${formData.email}"`);
              existingCustomer = await db.query.customers.findFirst({
                where: eq(customers.email, formData.email)
              });
            }
            
            if (!existingCustomer && formData.phone) {
              console.log(`Buscando cliente por teléfono: "${formData.phone}"`);
              
              const phoneQueries = createPhoneQueries(formData.phone);
              console.log("Variantes de búsqueda:", phoneQueries.map(q => String(q)));
              
              existingCustomer = await db.query.customers.findFirst({
                where: or(...phoneQueries)
              });
            }
            
            console.log("Resultado búsqueda:", existingCustomer ? "Cliente encontrado" : "Cliente no encontrado");
            
            if (existingCustomer) {
              // Actualizar cliente existente
              const updated = await db
                .update(customers)
                .set({
                  name: formData.name,
                  phone: formData.phone,
                  email: formData.email || existingCustomer.email,
                  address: formData.street,
                  city: formData.city,
                  province: formData.province,
                  idNumber: formData.idNumber || existingCustomer.idNumber,
                  updatedAt: new Date()
                })
                .where(eq(customers.id, existingCustomer.id))
                .returning({ id: customers.id });
                
              customerId = updated[0]?.id;
              
              // Emitir evento de actualización del cliente
              appEvents.emit(EventTypes.CUSTOMER_UPDATED, { 
                id: customerId,
                name: formData.name,
                phone: formData.phone,
                email: formData.email,
                address: formData.street
              });
            } else {
              // Crear nuevo cliente
              const inserted = await db
                .insert(customers)
                .values({
                  name: formData.name,
                  phone: formData.phone,
                  email: formData.email || null,
                  address: formData.street,
                  city: formData.city,
                  province: formData.province,
                  idNumber: formData.idNumber || null,
                  source: 'shipping_form',
                  createdAt: new Date(),
                  updatedAt: new Date()
                })
                .returning({ id: customers.id });
                
              customerId = inserted[0]?.id;
              
              // Emitir evento de creación del cliente
              appEvents.emit(EventTypes.CUSTOMER_CREATED, { 
                id: customerId,
                name: formData.name,
                phone: formData.phone,
                email: formData.email,
                address: formData.street
              });
            }
          } catch (error) {
            console.error('Error al guardar cliente:', error);
            // Continuar para generar la etiqueta aunque falle el guardado
          }
        }
        
        // Generar la etiqueta de envío en PDF
        const pdfBuffer = await generateShippingLabelPdf({
          name: formData.name,
          phone: formData.phone,
          street: formData.street,
          city: formData.city,
          province: formData.province,
          idNumber: formData.idNumber || undefined,
          deliveryInstructions: formData.deliveryInstructions || undefined,
          orderNumber: formData.orderNumber || undefined,
          companyName: formData.companyName || 'CIVETTA'
        });
        
        // Enviar PDF como descarga
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="etiqueta-envio-${formData.name.replace(/\s+/g, '_')}.pdf"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        
        return res.send(pdfBuffer);
      } catch (error) {
        console.error('Error al generar etiqueta de envío:', error);
        return res.status(500).json({ 
          success: false, 
          message: 'Error al generar etiqueta de envío',
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  );

  /**
   * Servir el formulario HTML independiente para integrarlo en sitios externos
   * Se proporciona en múltiples rutas para mayor compatibilidad
   * 
   * IMPORTANTE: Esta función sirve el mismo archivo HTML en varias rutas
   * para garantizar consistencia en la integración con WordPress
   */
  const serveShippingForm = (req: Request, res: Response) => {
    try {
      // Usar la versión optimizada para WordPress sin menú del CRM
      const formPath = path.join(process.cwd(), 'templates/shipping/wordpress-embed-standalone.html');
      
      if (fs.existsSync(formPath)) {
        // Configurar encabezados CORS para permitir el acceso desde WordPress
        res.setHeader('Content-Type', 'text/html; charset=UTF-8');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        // Configurar cache para mejorar rendimiento
        res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache por 1 hora
        
        // Enviar el archivo HTML
        return res.sendFile(formPath);
      } else {
        log("No se encontró el archivo del formulario en: " + formPath, "shipping-service");
        return res.status(404).send('Formulario no encontrado');
      }
    } catch (error) {
      console.error('Error sirviendo formulario:', error);
      return res.status(500).send('Error al cargar el formulario');
    }
  };
  
  // Registrar la ruta principal
  app.get('/shipping-form', cors(corsOptions), serveShippingForm);
  
  // Ruta alternativa que no entrará en conflicto con las rutas de Vite
  app.get('/forms/shipping', cors(corsOptions), serveShippingForm);
  
  // Otra alternativa para entornos de producción
  app.get('/public/shipping-form', cors(corsOptions), serveShippingForm);
  
  // Versión optimizada para WordPress con estilos inline
  // Esta ruta ahora sirve el mismo contenido con los mismos encabezados que las demás rutas
  app.get('/wordpress-embed', cors(corsOptions), serveShippingForm);
  
  // Guía de implementación en WordPress
  app.get('/wordpress-guide', cors(corsOptions), (req: Request, res: Response) => {
    try {
      const guidePath = path.join(process.cwd(), 'templates/shipping/wordpress-integration-guide.html');
      
      if (fs.existsSync(guidePath)) {
        // Configurar encabezados CORS para permitir el acceso desde cualquier dominio
        res.setHeader('Content-Type', 'text/html; charset=UTF-8');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        // Configurar cache para mejorar rendimiento
        res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache por 1 hora
        
        return res.sendFile(guidePath);
      } else {
        log("No se encontró la guía de integración en: " + guidePath, "shipping-service");
        return res.status(404).send('Guía no encontrada');
      }
    } catch (error) {
      console.error('Error al servir la guía de integración:', error);
      return res.status(500).send('Error interno del servidor');
    }
  });
  
  // Ejemplos avanzados de integración (para desarrolladores)
  app.get('/wordpress-examples-advanced', cors(corsOptions), (req: Request, res: Response) => {
    try {
      const examplesPath = path.join(process.cwd(), 'templates/shipping/wordpress-example-advanced.html');
      
      if (fs.existsSync(examplesPath)) {
        // Configurar encabezados CORS para permitir el acceso desde cualquier dominio
        res.setHeader('Content-Type', 'text/html; charset=UTF-8');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        // Configurar cache para mejorar rendimiento
        res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache por 1 hora
        
        return res.sendFile(examplesPath);
      } else {
        log("No se encontraron los ejemplos avanzados en: " + examplesPath, "shipping-service");
        return res.status(404).send('Ejemplos avanzados no encontrados');
      }
    } catch (error) {
      console.error('Error al servir los ejemplos avanzados:', error);
      return res.status(500).send('Error interno del servidor');
    }
  });

  // Servir el script de carga del formulario (para integración en Civetta.com)
  app.get('/shipping-form-loader.js', cors(corsOptions), (req: Request, res: Response) => {
    try {
      const scriptPath = path.join(process.cwd(), 'templates/shipping/shipping-form-loader.js');
      
      if (fs.existsSync(scriptPath)) {
        // Configurar encabezados CORS para permitir el acceso desde cualquier dominio
        res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        // Configurar cache para mejorar rendimiento
        res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache por 1 hora
        
        return res.sendFile(scriptPath);
      } else {
        log("No se encontró el archivo del script en: " + scriptPath, "shipping-service");
        return res.status(404).send('Script no encontrado');
      }
    } catch (error) {
      console.error('Error sirviendo script de carga:', error);
      return res.status(500).send('Error al cargar el script');
    }
  });
}