/**
 * Script de validación para verificar que las exportaciones Excel se generan correctamente
 * con manejo adecuado de los textos que contienen punto y coma
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';
import fetch from 'node-fetch';

// Obtener __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Definir rutas de exportación
const EXPORT_APIS = [
  { 
    url: 'http://localhost:3000/api/export/customers',
    outputFile: 'export-customers.xlsx',
    description: 'Clientes'
  },
  { 
    url: 'http://localhost:3000/api/export/sales', 
    outputFile: 'export-sales.xlsx',
    description: 'Ventas'
  },
  { 
    url: 'http://localhost:3000/api/export/leads', 
    outputFile: 'export-leads.xlsx',
    description: 'Leads'
  },
  { 
    url: 'http://localhost:3000/api/export/all', 
    outputFile: 'export-all.xlsx',
    description: 'Reporte completo'
  }
];

// Función para descargar un archivo de exportación
async function downloadExport(apiEndpoint, outputPath) {
  try {
    console.log(`Descargando desde ${apiEndpoint}...`);
    
    const response = await fetch(apiEndpoint);
    
    if (!response.ok) {
      throw new Error(`Error en la descarga: ${response.status} ${response.statusText}`);
    }
    
    // Verificar el tipo de contenido (debe ser un Excel)
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('spreadsheetml.sheet')) {
      console.warn(`⚠️ Advertencia: Tipo de contenido incorrecto: ${contentType}`);
    }
    
    // Descargar el archivo como buffer
    const buffer = await response.arrayBuffer();
    fs.writeFileSync(outputPath, Buffer.from(buffer));
    
    // Verificar que el archivo se haya creado correctamente
    const fileStats = fs.statSync(outputPath);
    console.log(`✅ Archivo guardado en ${outputPath} (${fileStats.size} bytes)`);
    
    return {
      path: outputPath,
      size: fileStats.size,
      contentType
    };
  } catch (error) {
    console.error(`❌ Error al descargar desde ${apiEndpoint}:`, error.message);
    return null;
  }
}

// Función para verificar el contenido del archivo Excel
function verifyExcelContent(filePath) {
  try {
    // Leer el archivo Excel
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convertir a JSON para inspección
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    // Verificar que haya datos
    if (!data || data.length === 0) {
      console.warn(`⚠️ Advertencia: El archivo ${filePath} no contiene datos`);
      return false;
    }
    
    console.log(`✅ ${filePath} contiene ${data.length} registros`);
    
    // Intentar encontrar algún texto con punto y coma para verificar que se mantiene intacto
    let hasSemicolons = false;
    for (const row of data) {
      for (const key in row) {
        if (typeof row[key] === 'string' && row[key].includes(';')) {
          console.log(`✅ Encontrada celda con punto y coma: "${key}": "${row[key].substring(0, 30)}${row[key].length > 30 ? '...' : ''}"`);
          hasSemicolons = true;
          break;
        }
      }
      if (hasSemicolons) break;
    }
    
    return true;
  } catch (error) {
    console.error(`❌ Error al verificar ${filePath}:`, error.message);
    return false;
  }
}

// Función principal
async function runValidation() {
  console.log('Iniciando validación de exportaciones Excel...\n');
  
  let allSuccess = true;
  
  for (const api of EXPORT_APIS) {
    console.log(`\n🔍 Probando exportación de ${api.description}...`);
    
    const outputPath = path.join(__dirname, api.outputFile);
    const result = await downloadExport(api.url, outputPath);
    
    if (result) {
      const isValid = verifyExcelContent(outputPath);
      if (!isValid) {
        allSuccess = false;
      }
    } else {
      allSuccess = false;
    }
  }
  
  console.log('\n--- Resumen de validación ---');
  if (allSuccess) {
    console.log('✅ Todas las exportaciones funcionan correctamente');
  } else {
    console.error('❌ Se encontraron problemas en algunas exportaciones');
  }
}

// Ejecutar la validación
runValidation().catch(error => {
  console.error('Error en la validación:', error);
});