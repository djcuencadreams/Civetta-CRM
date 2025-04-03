/**
 * Rutas para el manejo de etiquetas de envío (Versión Mejorada)
 * Este módulo gestiona:
 * 1. Verificación de clientes existentes por cédula, email o teléfono
 * 2. Guardar formularios de envío con o sin generación de PDF
 * 3. Integración con sitios externos vía CORS
 * 4. Creación automática de clientes si no existen
 * 5. Creación de órdenes pendientes ("pendiente_de_completar")
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

// Permitir ruta raíz del servidor más dominios configurados de WordPress
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // En desarrollo, permitir todas las solicitudes
    if (!origin) {
      return callback(null, true);
    }
    
    // Obtener dominios autorizados de variables de entorno
    const allowedDomains = process.env.ALLOWED_DOMAINS ? 
      process.env.ALLOWED_DOMAINS.split(',') : 
      [];
    
    // Permitir dominio local o dominios autorizados
    if (origin.startsWith('http://localhost') || 
        origin.startsWith('https://localhost') ||
        allowedDomains.some(domain => origin.includes(domain))) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS']
};

// Crear múltiples queries para número de teléfono (diferentes formatos)
function createPhoneQueries(phone: string): any[] {
  const cleanedPhone = phone.replace(/\D/g, '');
  const queries = [];
  
  // Buscar el teléfono tal cual se ingresó
  queries.push(eq(customers.phone, phone));
  
  // Si el teléfono tiene formato nacional (sin código de país)
  if (cleanedPhone.length === 10) {
    // Diferentes formatos comunes en Colombia
    queries.push(eq(customers.phone, cleanedPhone)); // Sin formato
    queries.push(eq(customers.phone, cleanedPhone.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3'))); // Con guiones
    queries.push(eq(customers.phone, cleanedPhone.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3'))); // Con espacios
    queries.push(eq(customers.phone, cleanedPhone.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2 $3'))); // Con paréntesis
    
    // Con código de país +57
    const withCountryCode = `+57${cleanedPhone}`;
    queries.push(eq(customers.phone, withCountryCode));
    queries.push(eq(customers.phone, withCountryCode.replace(/\+57(\d{3})(\d{3})(\d{4})/, '+57 $1 $2 $3')));
  }
  
  return queries;
}

// Esquema para validar el formulario de envío
const shippingFormSchema = z.object({
  name: z.string().min(2, 'El nombre es obligatorio').max(100),
  email: z.string().email('Email inválido').optional().nullable(),
  phone: z.string().min(7, 'Teléfono debe tener al menos 7 dígitos'),
  idNumber: z.string().optional().nullable(),
  street: z.string().min(3, 'La dirección es obligatoria'),
  city: z.string().min(2, 'La ciudad es obligatoria'),
  province: z.string().min(2, 'La provincia/departamento es obligatorio'),
  companyName: z.string().optional().nullable(),
  deliveryInstructions: z.string().optional().nullable(),
  brand: z.string().optional().nullable()
});

// Tipo para el formulario de envío
type ShippingFormData = z.infer<typeof shippingFormSchema>;

/**
 * Registra las rutas de etiquetas de envío mejoradas
 */
export function registerImprovedShippingRoutes(app: Express) {
  console.log('🚚 Registrando rutas de etiquetas de envío mejoradas');
  
  /**
   * Endpoint para verificar si un cliente existe
   * Usado por el formulario de envío para validar clientes
   * por cédula, email o teléfono
   */
  app.post('/api/shipping/check-customer', 
    cors(corsOptions), 
    async (req: Request, res: Response) => {
      try {
        // Verificar que al menos uno de los campos llegó
        const { idNumber, email, phone } = req.body;
        if (!idNumber && !email && !phone) {
          return res.status(400).json({
            exists: false,
            error: "Se requiere al menos un campo para verificar el cliente (cédula, email o teléfono)"
          });
        }
        
        // Construir la consulta para buscar el cliente
        let whereConditions = [];
        
        if (idNumber) {
          whereConditions.push(eq(customers.idNumber, idNumber));
        }
        
        if (email) {
          whereConditions.push(eq(customers.email, email));
        }
        
        if (phone) {
          whereConditions.push(...createPhoneQueries(phone));
        }
        
        // Buscar el cliente
        const customer = await db.query.customers.findFirst({
          where: or(...whereConditions)
        });
        
        // Responder con si el cliente existe y sus datos básicos
        if (customer) {
          res.json({
            exists: true,
            customer: {
              id: customer.id,
              name: customer.name,
              idNumber: customer.idNumber
            }
          });
        } else {
          res.json({
            exists: false
          });
        }
      } catch (error) {
        console.error('Error al verificar cliente:', error);
        res.status(500).json({ 
          exists: false,
          error: 'Error al verificar cliente',
          details: error instanceof Error ? error.message : 'Error desconocido' 
        });
      }
    }
  );
  
  /**
   * Endpoint para guardar los datos de envío y generar una etiqueta
   * Guarda los datos del cliente, crea una orden pendiente, y genera una etiqueta PDF
   */
  app.post('/api/shipping/generate-label',
    cors(corsOptions),
    validateBody(shippingFormSchema),
    async (req: Request, res: Response) => {
      try {
        const formData: ShippingFormData = req.body;
        let customerId: number | undefined;
        let orderId: number | undefined;
        
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
          console.log('Cliente encontrado, ID:', customerId);
        } else {
          // Crear un nuevo cliente con los datos del formulario
          const newCustomerData = {
            name: formData.name,
            email: formData.email || undefined,
            phone: formData.phone,
            idNumber: formData.idNumber || undefined,
            street: formData.street,
            city: formData.city,
            province: formData.province,
            deliveryInstructions: formData.deliveryInstructions || undefined,
            brand: formData.brand ? formData.brand as any : brandEnum.SLEEPWEAR,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          const [newCustomer] = await db.insert(customers).values(newCustomerData).returning();
          
          customerId = newCustomer.id;
          console.log('Nuevo cliente creado, ID:', customerId);
        }
        
        // Crear objeto con los datos de envío
        const shippingInfo = {
            name: formData.name,
            phone: formData.phone,
            street: formData.street,
            city: formData.city,
            province: formData.province,
            instructions: formData.deliveryInstructions || '',
            idNumber: formData.idNumber || '',
            companyName: formData.companyName || ''
        };
        
        // Crear una orden pendiente usando el servicio
        try {
          const orderResult = await ordersService.createOrderFromShippingForm({
            customerId, 
            customerName: formData.name,
            phone: formData.phone,
            email: formData.email,
            idNumber: formData.idNumber,
            shippingAddress: shippingInfo,
            items: [], // Sin productos
            brand: formData.brand,
            source: sourceEnum.WEBSITE
          });
          
          orderId = orderResult.id;
          console.log('Orden creada con ID:', orderId);
        } catch (orderError) {
          console.error('Error al crear orden:', orderError);
          // Continuar el flujo aunque haya error en la creación de la orden
        }
        
        // Generar etiqueta de envío sin importar si se creó la orden o no
        try {
          // Preparar datos para el PDF
          const pdfData = {
            name: formData.name,
            phone: formData.phone,
            street: formData.street,
            city: formData.city,
            province: formData.province,
            idNumber: formData.idNumber || 'N/A',
            deliveryInstructions: formData.deliveryInstructions || '',
            orderNumber: orderId ? `ORD-${orderId.toString().padStart(6, '0')}` : uuidv4().substring(0, 8).toUpperCase(),
            companyName: formData.companyName || ''
          };
          
          // Generar el PDF
          const pdfBuffer = await generateShippingLabelPdf(pdfData);
          
          if (!pdfBuffer || pdfBuffer.length < 100) {
            throw new Error('PDF generado inválido');
          }
          
          // Responder con éxito en formato JSON para permitir al front usar la info
          res.json({
            success: true,
            customerId,
            orderId,
            message: "Etiqueta generada correctamente",
            // URL para descargar la etiqueta
            labelUrl: `/api/shipping/generate-label-internal/${orderId}`
          });
        } catch (pdfError) {
          console.error('Error generando etiqueta PDF:', pdfError);
          res.status(500).json({ 
            error: 'Error generando la etiqueta de envío',
            details: pdfError instanceof Error ? pdfError.message : 'Error desconocido'
          });
        }
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
          console.log('Cliente encontrado, ID:', customerId);
        } else {
          // Crear un nuevo cliente con los datos del formulario
          const newCustomerData = {
            name: formData.name,
            email: formData.email || undefined,
            phone: formData.phone,
            idNumber: formData.idNumber || undefined,
            street: formData.street,
            city: formData.city,
            province: formData.province,
            deliveryInstructions: formData.deliveryInstructions || undefined,
            brand: formData.brand ? formData.brand as any : brandEnum.SLEEPWEAR,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          const [newCustomer] = await db.insert(customers).values(newCustomerData).returning();
          
          customerId = newCustomer.id;
          console.log('Nuevo cliente creado, ID:', customerId);
        }
        
        // Crear objeto con los datos de envío
        const shippingInfo = {
            name: formData.name,
            phone: formData.phone,
            street: formData.street,
            city: formData.city,
            province: formData.province,
            instructions: formData.deliveryInstructions || '',
            idNumber: formData.idNumber || '',
            companyName: formData.companyName || ''
        };
        
        // Crear una orden pendiente usando el servicio
        try {
          const orderResult = await ordersService.createOrderFromShippingForm({
            customerId,
            customerName: formData.name,
            phone: formData.phone,
            email: formData.email,
            idNumber: formData.idNumber,
            shippingAddress: shippingInfo,
            items: [], // Sin productos
            brand: formData.brand,
            source: sourceEnum.WEBSITE
          });
          
          orderId = orderResult.id;
          console.log('Orden creada con ID:', orderId);
          
          // Responder con éxito y datos de la orden creada
          res.json({
            success: true,
            customerId,
            orderId,
            message: "Datos de envío guardados correctamente"
          });
        } catch (orderError) {
          console.error('Error al crear orden:', orderError);
          res.status(500).json({ 
            error: 'Error al crear la orden',
            details: orderError instanceof Error ? orderError.message : 'Error desconocido'
          });
        }
      } catch (error) {
        console.error('Error al guardar datos de envío:', error);
        res.status(500).json({ 
          error: 'Error al guardar los datos de envío',
          details: error instanceof Error ? error.message : 'Error desconocido'
        });
      }
    });
  
  /**
   * Endpoint para generar etiqueta de envío a partir de una orden existente
   * Se accede desde el CRM para generar la etiqueta de una orden específica
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
      
      console.log('[ETIQUETA] Orden encontrada:', { 
        id: order.id, 
        orderNumber: order.orderNumber,
        customerId: order.customerId,
        customerName: order.customer?.name,
        hasShippingAddress: !!order.shippingAddress
      });
      
      // Extraer información de envío (incluso si está incompleta)
      let shippingInfo: any = {};
      
      if (order.shippingAddress) {
        try {
          // Si es un objeto JSON almacenado como string
          if (typeof order.shippingAddress === 'string') {
            console.log('[ETIQUETA] Parseando shippingAddress de string a objeto');
            shippingInfo = JSON.parse(order.shippingAddress);
          } else {
            // Si ya es un objeto
            console.log('[ETIQUETA] shippingAddress ya es un objeto');
            shippingInfo = order.shippingAddress;
          }
          console.log('[ETIQUETA] Datos de shipping extraídos:', shippingInfo);
        } catch (e) {
          console.error('[ETIQUETA] Error al parsear shippingAddress:', e, 'Valor recibido:', order.shippingAddress);
          // Si hay error al parsear, usar un objeto vacío
          shippingInfo = {};
        }
      } else {
        console.log('[ETIQUETA] No hay información de envío específica, usando datos del cliente');
      }
      
      // Obtener nombre del cliente o usar ID como fallback
      const customerName = 
        shippingInfo.name || 
        order.customer?.name || 
        `Cliente #${order.customerId}`;
      
      // Obtener número de teléfono
      const customerPhone = 
        shippingInfo.phone || 
        order.customer?.phone || 
        'No disponible';
      
      // Obtener dirección o usar placeholders que indican que falta información
      const streetAddress = 
        shippingInfo.street || 
        order.customer?.street || 
        '[INFORMACIÓN PENDIENTE]';
      
      const cityName = 
        shippingInfo.city || 
        order.customer?.city || 
        '[CIUDAD]';
      
      const provinceName = 
        shippingInfo.province || 
        order.customer?.province || 
        '[PROVINCIA]';
      
      // Crear número de orden formateado si no existe
      const formattedOrderNumber = 
        order.orderNumber || 
        `ORD-${order.id.toString().padStart(6, '0')}`;
      
      // Preparar datos para el PDF (con datos de fallback para casos incompletos)
      const pdfData = {
        name: customerName,
        phone: customerPhone,
        street: streetAddress,
        city: cityName,
        province: provinceName,
        idNumber: order.customer?.idNumber || shippingInfo.idNumber || 'N/A',
        deliveryInstructions: shippingInfo.instructions || '',
        orderNumber: formattedOrderNumber,
        // Usado companyName solo si existe en el cliente o en shipping info
        companyName: shippingInfo.companyName || (order.customer && 'companyName' in order.customer ? order.customer.companyName : '') 
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
      
      // Verificar si el archivo existe
      if (fs.existsSync(loaderPath)) {
        fs.readFile(loaderPath, 'utf8', (err, data) => {
          if (err) {
            console.error('Error al leer shipping-form-loader.js:', err);
            res.status(500).send('console.error("Error al cargar el script de formulario");');
            return;
          }
          
          // Enviar el script con la URL del servidor actual
          const serverUrl = `${req.protocol}://${req.get('host')}`;
          const scriptWithServerUrl = data.replace('__SERVER_URL__', serverUrl);
          res.send(scriptWithServerUrl);
        });
      } else {
        console.error('Archivo shipping-form-loader.js no encontrado en:', loaderPath);
        res.status(404).send('console.error("Script de formulario no encontrado");');
      }
    } catch (error) {
      console.error('Error al servir shipping-form-loader.js:', error);
      res.status(500).send('console.error("Error interno al cargar el script");');
    }
  });
  
  // Servir el formulario integrado para WordPress
  app.get('/shipping-form-embed.html', cors(), (req: Request, res: Response) => {
    try {
      const embedPath = path.join(__dirname, '../templates/shipping/wordpress-embed-modern.html');
      res.setHeader('Content-Type', 'text/html');
      
      // Verificar si el archivo existe
      if (fs.existsSync(embedPath)) {
        fs.readFile(embedPath, 'utf8', (err, data) => {
          if (err) {
            console.error('Error al leer wordpress-embed-modern.html:', err);
            res.status(500).send('<p>Error al cargar el formulario de envío</p>');
            return;
          }
          
          // Enviar el HTML con la URL del servidor actual
          const serverUrl = `${req.protocol}://${req.get('host')}`;
          const htmlWithServerUrl = data.replace(/__SERVER_URL__/g, serverUrl);
          res.send(htmlWithServerUrl);
        });
      } else {
        console.error('Archivo wordpress-embed-modern.html no encontrado en:', embedPath);
        res.status(404).send('<p>Formulario de envío no encontrado</p>');
      }
    } catch (error) {
      console.error('Error al servir wordpress-embed-modern.html:', error);
      res.status(500).send('<p>Error interno al cargar el formulario</p>');
    }
  });
}