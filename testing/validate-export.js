import fs from 'fs';
import https from 'https';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

// Obtener el directorio actual en un módulo ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Script para validar el funcionamiento correcto de la exportación a Excel
 * Este script descarga los archivos de exportación y verifica que tengan
 * el tamaño y formato adecuados
 */

const BASE_URL = 'http://localhost:3000';
const OUTPUT_DIR = path.join(__dirname, '../temp_excel');

// Asegurar que el directorio existe
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// URLs de exportación a probar
const exportUrls = [
  {
    name: 'clientes',
    url: `${BASE_URL}/api/export/customers?dateStart=2025-01-01&dateEnd=2025-03-01`
  },
  {
    name: 'leads',
    url: `${BASE_URL}/api/export/leads?dateStart=2025-01-01&dateEnd=2025-03-01`
  },
  {
    name: 'ventas',
    url: `${BASE_URL}/api/export/sales?dateStart=2025-01-01&dateEnd=2025-03-01`
  },
  {
    name: 'completo',
    url: `${BASE_URL}/api/export/all?dateStart=2025-01-01&dateEnd=2025-03-01`
  }
];

// Función para verificar headers
function checkContentType(headers) {
  const contentType = headers['content-type'];
  return contentType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
}

// Función para verificar tamaño mínimo
function checkFileSize(filePath) {
  const stats = fs.statSync(filePath);
  console.log(`   - Tamaño: ${stats.size} bytes`);
  // Un archivo Excel vacío suele tener entre 5-15KB, consideramos que debe ser mayor a 5KB
  return stats.size > 5000;
}

// Función para descargar un archivo
function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(outputPath);
    const requester = url.startsWith('https') ? https : http;
    
    const request = requester.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Error de respuesta: ${response.statusCode}`));
        return;
      }
      
      // Verificar Content-Type
      if (!checkContentType(response.headers)) {
        console.warn(`   ⚠️ Content-Type incorrecto: ${response.headers['content-type']}`);
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        resolve(true);
      });
    });
    
    request.on('error', (err) => {
      fs.unlink(outputPath, () => {}); // Borrar archivo parcial
      reject(err);
    });
    
    file.on('error', (err) => {
      fs.unlink(outputPath, () => {}); // Borrar archivo parcial
      reject(err);
    });
  });
}

// Función principal para probar todas las exportaciones
async function validateExports() {
  console.log('Iniciando validación de exportaciones a Excel...\n');
  
  for (const exportInfo of exportUrls) {
    const { name, url } = exportInfo;
    const outputPath = path.join(OUTPUT_DIR, `${name}_test.xlsx`);
    
    console.log(`Probando exportación de ${name}...`);
    try {
      await downloadFile(url, outputPath);
      
      // Verificar tamaño
      if (checkFileSize(outputPath)) {
        console.log(`   ✅ Archivo Excel de ${name} descargado y verificado correctamente`);
      } else {
        console.error(`   ❌ Archivo Excel de ${name} parece estar vacío o incompleto`);
      }
    } catch (error) {
      console.error(`   ❌ Error al descargar ${name}: ${error.message}`);
    }
    console.log('');
  }
  
  console.log('Validación finalizada');
}

// Ejecutar la validación
validateExports().catch(console.error);