/**
 * Servicio para generar etiquetas de envío en formato PDF utilizando jsPDF
 */

import * as fs from 'fs';
import * as path from 'path';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { log } from '../vite';

// Define el tipo para la función autotable que se agrega a jsPDF
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

interface ShippingLabelData {
  name: string;
  phone: string;
  street: string;
  city: string;
  province: string;
  idNumber: string; // Changed to required
  deliveryInstructions?: string;
  orderNumber?: string;
  trackingNumber?: string;
  companyName?: string;
  isIncompleteOrder?: boolean;
}

/**
 * Genera un PDF de etiqueta de envío a partir de los datos proporcionados
 * Esta versión utiliza jsPDF para crear directamente el PDF
 * 
 * Nota: Esta función no requiere información de productos para funcionar.
 * Simplemente genera la etiqueta con los datos del cliente y dirección de envío.
 * 
 * @param data Datos para la etiqueta de envío
 * @returns Buffer con el PDF generado
 */
export async function generateShippingLabelPdf(data: ShippingLabelData): Promise<Buffer> {
  try {
    log('Generando etiqueta de envío con jsPDF', 'shipping-service');
    
    // Validar campos requeridos para la etiqueta
    const requiredFields = {
      name: 'nombre',
      idNumber: 'cédula o pasaporte',
      street: 'dirección',
      city: 'ciudad',
      province: 'provincia',
      phone: 'teléfono'
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([key]) => !data[key])
      .map(([, label]) => label);

    if (missingFields.length > 0) {
      const errorMsg = `No se puede generar la etiqueta. Campos requeridos faltantes: ${missingFields.join(', ')}`;
      log(`ERROR: ${errorMsg}`, 'shipping-service');
      throw new Error(errorMsg);
    }

    // Si la orden está incompleta (sin productos/monto), agregar warning en el log
    if (data.isIncompleteOrder) {
      log('WARNING: Generando etiqueta para orden incompleta (sin productos o monto total)', 'shipping-service');
    }
    
    // Completar datos faltantes con valores predeterminados
    const safeData = {
      ...data,
      phone: data.phone || 'No disponible',
      street: data.street || 'No especificada',
      city: data.city || 'No especificada',
      province: data.province || 'No especificada',
      idNumber: data.idNumber || 'No disponible',
      deliveryInstructions: data.deliveryInstructions || '',
      orderNumber: data.orderNumber || 'N/A',
      companyName: data.companyName || 'Civetta'
    };
    
    log(JSON.stringify(safeData), 'shipping-service');
    
    try {
      // Crear un nuevo documento PDF tamaño A4
      // A4 es 210x297mm, orientación portrait para usar media hoja como etiqueta
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      // Configurar fuentes
      doc.setFont('helvetica', 'normal');
      
      // Definir dimensiones
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 10;
      
      // Añadir título principal para identificar claramente que es una etiqueta
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('ETIQUETA DE ENVÍO', pageWidth / 2, margin, { align: 'center' });
      
      try {
        // Intentar cargar el logo
        const logoPath = path.join(process.cwd(), 'media', 'logoCivetta01.png');
        log(`Buscando logo en: ${logoPath}`, 'shipping-service');
        
        if (fs.existsSync(logoPath)) {
          log(`Logo encontrado en ${logoPath}`, 'shipping-service');
          // Cargar el logo como base64
          const logoData = fs.readFileSync(logoPath);
          const logoBase64 = 'data:image/png;base64,' + logoData.toString('base64');
          
          // Insertar logo (centrado, con tamaño ajustado)
          const logoHeight = 15; // altura fija en mm
          doc.addImage(logoBase64, 'PNG', pageWidth / 2 - 20, margin + 5, 40, logoHeight, undefined, 'FAST');
        } else {
          // Si no se encuentra el logo, usar texto
          log(`Logo no encontrado, usando texto alternativo`, 'shipping-service');
          doc.setFontSize(28);
          doc.setTextColor(232, 62, 140); // Color rosa similar al logo
          doc.setFont('helvetica', 'italic');
          doc.text('Civetta', pageWidth / 2, margin + 15, { align: 'center' });
          doc.setTextColor(0, 0, 0); // Volver al color negro
        }
      } catch (logoError) {
        // Si hay error al cargar el logo, usar texto
        log(`Error loading logo: ${logoError}`, 'shipping-service');
        doc.setFontSize(28);
        doc.setTextColor(232, 62, 140); // Color rosa similar al logo
        doc.setFont('helvetica', 'italic');
        doc.text('Civetta', pageWidth / 2, margin + 15, { align: 'center' });
        doc.setTextColor(0, 0, 0); // Volver al color negro
      }
      
      // Comenzar el contenido debajo del logo
      let yPos = margin + 30;
      
      // Datos del destinatario (usando un diseño similar a la segunda imagen)
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Nombre:', margin, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(safeData.name, margin + 40, yPos);
      
      yPos += 10;
      doc.setFont('helvetica', 'bold');
      doc.text('Cédula:', margin, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(safeData.idNumber, margin + 40, yPos);
      
      yPos += 10;
      doc.setFont('helvetica', 'bold');
      doc.text('Dirección:', margin, yPos);
      
      // Partir la dirección en múltiples líneas si es larga
      const maxWidth = pageWidth - margin * 2 - 40;
      const streetLines = doc.splitTextToSize(safeData.street, maxWidth);
      doc.setFont('helvetica', 'normal');
      doc.text(streetLines, margin + 40, yPos);
      
      // Ajustar posición vertical según número de líneas de dirección
      yPos += 5 * streetLines.length;
      
      yPos += 5;
      doc.setFont('helvetica', 'bold');
      doc.text('Ciudad:', margin, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(safeData.city, margin + 40, yPos);
      
      yPos += 10;
      doc.setFont('helvetica', 'bold');
      doc.text('Provincia:', margin, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(safeData.province, margin + 40, yPos);
      
      yPos += 10;
      doc.setFont('helvetica', 'bold');
      doc.text('Teléfono:', margin, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(safeData.phone, margin + 40, yPos);
      
      // Instrucciones de entrega si existen
      if (safeData.deliveryInstructions) {
        yPos += 15;
        doc.setFont('helvetica', 'bold');
        doc.text('Instrucciones:', margin, yPos);
        
        const instructionsLines = doc.splitTextToSize(safeData.deliveryInstructions, maxWidth);
        doc.setFont('helvetica', 'normal');
        doc.text(instructionsLines, margin + 40, yPos);
        
        // Ajustar posición vertical según número de líneas de instrucciones
        yPos += 5 * instructionsLines.length;
      }
      
      // Añadir fecha actual y número de orden en la parte inferior
      yPos = pageHeight / 2 - 20; // Cerca de la mitad de la página
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      const fechaActual = new Date().toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      
      doc.text(`Fecha: ${fechaActual}`, margin, yPos);
      
      if (safeData.orderNumber) {
        doc.text(`Orden #: ${safeData.orderNumber}`, pageWidth - margin - 50, yPos);
      }
      
      // Dibujar línea punteada en la mitad de la página (para doblar)
      doc.setLineDashPattern([3, 3], 0);
      doc.setDrawColor(150, 150, 150);
      doc.line(0, pageHeight / 2, pageWidth, pageHeight / 2);
      
      // Añadir un borde a la parte superior de la página (área de la etiqueta)
      doc.setLineDashPattern([0, 0], 0); // Línea sólida
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.rect(margin / 2, margin / 2, pageWidth - margin, pageHeight / 2 - margin);
      
      // Convertir a Buffer
      const pdfBytes = doc.output('arraybuffer');
      const buffer = Buffer.from(pdfBytes);
      
      log(`PDF generado correctamente, tamaño: ${buffer.length} bytes`, 'shipping-service');
      
      return buffer;
    } catch (pdfError) {
      log(`Error generando PDF con jsPDF: ${pdfError}`, 'shipping-service');
      throw new Error(`Error generando PDF: ${pdfError instanceof Error ? pdfError.message : String(pdfError)}`);
    }
  } catch (error) {
    log(`Error principal en generateShippingLabelPdf: ${error}`, 'shipping-service');
    throw error;
  }
}

/**
 * Se asegura de que exista el directorio para las plantillas de etiquetas de envío
 */
export function ensureShippingLabelTemplateDirectories() {
  try {
    const templatesDir = path.join(process.cwd(), 'templates/shipping');
    
    if (!fs.existsSync(templatesDir)) {
      fs.mkdirSync(templatesDir, { recursive: true });
      log('Created shipping label template directory', 'shipping-service');
    }
  } catch (error) {
    log(`Error creating shipping template directories: ${error}`, 'shipping-service');
  }
}