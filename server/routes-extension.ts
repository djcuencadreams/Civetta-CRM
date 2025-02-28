import { Express, Request, Response } from "express";
import { db } from "@db";
import { and, eq, desc, gte, lte, like, sql } from "drizzle-orm";
import { customers, leads, sales } from "@db/schema";
import * as XLSX from 'xlsx';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

/**
 * Genera un archivo Excel directamente desde los datos
 * Esta función evita problemas de codificación y separadores
 * 
 * @param formattedData Datos a convertir en Excel
 * @returns Buffer con el archivo Excel generado
 */
function generateExcelBuffer(formattedData: Record<string, any>[]): Buffer {
  // Crear un nuevo libro de trabajo
  const workbook = XLSX.utils.book_new();
  
  // Crear una hoja de trabajo a partir de los datos
  const worksheet = XLSX.utils.json_to_sheet(formattedData);
  
  // Añadir la hoja al libro
  XLSX.utils.book_append_sheet(workbook, worksheet, "Datos");
  
  // Convertir el libro a un buffer
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
  
  return excelBuffer;
}

// Set up temporary storage for files
const tempDir = path.join(process.cwd(), 'temp_excel');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Set up multer for disk storage to properly handle large files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

// Create multer instance with the new storage config
const upload = multer({ 
  storage, 
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

export function registerAdditionalRoutes(app: Express) {
  // Route for exporting customers data
  app.get("/api/export/customers", async (req: Request, res: Response) => {
    try {
      const { 
        dateStart, 
        dateEnd, 
        brand, 
        province, 
        city, 
        source 
      } = req.query;
      
      // Debug info
      console.log('Exportación de clientes:', {
        dateStartRaw: dateStart,
        dateEndRaw: dateEnd,
        queryParams: req.query,
        url: req.url
      });
      
      // Construct the query using SQL
      let queryStr = `
        SELECT id, name, first_name, last_name, email, phone, 
               phone_country, phone_number, street, city, province, 
               delivery_instructions, address, source, brand, notes,
               created_at, updated_at
        FROM customers
        WHERE 1=1
      `;
      
      const queryParams: any[] = [];
      
      // Apply filters
      if (dateStart && dateEnd) {
        queryStr += ` AND created_at BETWEEN $${queryParams.length + 1} AND $${queryParams.length + 2}`;
        
        // Parse dates and ensure end date includes the entire day
        const startDate = new Date(dateStart as string);
        const endDate = new Date(dateEnd as string);
        endDate.setHours(23, 59, 59, 999);
        
        queryParams.push(startDate, endDate);
        console.log('Filtro de fecha aplicado:', { 
          startDate: startDate.toISOString(), 
          endDate: endDate.toISOString() 
        });
      }
      
      if (brand) {
        queryStr += ` AND brand = $${queryParams.length + 1}`;
        queryParams.push(brand);
      }
      
      if (province) {
        queryStr += ` AND province = $${queryParams.length + 1}`;
        queryParams.push(province);
      }
      
      if (city) {
        queryStr += ` AND city = $${queryParams.length + 1}`;
        queryParams.push(city);
      }
      
      if (source) {
        queryStr += ` AND source = $${queryParams.length + 1}`;
        queryParams.push(source);
      }
      
      // Add order by clause
      queryStr += ` ORDER BY created_at DESC`;
      
      // Execute the query
      const result = await db.$client.query(queryStr, queryParams);
      const data = result.rows;
      
      // Preparar los datos formateados para CSV
      const formattedData = data.map(customer => ({
        ID: customer.id,
        Nombre: customer.name,
        'Nombre de pila': customer.first_name || '',
        Apellido: customer.last_name || '',
        Email: customer.email || '',
        Teléfono: (customer.phone_country ? `${customer.phone_country} ` : '') + (customer.phone_number || customer.phone || ''),
        Ciudad: customer.city || '',
        Provincia: customer.province || '',
        Dirección: customer.street || customer.address || '',
        Marca: customer.brand || '',
        Origen: customer.source || '',
        'ID Número': customer.id_number || '',
        'Instrucciones de entrega': customer.delivery_instructions || '',
        Notas: customer.notes || '',
        'Fecha Creación': new Date(customer.created_at).toISOString().split('T')[0] || ''
      }));
      
      // Generar Excel nativo con la función auxiliar
      const buffer = generateExcelBuffer(formattedData);
      
      // Set headers for Excel file
      res.setHeader('Content-Disposition', 'attachment; filename=clientes.xlsx');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Length', buffer.length);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      // Log the export
      console.log(`Exportando ${data.length} clientes, tamaño: ${buffer.length} bytes`);
      
      // Send file
      res.send(buffer);
    } catch (error) {
      console.error('Error exporting customers:', error);
      res.status(500).json({ error: "Error al exportar clientes" });
    }
  });
  
  // Route for exporting sales data
  app.get("/api/export/sales", async (req: Request, res: Response) => {
    try {
      const { 
        dateStart, 
        dateEnd, 
        brand, 
        status 
      } = req.query;
      
      // Construct the query using SQL
      let queryStr = `
        SELECT s.id, s.customer_id, c.name as customer_name, s.amount, 
               s.status, s.payment_method, s.brand, s.notes, 
               s.created_at, s.updated_at
        FROM sales s
        LEFT JOIN customers c ON s.customer_id = c.id
        WHERE 1=1
      `;
      
      const queryParams: any[] = [];
      
      // Apply filters
      if (dateStart && dateEnd) {
        queryStr += ` AND s.created_at BETWEEN $${queryParams.length + 1} AND $${queryParams.length + 2}`;
        
        // Parse dates and ensure end date includes the entire day
        const startDate = new Date(dateStart as string);
        const endDate = new Date(dateEnd as string);
        endDate.setHours(23, 59, 59, 999);
        
        queryParams.push(startDate, endDate);
        console.log('Filtro de fecha aplicado en ventas:', { 
          startDate: startDate.toISOString(), 
          endDate: endDate.toISOString() 
        });
      }
      
      if (brand) {
        queryStr += ` AND s.brand = $${queryParams.length + 1}`;
        queryParams.push(brand);
      }
      
      if (status) {
        queryStr += ` AND s.status = $${queryParams.length + 1}`;
        queryParams.push(status);
      }
      
      // Add order by clause
      queryStr += ` ORDER BY s.created_at DESC`;
      
      // Execute the query
      const result = await db.$client.query(queryStr, queryParams);
      const data = result.rows;
      
      // Preparar los datos formateados para CSV
      const formattedData = data.map(sale => ({
        ID: sale.id,
        'ID Cliente': sale.customer_id,
        'Nombre Cliente': sale.customer_name || '',
        Monto: sale.amount,
        Estado: sale.status || '',
        'Método de Pago': sale.payment_method || '',
        Marca: sale.brand || '',
        Notas: sale.notes || '',
        'Fecha Creación': new Date(sale.created_at).toISOString().split('T')[0] || ''
      }));
      
      // Generar TSV con la función auxiliar
      const buffer = generateTsvContent(formattedData);
      
      // Set headers for TSV
      res.setHeader('Content-Disposition', 'attachment; filename=ventas.csv');
      res.setHeader('Content-Type', 'text/tab-separated-values; charset=utf-8');
      res.setHeader('Content-Length', buffer.length);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      // Log the export
      console.log(`Exportando ${data.length} ventas, tamaño: ${buffer.length} bytes`);
      
      // Send file
      res.send(buffer);
    } catch (error) {
      console.error('Error exporting sales:', error);
      res.status(500).json({ error: "Error al exportar ventas" });
    }
  });
  
  // Route for exporting leads data
  app.get("/api/export/leads", async (req: Request, res: Response) => {
    try {
      const { 
        dateStart, 
        dateEnd, 
        brand, 
        status, 
        source 
      } = req.query;
      
      // Construct the query using SQL
      let queryStr = `
        SELECT id, name, first_name, last_name, email, phone, 
               phone_country, phone_number, street, city, province, 
               delivery_instructions, status, source, brand, notes,
               converted_to_customer, converted_customer_id, 
               last_contact, next_follow_up, customer_lifecycle_stage,
               created_at, updated_at
        FROM leads
        WHERE 1=1
      `;
      
      const queryParams: any[] = [];
      
      // Apply filters
      if (dateStart && dateEnd) {
        queryStr += ` AND created_at BETWEEN $${queryParams.length + 1} AND $${queryParams.length + 2}`;
        
        // Parse dates and ensure end date includes the entire day
        const startDate = new Date(dateStart as string);
        const endDate = new Date(dateEnd as string);
        endDate.setHours(23, 59, 59, 999);
        
        queryParams.push(startDate, endDate);
        console.log('Filtro de fecha aplicado en leads:', { 
          startDate: startDate.toISOString(), 
          endDate: endDate.toISOString() 
        });
      }
      
      if (brand) {
        queryStr += ` AND brand = $${queryParams.length + 1}`;
        queryParams.push(brand);
      }
      
      if (status) {
        queryStr += ` AND status = $${queryParams.length + 1}`;
        queryParams.push(status);
      }
      
      if (source) {
        queryStr += ` AND source = $${queryParams.length + 1}`;
        queryParams.push(source);
      }
      
      // Add order by clause
      queryStr += ` ORDER BY created_at DESC`;
      
      // Execute the query
      const result = await db.$client.query(queryStr, queryParams);
      const data = result.rows;
      
      // Preparar los datos formateados para CSV
      const formattedData = data.map(lead => ({
        ID: lead.id,
        Nombre: lead.name,
        'Nombre de pila': lead.first_name || '',
        Apellido: lead.last_name || '',
        Email: lead.email || '',
        Teléfono: (lead.phone_country ? `${lead.phone_country} ` : '') + (lead.phone_number || lead.phone || ''),
        Ciudad: lead.city || '',
        Provincia: lead.province || '',
        Dirección: lead.street || '',
        Marca: lead.brand || '',
        Origen: lead.source || '',
        Estado: lead.status || '',
        'Etapa': lead.customer_lifecycle_stage || '',
        'Convertido a Cliente': lead.converted_to_customer ? 'Sí' : 'No',
        'ID Cliente convertido': lead.converted_customer_id || '',
        'Fecha Último Contacto': lead.last_contact ? new Date(lead.last_contact).toISOString().split('T')[0] : '',
        'Fecha Próximo Seguimiento': lead.next_follow_up ? new Date(lead.next_follow_up).toISOString().split('T')[0] : '',
        'Fecha Creación': new Date(lead.created_at).toISOString().split('T')[0] || ''
      }));
      
      // Generar TSV con la función auxiliar
      const buffer = generateTsvContent(formattedData);
      
      // Set headers for TSV
      res.setHeader('Content-Disposition', 'attachment; filename=leads.csv');
      res.setHeader('Content-Type', 'text/tab-separated-values; charset=utf-8');
      res.setHeader('Content-Length', buffer.length);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      // Log the export
      console.log(`Exportando ${data.length} leads, tamaño: ${buffer.length} bytes`);
      
      // Send file
      res.send(buffer);
    } catch (error) {
      console.error('Error exporting leads:', error);
      res.status(500).json({ error: "Error al exportar leads" });
    }
  });
  
  // Route for exporting all data (complete report)
  app.get("/api/export/all", async (req: Request, res: Response) => {
    try {
      const { dateStart, dateEnd, brand } = req.query;
      
      // Parse dates and ensure end date includes the entire day
      let startDate = dateStart ? new Date(dateStart as string) : null;
      let endDate = dateEnd ? new Date(dateEnd as string) : null;
      
      if (endDate) {
        endDate.setHours(23, 59, 59, 999);
      }
      
      console.log('Exportando reporte completo - Filtros:', {
        dateStart: startDate?.toISOString(),
        dateEnd: endDate?.toISOString(),
        brand: brand
      });
      
      // Construir condiciones de fecha para consultas
      let dateCondition = '';
      let dateParams: any[] = [];
      
      if (startDate && endDate) {
        dateCondition = 'WHERE created_at BETWEEN $1 AND $2';
        dateParams = [startDate, endDate];
        console.log('Filtro de fecha aplicado en exportación completa:', { 
          startDate: startDate.toISOString(), 
          endDate: endDate.toISOString() 
        });
      }
      
      // Gather all data using SQL queries
      
      // Customers data
      const customersQuery = `
        SELECT id, name, first_name, last_name, email, phone, 
               phone_country, phone_number, street, city, province, 
               delivery_instructions, address, source, brand, notes,
               created_at, updated_at
        FROM customers
        ${dateCondition ? dateCondition : ''}
        ${brand ? (dateCondition ? ' AND ' : ' WHERE ') + `brand = '${brand}'` : ''}
        ORDER BY created_at DESC
      `;
      const customersResult = await db.$client.query(customersQuery, dateParams)
      const customersData = customersResult.rows;
      
      // Sales data
      const salesQuery = `
        SELECT s.id, s.customer_id, c.name as customer_name, s.amount, 
               s.status, s.payment_method, s.brand, s.notes, 
               s.created_at, s.updated_at
        FROM sales s
        LEFT JOIN customers c ON s.customer_id = c.id
        ${dateCondition ? dateCondition.replace('created_at', 's.created_at') : ''}
        ${brand ? (dateCondition ? ' AND ' : ' WHERE ') + `s.brand = '${brand}'` : ''}
        ORDER BY s.created_at DESC
      `;
      const salesResult = await db.$client.query(salesQuery, dateParams);
      const salesData = salesResult.rows;
      
      // Leads data
      const leadsQuery = `
        SELECT id, name, first_name, last_name, email, phone, 
               phone_country, phone_number, street, city, province, 
               delivery_instructions, status, source, brand, notes,
               converted_to_customer, converted_customer_id, 
               last_contact, next_follow_up, customer_lifecycle_stage,
               created_at, updated_at
        FROM leads
        ${dateCondition ? dateCondition : ''}
        ${brand ? (dateCondition ? ' AND ' : ' WHERE ') + `brand = '${brand}'` : ''}
        ORDER BY created_at DESC
      `;
      const leadsResult = await db.$client.query(leadsQuery, dateParams);
      const leadsData = leadsResult.rows;
      
      // Format data for export
      
      // Customers
      const formattedCustomersData = customersData.map(customer => ({
        Tipo: 'Cliente',
        ID: customer.id,
        Nombre: customer.name,
        'Nombre de pila': customer.first_name || '',
        Apellido: customer.last_name || '',
        Email: customer.email || '',
        Teléfono: (customer.phone_country ? `${customer.phone_country} ` : '') + (customer.phone_number || customer.phone || ''),
        Ciudad: customer.city || '',
        Provincia: customer.province || '',
        Dirección: customer.street || customer.address || '',
        Marca: customer.brand || '',
        Origen: customer.source || '',
        Estado: '',
        'ID Número': customer.id_number || '',
        'Instrucciones de entrega': customer.delivery_instructions || '',
        Notas: customer.notes || '',
        'Fecha Creación': new Date(customer.created_at).toISOString().split('T')[0] || ''
      }));
      
      // Sales
      const formattedSalesData = salesData.map(sale => ({
        Tipo: 'Venta',
        ID: sale.id,
        Nombre: sale.customer_name || '',
        'ID Cliente': sale.customer_id,
        Monto: sale.amount,
        Estado: sale.status || '',
        'Método de Pago': sale.payment_method || '',
        Marca: sale.brand || '',
        Notas: sale.notes || '',
        'Fecha Creación': new Date(sale.created_at).toISOString().split('T')[0] || ''
      }));
      
      // Leads
      const formattedLeadsData = leadsData.map(lead => ({
        Tipo: 'Lead',
        ID: lead.id,
        Nombre: lead.name,
        'Nombre de pila': lead.first_name || '',
        Apellido: lead.last_name || '',
        Email: lead.email || '',
        Teléfono: (lead.phone_country ? `${lead.phone_country} ` : '') + (lead.phone_number || lead.phone || ''),
        Ciudad: lead.city || '',
        Provincia: lead.province || '',
        Dirección: lead.street || '',
        Marca: lead.brand || '',
        Origen: lead.source || '',
        Estado: lead.status || '',
        'Etapa': lead.customer_lifecycle_stage || '',
        'Convertido a Cliente': lead.converted_to_customer ? 'Sí' : 'No',
        'ID Cliente convertido': lead.converted_customer_id || '',
        'Fecha Último Contacto': lead.last_contact ? new Date(lead.last_contact).toISOString().split('T')[0] : '',
        'Fecha Próximo Seguimiento': lead.next_follow_up ? new Date(lead.next_follow_up).toISOString().split('T')[0] : '',
        'Fecha Creación': new Date(lead.created_at).toISOString().split('T')[0] || ''
      }));
      
      // Combine all data for export
      const allData = [...formattedCustomersData, ...formattedSalesData, ...formattedLeadsData];
      
      // Generar TSV con la función auxiliar
      const buffer = generateTsvContent(allData);
      
      // Set headers for TSV
      res.setHeader('Content-Disposition', 'attachment; filename=reporte_completo.csv');
      res.setHeader('Content-Type', 'text/tab-separated-values; charset=utf-8');
      res.setHeader('Content-Length', buffer.length);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      // Log the export
      console.log(`Exportando reporte completo: ${customersData.length} clientes, ${salesData.length} ventas, ${leadsData.length} leads, tamaño: ${buffer.length} bytes`);
      
      // Send file
      res.send(buffer);
    } catch (error) {
      console.error('Error exportando reporte completo:', error);
      res.status(500).json({ error: "Error al exportar reporte completo" });
    }
  });
  
  // Route for custom exports
  app.post("/api/export/custom", async (req: Request, res: Response) => {
    try {
      const { 
        dataType,
        dateStart, 
        dateEnd, 
        fields,
        filters
      } = req.body;
      
      if (!dataType) {
        return res.status(400).json({ error: "Tipo de datos no especificado" });
      }
      
      console.log('Exportación personalizada:', {
        dataType,
        dateStart,
        dateEnd,
        fields: fields?.length || 0,
        filters
      });
      
      // Parse dates and ensure end date includes the entire day
      let startDate = dateStart ? new Date(dateStart) : null;
      let endDate = dateEnd ? new Date(dateEnd) : null;
      
      if (endDate) {
        endDate.setHours(23, 59, 59, 999);
      }
      
      // Set default table and fields based on data type
      let table = '';
      let defaultFields = '';
      
      switch(dataType) {
        case 'customers':
          table = 'customers';
          defaultFields = 'id, name, email, phone, city, province, brand, source, created_at';
          break;
        case 'leads':
          table = 'leads';
          defaultFields = 'id, name, email, phone, status, city, province, brand, source, created_at';
          break;
        case 'sales':
          table = 'sales s LEFT JOIN customers c ON s.customer_id = c.id';
          defaultFields = 's.id, s.customer_id, c.name as customer_name, s.amount, s.status, s.payment_method, s.brand, s.created_at';
          break;
        default:
          return res.status(400).json({ error: "Tipo de datos no válido" });
      }
      
      // Use requested fields if provided, otherwise use defaults
      const selectedFields = fields && fields.length > 0 
        ? fields.join(', ') 
        : defaultFields;
      
      // Build the query
      let queryStr = `
        SELECT ${selectedFields}
        FROM ${table}
        WHERE 1=1
      `;
      
      const queryParams: any[] = [];
      
      // Apply date filters
      if (startDate && endDate) {
        const dateField = dataType === 'sales' ? 's.created_at' : 'created_at';
        queryStr += ` AND ${dateField} BETWEEN $${queryParams.length + 1} AND $${queryParams.length + 2}`;
        queryParams.push(startDate, endDate);
        console.log('Filtro de fecha aplicado en exportación personalizada:', { 
          startDate: startDate.toISOString(), 
          endDate: endDate.toISOString() 
        });
      }
      
      // Apply additional filters
      if (filters) {
        if (filters.brand) {
          const brandField = dataType === 'sales' ? 's.brand' : 'brand';
          queryStr += ` AND ${brandField} = $${queryParams.length + 1}`;
          queryParams.push(filters.brand);
        }
        
        if (filters.status && (dataType === 'sales' || dataType === 'leads')) {
          const statusField = dataType === 'sales' ? 's.status' : 'status';
          queryStr += ` AND ${statusField} = $${queryParams.length + 1}`;
          queryParams.push(filters.status);
        }
        
        if (filters.province && dataType !== 'sales') {
          queryStr += ` AND province = $${queryParams.length + 1}`;
          queryParams.push(filters.province);
        }
        
        if (filters.city && dataType !== 'sales') {
          queryStr += ` AND city = $${queryParams.length + 1}`;
          queryParams.push(filters.city);
        }
        
        if (filters.source && dataType !== 'sales') {
          queryStr += ` AND source = $${queryParams.length + 1}`;
          queryParams.push(filters.source);
        }
      }
      
      // Add order by clause
      const orderByField = dataType === 'sales' ? 's.created_at' : 'created_at';
      queryStr += ` ORDER BY ${orderByField} DESC`;
      
      // Execute the query
      const result = await db.$client.query(queryStr, queryParams);
      const data = result.rows;
      
      if (data.length === 0) {
        return res.status(404).json({ error: "No se encontraron datos para exportar" });
      }
      
      // Generar TSV con la función auxiliar
      const buffer = generateTsvContent(data);
      
      // Set filename based on dataType
      let filename = '';
      switch(dataType) {
        case 'customers':
          filename = 'clientes_personalizados.csv';
          break;
        case 'leads':
          filename = 'leads_personalizados.csv';
          break;
        case 'sales':
          filename = 'ventas_personalizadas.csv';
          break;
        default:
          filename = 'exportacion_personalizada.csv';
      }
      
      // Set headers for TSV
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      res.setHeader('Content-Type', 'text/tab-separated-values; charset=utf-8');
      res.setHeader('Content-Length', buffer.length);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      // Log the export
      console.log(`Exportando ${data.length} registros personalizados de ${dataType}, tamaño: ${buffer.length} bytes`);
      
      // Send file
      res.send(buffer);
    } catch (error) {
      console.error('Error en exportación personalizada:', error);
      res.status(500).json({ error: "Error al generar exportación personalizada" });
    }
  });
}