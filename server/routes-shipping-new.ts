/**
 * NUEVO Sistema de Rutas para generación de etiquetas de envío
 * Este archivo implementa una alternativa completa para solucionar los problemas
 * con la generación de etiquetas PDF.
 */

import { Express, Request, Response } from 'express';
import { db } from '../db';
import { orders, customers } from '../db/schema';
import { eq, or, like } from 'drizzle-orm';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Asegurarse de que existe el directorio para almacenar PDFs temporales
function ensureTempDir() {
  const tempDir = path.join(process.cwd(), 'temp_pdfs');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  return tempDir;
}

/**
 * Función para generar un PDF de etiqueta de envío directamente
 * Esta implementación es independiente de cualquier otro servicio
 */
function generateSimpleShippingLabel(data: {
  name: string;
  phone: string;
  street: string;
  city: string;
  province: string;
  idNumber?: string;
  orderNumber?: string;
  instructions?: string;
  trackingNumber?: string;
  companyName?: string;
}): Buffer {
  // Crear un nuevo documento PDF tamaño A4
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Configurar fuentes y dimensiones
  doc.setFont('helvetica', 'normal');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;

  // Añadir título grande y claro
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('ETIQUETA DE ENVÍO', pageWidth / 2, margin + 5, { align: 'center' });

  // Logo o texto de la empresa (con fondo destacado)
  // Crear un fondo sombreado para el logo
  doc.setFillColor(248, 249, 250);
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.roundedRect(pageWidth / 2 - 25, margin + 10, 50, 25, 3, 3, 'FD');

  try {
    const logoPath = path.join(process.cwd(), 'media', 'logoCivetta01.png');
    if (fs.existsSync(logoPath)) {
      const logoData = fs.readFileSync(logoPath);
      const logoBase64 = 'data:image/png;base64,' + logoData.toString('base64');
      const logoHeight = 20;
      doc.addImage(logoBase64, 'PNG', pageWidth / 2 - 20, margin + 12, 40, logoHeight);
    } else {
      doc.setFontSize(24);
      doc.setTextColor(232, 62, 140);
      doc.setFont('helvetica', 'italic');
      doc.text('Civetta', pageWidth / 2, margin + 25, { align: 'center' });
      doc.setTextColor(0, 0, 0);
    }
  } catch (e) {
    // Usar texto en caso de error
    doc.setFontSize(24);
    doc.setTextColor(232, 62, 140);
    doc.setFont('helvetica', 'italic');
    doc.text('Civetta', pageWidth / 2, margin + 25, { align: 'center' });
    doc.setTextColor(0, 0, 0);
  }

  // Iniciar contenido principal de la etiqueta
  let yPos = margin + 40;

  // Campos de la etiqueta
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('DESTINATARIO:', margin, yPos);

  // Nombre del destinatario (en grande)
  yPos += 8;
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(data.name, margin, yPos);

  // Mostrar nombre de empresa si existe
  if (data.companyName) {
    yPos += 7;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'italic');
    doc.text(`Empresa: ${data.companyName}`, margin, yPos);
  }

  // Resto de campos
  yPos += 10;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Cédula/ID:', margin, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(data.idNumber || 'No proporcionada', margin + 30, yPos);

  yPos += 8;
  doc.setFont('helvetica', 'bold');
  doc.text('Dirección:', margin, yPos);
  const streetLines = doc.splitTextToSize(data.street || 'No disponible', pageWidth - margin * 2 - 30);
  doc.setFont('helvetica', 'normal');
  doc.text(streetLines, margin + 30, yPos);

  // Ajustar según líneas de dirección
  yPos += streetLines.length * 6;

  doc.setFont('helvetica', 'bold');
  doc.text('Ciudad:', margin, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(data.city || 'No disponible', margin + 30, yPos);

  yPos += 8;
  doc.setFont('helvetica', 'bold');
  doc.text('Provincia:', margin, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(data.province || 'No disponible', margin + 30, yPos);

  yPos += 8;
  doc.setFont('helvetica', 'bold');
  doc.text('Teléfono:', margin, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(data.phone || 'No disponible', margin + 30, yPos);

  // Instrucciones si existen
  if (data.instructions) {
    yPos += 10;
    doc.setFont('helvetica', 'bold');
    doc.text('Instrucciones:', margin, yPos);

    const instructionsLines = doc.splitTextToSize(data.instructions, pageWidth - margin * 2 - 30);
    doc.setFont('helvetica', 'normal');
    yPos += 6;
    doc.text(instructionsLines, margin, yPos);
  }

  // Número de orden y fecha en la parte inferior
  const bottomY = pageHeight / 2 - 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  const currentDate = new Date().toLocaleDateString('es-ES');

  doc.text(`Fecha: ${currentDate}`, margin, bottomY);

  // Información de la orden
  if (data.orderNumber) {
    doc.text(`Orden: ${data.orderNumber}`, pageWidth - margin - 50, bottomY);
  }

  // Número de seguimiento si existe
  if (data.trackingNumber) {
    const trackingY = bottomY - 5;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Seguimiento: ${data.trackingNumber}`, pageWidth - margin - 80, trackingY);
  }

  // Línea punteada en mitad de página
  doc.setLineDashPattern([3, 3], 0);
  doc.setDrawColor(100, 100, 100);
  doc.line(0, pageHeight / 2, pageWidth, pageHeight / 2);

  // Borde alrededor de la etiqueta
  doc.setLineDashPattern([0, 0], 0);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.rect(5, 5, pageWidth - 10, pageHeight / 2 - 10);

  // Añadir instrucciones debajo de la línea
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text('Doble por la línea punteada', pageWidth / 2, pageHeight / 2 + 5, { align: 'center' });

  // Información del remitente en área inferior
  const senderY = pageHeight / 2 + 15;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('REMITENTE:', margin, senderY);
  doc.setFont('helvetica', 'normal');
  doc.text('Civetta Fashion', margin, senderY + 5);
  doc.text('Quito, Ecuador', margin, senderY + 10);

  // Pequeño recuadro decorativo para la etiqueta
  doc.setDrawColor(220, 100, 150);
  doc.setLineWidth(2);
  doc.setLineDashPattern([0, 0], 0);
  doc.roundedRect(3, 3, pageWidth - 6, pageHeight / 2 - 6, 2, 2, 'S');

  // Devolver como buffer
  return Buffer.from(doc.output('arraybuffer'));
}

/**
 * Registra las rutas de etiquetas de envío
 */
export function registerNewShippingRoutes(app: Express) {
  console.log('🔄 Registrando rutas de etiquetas de envío (NUEVA VERSIÓN)');

  // Endpoint para generar etiquetas desde órdenes existentes
  app.get('/api/shipping/label/:orderId', async (req: Request, res: Response) => {
    console.log('⚡ Petición recibida para generar etiqueta, orden ID:', req.params.orderId);

    try {
      const orderId = parseInt(req.params.orderId);
      if (isNaN(orderId)) {
        console.error('⚠️ ID de orden inválido:', req.params.orderId);
        return res.status(400).json({ error: 'ID de orden inválido' });
      }

      // Obtener la orden con todos los datos relacionados necesarios
      const order = await db.query.orders.findFirst({
        where: eq(orders.id, orderId),
        with: {
          items: true,
          assignedUser: true
        }
      });

      if (!order) {
        console.error('⚠️ Orden no encontrada:', orderId);
        return res.status(404).json({ error: 'Orden no encontrada' });
      }

      // Obtener datos actualizados del cliente directamente desde la base de datos
      const customer = await db.query.customers.findFirst({
        where: eq(customers.id, order.customerId)
      });

      if (!customer) {
        console.error('⚠️ Cliente no encontrado para la orden:', orderId);
        return res.status(404).json({ error: 'Cliente no encontrado para esta orden' });
      }

      console.log('✅ Orden encontrada, ID:', order.id, 'Cliente:', customer.name);
      console.log('[OrderService] Datos completos del cliente para orden', orderId, ':', customer);

      // Extraer información de envío 
      let shippingInfo: any = {};

      if (order.shippingAddress) {
        try {
          if (typeof order.shippingAddress === 'string') {
            shippingInfo = JSON.parse(order.shippingAddress);
          } else {
            shippingInfo = order.shippingAddress;
          }
        } catch (e) {
          console.error('⚠️ Error al parsear datos de envío:', e);
          shippingInfo = {};
        }
      }

      // Generar nombre completo utilizando firstName y lastName para mayor precisión
      const fullName = customer.firstName && customer.lastName 
        ? `${customer.firstName} ${customer.lastName}`
        : customer.name;

      // Preparar datos para la etiqueta utilizando PRINCIPALMENTE los datos del cliente
      // Solo usar la información de envío de la orden para campos específicos que no deben cambiar
      const labelData = {
        // Usar siempre el nombre actualizado del cliente
        name: fullName || customer.name || `Cliente #${order.customerId}`,
        // Usar siempre el teléfono actualizado del cliente
        phone: String(customer.phone || shippingInfo.phone || 'No disponible'),
        // Usar siempre la dirección actualizada del cliente
        street: String(customer.street || shippingInfo.street || 'No disponible'),
        // Usar siempre la ciudad actualizada del cliente
        city: String(customer.city || shippingInfo.city || 'No disponible'),
        // Usar siempre la provincia actualizada del cliente
        province: String(customer.province || shippingInfo.province || 'No disponible'),
        // Usar siempre el número de identificación actualizado del cliente
        idNumber: String(customer.idNumber || shippingInfo.idNumber || 'No disponible'),
        // Estos campos específicos de la orden se mantienen igual
        orderNumber: order.orderNumber || `ORD-${order.id.toString().padStart(6, '0')}`,
        trackingNumber: order.trackingNumber || '',
        // Usar siempre las instrucciones actualizadas del cliente
        instructions: String(customer.deliveryInstructions || shippingInfo.instructions || ''),
        companyName: customer.type === 'company' && customer.name ? customer.name : undefined
      };
      
      console.log('✅ Datos del cliente actualizados para etiqueta:', {
        nombre: labelData.name,
        telefono: labelData.phone,
        direccion: labelData.street,
        ciudad: labelData.city,
        provincia: labelData.province,
        instrucciones: labelData.instructions
      });

      console.log('📄 Generando etiqueta con datos:', labelData);

      // Generar el PDF
      try {
        const pdfBuffer = generateSimpleShippingLabel(labelData);

        // Guardar temporalmente el PDF (para debugging si es necesario)
        const tempDir = ensureTempDir();
        const tempFilename = `etiqueta_${orderId}_${uuidv4().substring(0, 8)}.pdf`;
        const tempPath = path.join(tempDir, tempFilename);
        fs.writeFileSync(tempPath, pdfBuffer);

        console.log('✅ PDF generado correctamente, tamaño:', pdfBuffer.length, 'bytes');
        console.log('💾 PDF guardado temporalmente en:', tempPath);

        // Enviar el PDF como respuesta
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=etiqueta-${labelData.orderNumber}.pdf`);
        res.setHeader('Content-Length', pdfBuffer.length.toString());

        // Enviar el buffer del PDF
        res.send(pdfBuffer);
        console.log('✅ PDF enviado al cliente correctamente');
      } catch (pdfError) {
        console.error('❌ Error al generar el PDF:', pdfError);
        res.status(500).json({ 
          error: 'Error al generar el PDF', 
          details: pdfError instanceof Error ? pdfError.message : String(pdfError)
        });
      }
    } catch (error) {
      console.error('❌ Error general al procesar la petición:', error);
      res.status(500).json({ 
        error: 'Error al generar la etiqueta de envío',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  console.log('✅ Rutas de etiquetas de envío (NUEVA VERSIÓN) registradas correctamente');
}

//This is the routes-shipping-new.ts file.  The changes are added here.  The original routes-shipping.ts file is assumed unchanged.
export function registerShippingRoutes(app: Express) {
  console.log('🔄 Registrando rutas de envío');

  app.post('/api/shipping/new', async (req: Request, res: Response) => {
    const formData = req.body;
    const { sourceEnum, ordersService } = req; // Assuming these are available in the request context

    let customerId = formData.customerId;
    let shippingInfo = formData.shippingAddress;


    // Try multiple ways to find existing customer
    let customer = null;

    // Check by ID if provided
    if (customerId) {
      customer = await db.query.customers.findFirst({
        where: eq(customers.id, customerId)
      });
    }

    // Try by identification number
    if (!customer && formData.idNumber) {
      customer = await db.query.customers.findFirst({
        where: eq(customers.idNumber, formData.idNumber)
      });
    }

    // Try by phone with improved matching
    if (!customer && formData.phone) {
      const cleanPhone = formData.phone.replace(/\D/g, '');
      customer = await db.query.customers.findFirst({
        where: or(
          eq(customers.phone, formData.phone),
          eq(customers.phone, cleanPhone),
          like(customers.phone, `%${cleanPhone.slice(-8)}`)
        )
      });
    }

    // Try by email
    if (!customer && formData.email) {
      customer = await db.query.customers.findFirst({
        where: eq(customers.email, formData.email)
      });
    }

    // If customer found, use existing ID
    if (customer) {
      customerId = customer.id;
      console.log('[SHIPPING-NEW] Cliente existente encontrado, ID:', customerId);
    } else {
      console.log('[SHIPPING-NEW] No se encontró cliente existente, creando uno nuevo');
      const insertedCustomer = await db
        .insert(customers)
        .values({
          name: formData.name,
          phone: formData.phone || null,
          email: formData.email || null,
          idNumber: formData.idNumber || null,
          street: formData.street || null,
          city: formData.city || null,
          province: formData.province || null,
          source: 'web_form',
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning({ id: customers.id });

      if (!insertedCustomer[0]?.id) {
        throw new Error('Error al crear el cliente: No se obtuvo ID');
      }

      customerId = insertedCustomer[0].id;
      console.log('[SHIPPING-NEW] Nuevo cliente creado, ID:', customerId);
    }

    // Usar el servicio de órdenes para crear una orden sin productos
    try {
      const orderResult = await ordersService.createOrderFromShippingForm({
        customerId,
        customerName: formData.name,
        shippingAddress: shippingInfo,
        items: [],
        source: sourceEnum.WEBSITE
      });
      res.status(201).json(orderResult);
    } catch (error) {
      console.error('❌ Error al crear la orden:', error);
      res.status(500).json({ error: 'Error al crear la orden', details: error });
    }
  });

  console.log('✅ Rutas de envío registradas correctamente');
}