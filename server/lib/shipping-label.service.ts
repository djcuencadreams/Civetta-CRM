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
  idNumber?: string;
  deliveryInstructions?: string;
  orderNumber?: string;
  trackingNumber?: string;
  companyName?: string;
}

/**
 * Genera un PDF de etiqueta de envío a partir de los datos proporcionados
 * Esta versión utiliza jsPDF para crear directamente el PDF
 * 
 * @param data Datos para la etiqueta de envío
 * @returns Buffer con el PDF generado
 */
export async function generateShippingLabelPdf(data: ShippingLabelData): Promise<Buffer> {
  try {
    log('Generando etiqueta de envío con jsPDF', 'shipping-service');
    
    // Crear un nuevo documento PDF tamaño A5
    // A5 es 148x210mm, orientación landscape para la etiqueta de envío
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a5'
    });
    
    // Configurar fuentes
    doc.setFont('helvetica', 'normal');
    
    // Dibujar bordes y cabecera
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Configurar el documento
    const margin = 10;
    
    // Dibujar borde
    doc.setLineWidth(0.5);
    doc.rect(margin, margin, pageWidth - (margin * 2), pageHeight - (margin * 2));
    
    // Logo o nombre de la compañía
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(data.companyName || 'CIVETTA', pageWidth / 2, margin + 10, { align: 'center' });
    
    // Subtítulo
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('ETIQUETA DE ENVÍO', pageWidth / 2, margin + 18, { align: 'center' });
    
    // Línea horizontal después del encabezado
    doc.setLineWidth(0.3);
    doc.line(margin + 5, margin + 22, pageWidth - margin - 5, margin + 22);
    
    // Fecha y número de orden
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const fechaActual = new Date().toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    
    doc.text(`Fecha: ${fechaActual}`, margin + 10, margin + 30);
    
    if (data.orderNumber) {
      doc.text(`Orden #: ${data.orderNumber}`, pageWidth - margin - 50, margin + 30);
    }
    
    // Datos del destinatario
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('DESTINATARIO:', margin + 10, margin + 40);
    
    doc.setFontSize(14);
    doc.text(data.name, margin + 10, margin + 48);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    if (data.idNumber) {
      doc.text(`ID/RUC: ${data.idNumber}`, margin + 10, margin + 55);
    }
    
    doc.text(`Teléfono: ${data.phone}`, margin + 10, margin + 62);
    doc.text(`Dirección: ${data.street}`, margin + 10, margin + 69);
    doc.text(`Ciudad: ${data.city}, ${data.province}`, margin + 10, margin + 76);
    
    // Instrucciones de entrega si existen
    if (data.deliveryInstructions) {
      doc.setLineWidth(0.3);
      doc.rect(margin + 10, margin + 83, pageWidth - (margin * 2) - 20, 30);
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('INSTRUCCIONES DE ENTREGA:', margin + 12, margin + 89);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(data.deliveryInstructions, margin + 12, margin + 95, {
        maxWidth: pageWidth - (margin * 2) - 24
      });
    }
    
    // Código QR (simulado con un cuadrado)
    doc.setLineWidth(0.5);
    doc.rect(pageWidth - margin - 40, margin + 40, 30, 30);
    doc.setFontSize(8);
    doc.text('Código QR', pageWidth - margin - 25, margin + 55, { align: 'center' });
    
    // Pie de página
    doc.setFontSize(8);
    doc.text('CIVETTA CRM - Sistema de Gestión de Envíos', pageWidth / 2, pageHeight - margin - 5, { align: 'center' });
    
    // Convertir a Buffer
    const pdfBytes = doc.output('arraybuffer');
    return Buffer.from(pdfBytes);
  } catch (error) {
    log(`Error generating shipping label PDF: ${error}`, 'shipping-service');
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