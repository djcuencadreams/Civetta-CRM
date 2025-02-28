/**
 * Script para validar el funcionamiento correcto de la exportación a Excel
 * Este script descarga los archivos de exportación y verifica que tengan
 * el formato y tipo MIME adecuados para Excel
 */

import fs from 'fs';
import https from 'https';
import http from 'http';
import path from 'path';
import { promisify } from 'util';
import { fileURLToPath } from 'url';

// Obtener el directorio actual
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HOST = 'localhost';
const PORT = 3000;
const OUTPUT_DIR = path.join(__dirname, '..', 'temp_excel');

// Asegurarse de que el directorio de salida exista
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Verifica el tipo de contenido del encabezado
 * @param {Object} headers - Encabezados HTTP
 * @returns {boolean} - true si es un archivo Excel, false en caso contrario
 */
function checkContentType(headers) {
  const contentType = headers['content-type'];
  const isExcel = contentType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  console.log(`Tipo de contenido: ${contentType}, ¿Es Excel? ${isExcel ? 'Sí' : 'No'}`);
  return isExcel;
}

/**
 * Verifica el tamaño del archivo
 * @param {string} filePath - Ruta del archivo
 * @returns {Promise<boolean>} - true si el tamaño es aceptable para un archivo Excel
 */
async function checkFileSize(filePath) {
  const stat = await promisify(fs.stat)(filePath);
  const sizeKB = Math.round(stat.size / 1024);
  const MIN_SIZE_KB = 5; // Al menos 5 KB para un archivo Excel básico
  const isValidSize = sizeKB >= MIN_SIZE_KB;
  console.log(`Tamaño del archivo: ${sizeKB} KB, ¿Es válido? ${isValidSize ? 'Sí' : 'No'}`);
  return isValidSize;
}

/**
 * Descarga un archivo
 * @param {string} url - URL del archivo a descargar
 * @param {string} outputPath - Ruta donde guardar el archivo
 * @returns {Promise<Object>} - Información sobre la descarga
 */
function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    console.log(`Descargando desde: ${url}`);
    const fileStream = fs.createWriteStream(outputPath);
    const request = http.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Error de respuesta: ${response.statusCode}`));
        return;
      }

      const contentLength = response.headers['content-length'];
      const contentType = response.headers['content-type'];
      const disposition = response.headers['content-disposition'];
      
      console.log(`Respuesta recibida:`, {
        statusCode: response.statusCode,
        contentLength,
        contentType,
        disposition
      });
      
      response.pipe(fileStream);
      
      fileStream.on('finish', () => {
        fileStream.close();
        resolve({
          path: outputPath,
          headers: response.headers
        });
      });
    });
    
    request.on('error', (err) => {
      fs.unlink(outputPath, () => {});
      reject(err);
    });
    
    fileStream.on('error', (err) => {
      fs.unlink(outputPath, () => {});
      reject(err);
    });
  });
}

/**
 * Valida las exportaciones a Excel
 */
async function validateExcelExports() {
  try {
    // Define las URLs de prueba con fechas del rango actual
    const today = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1); // Un mes atrás
    
    const dateStart = startDate.toISOString().split('T')[0];
    const dateEnd = today.toISOString().split('T')[0];
    
    const exports = [
      {
        name: 'Clientes',
        url: `http://${HOST}:${PORT}/api/export/customers?dateStart=${dateStart}&dateEnd=${dateEnd}`,
        output: path.join(OUTPUT_DIR, 'test_customers.xlsx')
      },
      {
        name: 'Ventas',
        url: `http://${HOST}:${PORT}/api/export/sales?dateStart=${dateStart}&dateEnd=${dateEnd}`,
        output: path.join(OUTPUT_DIR, 'test_sales.xlsx')
      },
      {
        name: 'Leads',
        url: `http://${HOST}:${PORT}/api/export/leads?dateStart=${dateStart}&dateEnd=${dateEnd}`,
        output: path.join(OUTPUT_DIR, 'test_leads.xlsx')
      },
      {
        name: 'Reporte Completo',
        url: `http://${HOST}:${PORT}/api/export/all?dateStart=${dateStart}&dateEnd=${dateEnd}`,
        output: path.join(OUTPUT_DIR, 'test_all.xlsx')
      }
    ];
    
    console.log('Iniciando validación de exportaciones Excel...');
    console.log(`Rango de fechas: ${dateStart} a ${dateEnd}`);
    
    // Probar cada exportación
    for (const exportItem of exports) {
      console.log(`\nProbando exportación de ${exportItem.name}...`);
      
      try {
        // Descargar el archivo
        const { headers, path: filePath } = await downloadFile(exportItem.url, exportItem.output);
        
        // Verificar el tipo de contenido
        const contentTypeValid = checkContentType(headers);
        
        // Verificar el tamaño del archivo
        const sizeValid = await checkFileSize(filePath);
        
        if (contentTypeValid && sizeValid) {
          console.log(`✅ Exportación de ${exportItem.name} VÁLIDA`);
        } else {
          console.log(`❌ Exportación de ${exportItem.name} INVÁLIDA`);
        }
      } catch (err) {
        console.error(`Error al validar ${exportItem.name}:`, err.message);
      }
    }
    
    console.log('\nValidación de exportaciones completada.');
    
  } catch (error) {
    console.error('Error durante la validación:', error);
  }
}

// Ejecutar la validación
validateExcelExports();