/**
 * Script para probar el formato de celdas en Excel
 * Este script crea un archivo Excel con textos que contienen punto y coma
 * para verificar que se mantienen correctamente en una sola celda
 */

import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Datos de prueba con texto que contiene puntos y coma
const testData = [
  {
    id: 1,
    name: "Cliente 1",
    notes: "Notas normales sin punto y coma"
  },
  {
    id: 2,
    name: "Cliente 2",
    notes: "Este cliente tiene notas con punto y coma; múltiples secciones; separadas por punto y coma."
  },
  {
    id: 3,
    name: "Cliente con; en nombre",
    notes: "Más texto con punto y coma; segunda parte; tercera parte con varios; separadores"
  },
  {
    id: 4,
    name: "Cliente 4",
    notes: "Texto1;Texto2;Texto3;Texto4;Texto5"
  }
];

/**
 * Función para generar un archivo Excel con formato de texto forzado para todas las celdas
 * @param {Array} data Datos a convertir en Excel
 * @param {string} outputPath Ruta donde guardar el archivo
 */
function generateExcelWithTextFormat(data, outputPath) {
  // Crear un nuevo libro de trabajo
  const workbook = XLSX.utils.book_new();
  
  // Crear una hoja de trabajo a partir de los datos
  const worksheet = XLSX.utils.json_to_sheet(data);
  
  // Establecer propiedades para asegurar que todos los campos se traten como texto
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  
  // Configurar todas las celdas como formato texto (@)
  for (let r = range.s.r; r <= range.e.r; ++r) {
    for (let c = range.s.c; c <= range.e.c; ++c) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      
      // Si la celda no existe, crear una vacía
      if (!worksheet[cellRef]) {
        worksheet[cellRef] = { t: 's', v: '' };
      }
      
      // Forzar tipo de celda a texto ('s')
      if (worksheet[cellRef].t !== 's') {
        worksheet[cellRef].t = 's';
      }
      
      // Agregar formato de celda para forzar texto
      if (!worksheet['!cols']) worksheet['!cols'] = [];
      if (!worksheet['!cols'][c]) worksheet['!cols'][c] = { wch: 15 };
      
      // Establecer formato de texto para la columna
      if (!worksheet['!fmt']) worksheet['!fmt'] = {};
      worksheet['!fmt'][worksheet['!cols'][c]] = "@";
    }
  }
  
  // Añadir la hoja al libro
  XLSX.utils.book_append_sheet(workbook, worksheet, "Datos");
  
  // Guardar el archivo
  XLSX.writeFile(workbook, outputPath, { 
    bookType: 'xlsx',
    cellStyles: true,
    cellDates: true,
    compression: true,
    cellText: true,
    cellFormula: false
  });
  
  console.log(`Archivo Excel guardado en: ${outputPath}`);
  console.log(`Tamaño del archivo: ${fs.statSync(outputPath).size} bytes`);
}

// Ejecutar el test
const outputPath = path.join(__dirname, 'test-excel-format.xlsx');
generateExcelWithTextFormat(testData, outputPath);

console.log('Test completado. Abra el archivo generado para verificar que los textos con punto y coma se mantienen en una sola celda.');