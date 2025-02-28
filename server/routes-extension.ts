import { Express, Request, Response } from "express";
import { db } from "@db";
import { and, eq } from "drizzle-orm";
import { customers, leads } from "@db/schema";
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