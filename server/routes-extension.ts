import { Express, Request, Response } from "express";
import { db } from "@db";
import { and, eq, desc, gte, lte, like, sql } from "drizzle-orm";
import { customers, leads, sales } from "@db/schema";
import * as XLSX from 'xlsx';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

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
        queryParams.push(new Date(dateStart as string), new Date(dateEnd as string));
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
      
      // Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(data.map(customer => ({
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
      })));
      
      // Create workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Clientes");
      
      // Convert to binary
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
      
      // Set headers
      res.setHeader('Content-Disposition', 'attachment; filename=clientes.xlsx');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      
      // Send file
      res.send(excelBuffer);
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
        queryParams.push(new Date(dateStart as string), new Date(dateEnd as string));
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
      
      // Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(data.map(sale => ({
        ID: sale.id,
        'ID Cliente': sale.customer_id,
        'Nombre Cliente': sale.customer_name || '',
        Monto: sale.amount,
        Estado: sale.status || '',
        'Método de Pago': sale.payment_method || '',
        Marca: sale.brand || '',
        Notas: sale.notes || '',
        'Fecha Creación': new Date(sale.created_at).toISOString().split('T')[0] || ''
      })));
      
      // Create workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Ventas");
      
      // Convert to binary
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
      
      // Set headers
      res.setHeader('Content-Disposition', 'attachment; filename=ventas.xlsx');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      
      // Send file
      res.send(excelBuffer);
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
        queryParams.push(new Date(dateStart as string), new Date(dateEnd as string));
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
      
      // Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(data.map(lead => ({
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
      })));
      
      // Create workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Leads");
      
      // Convert to binary
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
      
      // Set headers
      res.setHeader('Content-Disposition', 'attachment; filename=leads.xlsx');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      
      // Send file
      res.send(excelBuffer);
    } catch (error) {
      console.error('Error exporting leads:', error);
      res.status(500).json({ error: "Error al exportar leads" });
    }
  });
  
  // Route for exporting all data (complete report)
  app.get("/api/export/all", async (req: Request, res: Response) => {
    try {
      // Gather all data using SQL queries
      
      // Customers data
      const customersQuery = `
        SELECT id, name, first_name, last_name, email, phone, 
               phone_country, phone_number, street, city, province, 
               delivery_instructions, address, source, brand, notes,
               created_at, updated_at
        FROM customers
        ORDER BY created_at DESC
      `;
      const customersResult = await db.$client.query(customersQuery);
      const customersData = customersResult.rows;
      
      // Sales data
      const salesQuery = `
        SELECT s.id, s.customer_id, c.name as customer_name, s.amount, 
               s.status, s.payment_method, s.brand, s.notes, 
               s.created_at, s.updated_at
        FROM sales s
        LEFT JOIN customers c ON s.customer_id = c.id
        ORDER BY s.created_at DESC
      `;
      const salesResult = await db.$client.query(salesQuery);
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
        ORDER BY created_at DESC
      `;
      const leadsResult = await db.$client.query(leadsQuery);
      const leadsData = leadsResult.rows;
      
      // Create workbook with multiple sheets
      const workbook = XLSX.utils.book_new();
      
      // Customers worksheet
      const customersWorksheet = XLSX.utils.json_to_sheet(customersData.map(customer => ({
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
      })));
      XLSX.utils.book_append_sheet(workbook, customersWorksheet, "Clientes");
      
      // Sales worksheet
      const salesWorksheet = XLSX.utils.json_to_sheet(salesData.map(sale => ({
        ID: sale.id,
        'ID Cliente': sale.customer_id,
        'Nombre Cliente': sale.customer_name || '',
        Monto: sale.amount,
        Estado: sale.status || '',
        'Método de Pago': sale.payment_method || '',
        Marca: sale.brand || '',
        Notas: sale.notes || '',
        'Fecha Creación': new Date(sale.created_at).toISOString().split('T')[0] || ''
      })));
      XLSX.utils.book_append_sheet(workbook, salesWorksheet, "Ventas");
      
      // Leads worksheet
      const leadsWorksheet = XLSX.utils.json_to_sheet(leadsData.map(lead => ({
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
      })));
      XLSX.utils.book_append_sheet(workbook, leadsWorksheet, "Leads");
      
      // Convert to binary
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
      
      // Set headers
      res.setHeader('Content-Disposition', 'attachment; filename=reporte_completo.xlsx');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      
      // Send file
      res.send(excelBuffer);
    } catch (error) {
      console.error('Error exporting all data:', error);
      res.status(500).json({ error: "Error al exportar todos los datos" });
    }
  });
  
  // Route for exporting custom report
  app.post("/api/export/custom", async (req: Request, res: Response) => {
    try {
      const { 
        reportType,
        dateRange,
        filters,
        fields,
        customSettings
      } = req.body;
      
      // Initialize an empty workbook
      const workbook = XLSX.utils.book_new();
      let worksheetData: any[] = [];
      let sheetName = "Reporte";
      
      // Handle different report types
      switch (reportType) {
        case 'customers-by-province':
          // Query for customers grouped by province
          const provinceQuery = `
            SELECT province, COUNT(*) as count
            FROM customers
            WHERE province IS NOT NULL
            GROUP BY province
            ORDER BY count DESC
          `;
          const provinceResult = await db.$client.query(provinceQuery);
          
          worksheetData = provinceResult.rows.map(item => ({
            Provincia: item.province || 'Sin provincia',
            'Cantidad de Clientes': item.count
          }));
          sheetName = "Clientes por Provincia";
          break;
          
        case 'sales-by-brand':
          // Query for sales grouped by brand
          const brandQuery = `
            SELECT brand, SUM(amount) as total, COUNT(*) as count
            FROM sales
            WHERE brand IS NOT NULL
            GROUP BY brand
            ORDER BY total DESC
          `;
          const brandResult = await db.$client.query(brandQuery);
          
          worksheetData = brandResult.rows.map(item => ({
            Marca: item.brand || 'Sin marca',
            'Total Ventas': parseFloat(item.total) || 0,
            'Cantidad Ventas': parseInt(item.count)
          }));
          sheetName = "Ventas por Marca";
          break;
          
        case 'sales-by-city':
          // Join customers and sales to get city info
          const cityQuery = `
            SELECT c.city, SUM(s.amount) as total, COUNT(s.*) as count
            FROM sales s
            LEFT JOIN customers c ON s.customer_id = c.id
            WHERE c.city IS NOT NULL
            GROUP BY c.city
            ORDER BY total DESC
          `;
          const cityResult = await db.$client.query(cityQuery);
          
          worksheetData = cityResult.rows.map(item => ({
            Ciudad: item.city || 'Sin ciudad',
            'Total Ventas': parseFloat(item.total) || 0,
            'Cantidad Ventas': parseInt(item.count)
          }));
          sheetName = "Ventas por Ciudad";
          break;
          
        case 'leads-by-source':
          // Query for leads grouped by source
          const sourceQuery = `
            SELECT source, COUNT(*) as count
            FROM leads
            WHERE source IS NOT NULL
            GROUP BY source
            ORDER BY count DESC
          `;
          const sourceResult = await db.$client.query(sourceQuery);
          
          worksheetData = sourceResult.rows.map(item => ({
            Origen: item.source || 'Sin origen',
            'Cantidad de Leads': parseInt(item.count)
          }));
          sheetName = "Leads por Origen";
          break;
          
        case 'sales-over-time':
          // Process time-based data using created_at field
          const timeQuery = `
            SELECT 
              to_char(created_at, 'YYYY-MM') as year_month,
              SUM(amount) as total,
              COUNT(*) as count
            FROM sales
            GROUP BY year_month
            ORDER BY year_month ASC
          `;
          const timeResult = await db.$client.query(timeQuery);
          
          worksheetData = timeResult.rows.map(item => ({
            'Año-Mes': item.year_month,
            'Total Ventas': parseFloat(item.total) || 0,
            'Cantidad Ventas': parseInt(item.count)
          }));
          sheetName = "Ventas por Tiempo";
          break;
          
        case 'customers-by-brand':
          // Count customers by brand
          const customersBrandQuery = `
            SELECT brand, COUNT(*) as count
            FROM customers
            WHERE brand IS NOT NULL
            GROUP BY brand
            ORDER BY count DESC
          `;
          const customersBrandResult = await db.$client.query(customersBrandQuery);
          
          worksheetData = customersBrandResult.rows.map(item => ({
            Marca: item.brand || 'Sin marca',
            'Cantidad de Clientes': parseInt(item.count)
          }));
          sheetName = "Clientes por Marca";
          break;
        
        case 'leads-by-status':
          // Count leads by status
          const statusQuery = `
            SELECT status, COUNT(*) as count
            FROM leads
            GROUP BY status
            ORDER BY count DESC
          `;
          const statusResult = await db.$client.query(statusQuery);
          
          worksheetData = statusResult.rows.map(item => ({
            Estado: item.status || 'Sin estado',
            'Cantidad de Leads': parseInt(item.count)
          }));
          sheetName = "Leads por Estado";
          break;
          
        default:
          // Custom report - apply filters based on request
          if (filters && Object.keys(filters).length > 0) {
            // Build a dynamic query based on the filters
            let queryText = '';
            const queryParams: any[] = [];
            
            if (filters.type === 'customers') {
              queryText = 'SELECT * FROM customers WHERE 1=1';
              
              if (filters.province) {
                queryText += ` AND province = $${queryParams.length + 1}`;
                queryParams.push(filters.province);
              }
              
              if (filters.brand) {
                queryText += ` AND brand = $${queryParams.length + 1}`;
                queryParams.push(filters.brand);
              }
              
              if (filters.city) {
                queryText += ` AND city = $${queryParams.length + 1}`;
                queryParams.push(filters.city);
              }
              
              if (filters.dateStart && filters.dateEnd) {
                queryText += ` AND created_at BETWEEN $${queryParams.length + 1} AND $${queryParams.length + 2}`;
                queryParams.push(new Date(filters.dateStart), new Date(filters.dateEnd));
              }
              
              queryText += ' ORDER BY created_at DESC';
              
              const result = await db.$client.query(queryText, queryParams);
              worksheetData = result.rows;
              sheetName = "Reporte Personalizado - Clientes";
            } else if (filters.type === 'sales') {
              queryText = `
                SELECT s.*, c.name as customer_name 
                FROM sales s 
                LEFT JOIN customers c ON s.customer_id = c.id 
                WHERE 1=1
              `;
              
              if (filters.brand) {
                queryText += ` AND s.brand = $${queryParams.length + 1}`;
                queryParams.push(filters.brand);
              }
              
              if (filters.status) {
                queryText += ` AND s.status = $${queryParams.length + 1}`;
                queryParams.push(filters.status);
              }
              
              if (filters.dateStart && filters.dateEnd) {
                queryText += ` AND s.created_at BETWEEN $${queryParams.length + 1} AND $${queryParams.length + 2}`;
                queryParams.push(new Date(filters.dateStart), new Date(filters.dateEnd));
              }
              
              queryText += ' ORDER BY s.created_at DESC';
              
              const result = await db.$client.query(queryText, queryParams);
              worksheetData = result.rows;
              sheetName = "Reporte Personalizado - Ventas";
            } else {
              worksheetData = [{ message: "Tipo de filtro no soportado" }];
            }
          } else {
            worksheetData = [{ message: "No se especificaron filtros para el reporte personalizado" }];
          }
          if (!sheetName.includes("Personalizado")) {
            sheetName = "Reporte Personalizado";
          }
      }
      
      // Create worksheet from the data
      const worksheet = XLSX.utils.json_to_sheet(worksheetData);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      
      // Convert to binary
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
      
      // Set headers
      res.setHeader('Content-Disposition', `attachment; filename=${sheetName.toLowerCase().replace(/ /g, '_')}.xlsx`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      
      // Send file
      res.send(excelBuffer);
    } catch (error) {
      console.error('Error exporting custom report:', error);
      res.status(500).json({ error: "Error al exportar reporte personalizado" });
    }
  });
  
  // New endpoint to process CSV data directly without file upload
  app.post("/api/configuration/csv/process", async (req, res) => {
    try {
      const { records, type } = req.body;
      
      if (!records || !Array.isArray(records) || records.length === 0) {
        return res.status(400).json({ error: "No se han proporcionado registros válidos" });
      }

      console.log(`Procesando ${records.length} registros para importación de: ${type}`);
      console.log("Ejemplo de registro:", records[0]);
      
      let importCount = 0;
      const errors: string[] = [];

      if (type === "customers") {
        for (const record of records) {
          try {
            // Check for mandatory fields
            if (!record.firstName && !record.lastName) {
              errors.push(`Registro sin nombre y apellido: ${JSON.stringify(record)}`);
              continue;
            }
            
            // Need to add name field for customers (required by schema)
            const customerName = `${record.firstName || ''} ${record.lastName || ''}`.trim();
            
            // Insert the customer
            await db.insert(customers).values({
              name: customerName || "Nuevo Cliente",
              firstName: record.firstName || "",
              lastName: record.lastName || "",
              email: record.email || null,
              phoneCountry: record.phoneCountry || null,
              phoneNumber: record.phoneNumber || null,
              idNumber: record.idNumber || null,
              street: record.street || null,
              city: record.city || null,
              province: record.province || null,
              deliveryInstructions: record.deliveryInstructions || null,
              source: record.source || null,
              brand: record.brand || null,
              notes: record.notes || null,
              createdAt: new Date(),
              updatedAt: new Date()
            });
            
            importCount++;
          } catch (error) {
            console.error("Error al insertar cliente:", error);
            errors.push(`Error al insertar cliente ${record.firstName} ${record.lastName}: ${error}`);
          }
        }
      } else if (type === "leads") {
        for (const record of records) {
          try {
            // Check for mandatory fields
            if (!record.firstName && !record.lastName) {
              errors.push(`Registro sin nombre y apellido: ${JSON.stringify(record)}`);
              continue;
            }
            
            // Need to add name field for leads (required by schema)
            const leadName = `${record.firstName || ''} ${record.lastName || ''}`.trim();
            
            // Insert the lead
            await db.insert(leads).values({
              name: leadName || "Nuevo Lead",
              firstName: record.firstName || "",
              lastName: record.lastName || "",
              email: record.email || null,
              phoneCountry: record.phoneCountry || null,
              phoneNumber: record.phoneNumber || null,
              status: record.status || "nuevo",
              source: record.source || null,
              brand: record.brand || null,
              notes: record.notes || null,
              street: record.street || null,
              city: record.city || null,
              province: record.province || null,
              deliveryInstructions: record.deliveryInstructions || null,
              createdAt: new Date(),
              updatedAt: new Date()
            });
            
            importCount++;
          } catch (error) {
            console.error("Error al insertar lead:", error);
            errors.push(`Error al insertar lead ${record.firstName} ${record.lastName}: ${error}`);
          }
        }
      }

      return res.json({
        success: true,
        count: importCount,
        errors: errors.length > 0 ? errors : null,
        message: `Se han importado ${importCount} ${type === "customers" ? "clientes" : "leads"} correctamente.`
      });
    } catch (error) {
      console.error("Error al procesar los registros:", error);
      return res.status(500).json({ error: "Error al procesar los registros" });
    }
  });
  
  // Helper endpoint to check file upload status
  app.post("/api/configuration/spreadsheet/check", upload.single("file"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    
    return res.json({
      success: true,
      message: "File received successfully",
      file: {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path
      }
    });
  });
  // Process and import data directly from spreadsheet 
  app.post("/api/configuration/spreadsheet/process", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No se ha subido ningún archivo" });
      }

      const importType = req.body.type || "customers";
      let importCount = 0;

      console.log(`Procesando archivo para importación de: ${importType}`);
      console.log(`Archivo recibido: ${req.file.originalname}, tamaño: ${req.file.size} bytes`);
      
      // Read the workbook from file path instead of buffer
      const workbook = XLSX.readFile(req.file.path);
      
      // Get first sheet
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      if (!worksheet) {
        throw new Error("No se pudo leer la hoja de cálculo");
      }
      
      // Try different methods to extract data
      console.log("Intentando extraer datos usando múltiples métodos...");
      
      // Method 1: Convert to array of arrays first - includes all cells, header in first row
      const aoa = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,         // Generate array of arrays
        raw: false,        // Convert all data to strings
        dateNF: 'yyyy-mm-dd', // Format dates as YYYY-MM-DD
        defval: '',         // Default value for empty cells
        blankrows: false    // Don't include blank rows
      });
      
      console.log(`Método 1 - Filas obtenidas: ${aoa.length}`);
      
      if (aoa.length < 1) {
        throw new Error("No se encontraron datos en el archivo");
      }
      
      // Log the first few rows for debugging
      console.log("Headers:", aoa[0]);
      if (aoa.length > 1) {
        console.log("First data row:", aoa[1]);
      }
      
      // Convert array of arrays to array of objects using headers from first row
      const headers = aoa[0] as Array<unknown>;
      const headerStrings = headers.map(h => h !== null && h !== undefined ? String(h).trim() : '');
      
      // Check that we have valid headers
      if (headerStrings.filter(Boolean).length === 0) {
        console.error("No valid headers found in first row");
        throw new Error("No se encontraron encabezados válidos en la primera fila");
      }
      
      // Create records with proper field mappings
      const records = aoa.slice(1)
        .filter((row): row is any[] => Array.isArray(row) && row.length > 0)
        .map((row: any[]) => {
        const obj: Record<string, any> = {};
        
        // Skip rows that are completely empty
        if (row.every(cell => cell === '' || cell === null || cell === undefined)) {
          return null;
        }
        
        headerStrings.forEach((header: string, idx: number) => {
          if (header && header !== '') {
            // Map header to database field based on common naming patterns
            let dbField = "";
            
            // Direct mapping for English headers
            const headerLower = header.toLowerCase();
            
            if (headerLower === "firstname" || headerLower === "first name") {
              dbField = "firstName";
            } else if (headerLower === "lastname" || headerLower === "last name") {
              dbField = "lastName";
            } else if (headerLower === "email") {
              dbField = "email";
            } else if (headerLower === "phonecountry" || headerLower === "phone country") {
              dbField = "phoneCountry";
            } else if (headerLower === "phonenumber" || headerLower === "phone number") {
              dbField = "phoneNumber";
            } else if (headerLower === "idnumber" || headerLower === "id number") {
              dbField = "idNumber";
            } else if (headerLower === "street") {
              dbField = "street";
            } else if (headerLower === "city") {
              dbField = "city";
            } else if (headerLower === "province") {
              dbField = "province";
            } else if (headerLower === "deliveryinstructions" || headerLower === "delivery instructions") {
              dbField = "deliveryInstructions";
            } else if (headerLower === "source") {
              dbField = "source";
            } else if (headerLower === "brand") {
              dbField = "brand";
            } else if (headerLower === "notes") {
              dbField = "notes";
            } else if (headerLower === "status") {
              dbField = "status";
            } 
            // Spanish header mappings
            else if (headerLower === "nombres" || headerLower === "nombre") {
              dbField = "firstName";
            } else if (headerLower === "apellidos" || headerLower === "apellido") {
              dbField = "lastName";
            } else if (headerLower === "correo" || headerLower === "correo electrónico") {
              dbField = "email";
            } else if (headerLower === "país teléfono" || headerLower === "pais telefono") {
              dbField = "phoneCountry";
            } else if (headerLower === "número teléfono" || headerLower === "numero telefono" || headerLower === "telefono") {
              dbField = "phoneNumber";
            } else if (headerLower === "cédula" || headerLower === "cédula/pasaporte" || headerLower === "cedula" || headerLower === "ruc") {
              dbField = "idNumber";
            } else if (headerLower === "calle" || headerLower === "dirección" || headerLower === "direccion") {
              dbField = "street";
            } else if (headerLower === "ciudad") {
              dbField = "city";
            } else if (headerLower === "provincia" || headerLower === "estado") {
              dbField = "province";
            } else if (headerLower === "instrucciones de entrega" || headerLower === "instrucciones entrega") {
              dbField = "deliveryInstructions";
            } else if (headerLower === "fuente") {
              dbField = "source";
            } else if (headerLower === "marca") {
              dbField = "brand";
            } else if (headerLower === "notas" || headerLower === "observaciones") {
              dbField = "notes";
            } else if (headerLower === "estado") {
              dbField = "status";
            } else {
              // Use the original header if no mapping found
              dbField = header;
            }
            
            // Assign the value to the correct field
            if (dbField) {
              obj[dbField] = row[idx];
            }
          }
        });
        
        return Object.keys(obj).length > 0 ? obj : null;
      }).filter(Boolean);
      
      console.log(`Registros válidos encontrados: ${records.length}`);
      
      if (records.length === 0) {
        throw new Error("No se encontraron registros válidos en el archivo");
      }
      
      // Process the records based on import type
      if (importType === "customers") {
        // Insert customers
        console.log("Importando clientes...");
        
        for (const record of records as Record<string, any>[]) {
          try {
            // Ensure required fields are present
            if (!record.firstName) {
              console.warn("Registro ignorado por falta de nombre:", record);
              continue;
            }
            
            // Check if customer already exists
            const existingCustomers = await db.query.customers.findMany({
              where: and(
                eq(customers.firstName, record.firstName || ""),
                eq(customers.lastName, record.lastName || "")
              )
            });
            
            if (existingCustomers.length > 0) {
              console.log(`Cliente ya existe, actualizando: ${record.firstName} ${record.lastName}`);
              
              // Update existing customer
              await db.update(customers).set({
                email: record.email || existingCustomers[0].email,
                phoneCountry: record.phoneCountry || existingCustomers[0].phoneCountry,
                phoneNumber: record.phoneNumber || existingCustomers[0].phoneNumber,
                idNumber: record.idNumber || existingCustomers[0].idNumber,
                street: record.street || existingCustomers[0].street,
                city: record.city || existingCustomers[0].city,
                province: record.province || existingCustomers[0].province,
                deliveryInstructions: record.deliveryInstructions || existingCustomers[0].deliveryInstructions,
                source: record.source || existingCustomers[0].source,
                brand: record.brand || existingCustomers[0].brand,
                notes: record.notes || existingCustomers[0].notes,
                updatedAt: new Date()
              }).where(eq(customers.id, existingCustomers[0].id));
            } else {
              // Insert new customer
              console.log(`Insertando nuevo cliente: ${record.firstName} ${record.lastName}`);
              
              // Need to add name field for customers (required by schema)
              const customerName = `${record.firstName || ''} ${record.lastName || ''}`.trim();
              
              await db.insert(customers).values({
                name: customerName || "Nuevo Cliente",
                firstName: record.firstName || "",
                lastName: record.lastName || "",
                email: record.email || null,
                phoneCountry: record.phoneCountry || null,
                phoneNumber: record.phoneNumber || null,
                idNumber: record.idNumber || null,
                street: record.street || null,
                city: record.city || null,
                province: record.province || null,
                deliveryInstructions: record.deliveryInstructions || null,
                source: record.source || null,
                brand: record.brand || null,
                notes: record.notes || null,
                createdAt: new Date(),
                updatedAt: new Date()
              });
            }
            
            importCount++;
          } catch (error) {
            console.error(`Error importando cliente: ${error}`);
          }
        }
      } else if (importType === "leads") {
        // Insert leads
        console.log("Importando leads...");
        
        for (const record of records as Record<string, any>[]) {
          try {
            // Ensure required fields are present
            if (!record.firstName) {
              console.warn("Registro ignorado por falta de nombre:", record);
              continue;
            }
            
            // Check if lead already exists with same information
            const existingLeads = await db.query.leads.findMany({
              where: and(
                eq(leads.firstName, record.firstName || ""),
                eq(leads.lastName, record.lastName || "")
              )
            });
            
            if (existingLeads.length > 0) {
              console.log(`Lead ya existe, actualizando: ${record.firstName} ${record.lastName}`);
              
              // Update existing lead
              await db.update(leads).set({
                email: record.email || existingLeads[0].email,
                phoneCountry: record.phoneCountry || existingLeads[0].phoneCountry,
                phoneNumber: record.phoneNumber || existingLeads[0].phoneNumber,
                status: record.status || existingLeads[0].status,
                source: record.source || existingLeads[0].source,
                notes: record.notes || existingLeads[0].notes,
                brand: record.brand || existingLeads[0].brand,
                street: record.street || existingLeads[0].street,
                city: record.city || existingLeads[0].city,
                province: record.province || existingLeads[0].province,
                deliveryInstructions: record.deliveryInstructions || existingLeads[0].deliveryInstructions,
                updatedAt: new Date()
              }).where(eq(leads.id, existingLeads[0].id));
            } else {
              // Insert new lead
              console.log(`Insertando nuevo lead: ${record.firstName} ${record.lastName}`);
              
              // Need to add name field for leads (required by schema)
              const leadName = `${record.firstName || ''} ${record.lastName || ''}`.trim();
              
              await db.insert(leads).values({
                name: leadName || "Nuevo Lead",
                firstName: record.firstName || "",
                lastName: record.lastName || "",
                email: record.email || null,
                phoneCountry: record.phoneCountry || null,
                phoneNumber: record.phoneNumber || null,
                status: record.status || "new",
                source: record.source || null,
                notes: record.notes || null,
                brand: record.brand || null,
                street: record.street || null,
                city: record.city || null,
                province: record.province || null,
                deliveryInstructions: record.deliveryInstructions || null,
                createdAt: new Date(),
                updatedAt: new Date()
              });
            }
            
            importCount++;
          } catch (error) {
            console.error(`Error importando lead: ${error}`);
          }
        }
      }
      
      return res.json({ 
        success: true, 
        count: importCount,
        message: `Se importaron ${importCount} registros correctamente.`
      });
    } catch (error: any) {
      console.error("Error procesando archivo:", error);
      return res.status(500).json({ 
        error: error.message || "Error al procesar el archivo", 
        success: false 
      });
    }
  });
}