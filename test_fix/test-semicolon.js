/**
 * Script de prueba para verificar el manejo correcto de punto y coma en Excel
 */
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Obtener __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Crear datos de prueba con textos que contienen punto y coma
const testData = [
  {
    id: 1,
    nombre: "Cliente con; punto y coma",
    descripcion: "Este texto contiene varios; puntos y comas; en diferentes partes",
    notas: "Notas con formato especial; podría causar problemas",
    fecha: new Date().toISOString()
  },
  {
    id: 2,
    nombre: "Cliente normal",
    descripcion: "Este texto no tiene caracteres especiales",
    notas: "Notas normales",
    fecha: new Date().toISOString()
  },
  {
    id: 3,
    nombre: "Otro; cliente; con muchos; separadores",
    descripcion: "Más pruebas; con diferentes; combinaciones",
    notas: "Probando 1;2;3;4;5;",
    fecha: new Date().toISOString()
  }
];

/**
 * Genera un archivo Excel que maneja correctamente los textos con punto y coma
 */
function generateExcelFile(data, outputPath) {
  // Preparar los datos asegurando que los textos con punto y coma se manejen correctamente
  const safeData = data.map(row => {
    const safeRow = {};
    
    // Recorrer cada propiedad en la fila
    for (const key in row) {
      // Si el valor es un string, asegurarse de que se trate como texto en Excel
      if (typeof row[key] === 'string') {
        safeRow[key] = row[key];
      } else if (row[key] === null || row[key] === undefined) {
        safeRow[key] = '';
      } else {
        safeRow[key] = String(row[key]);
      }
    }
    
    return safeRow;
  });

  // Crear un nuevo libro de trabajo
  const workbook = XLSX.utils.book_new();
  
  // Crear una hoja de trabajo a partir de los datos procesados
  const worksheet = XLSX.utils.json_to_sheet(safeData);
  
  // Añadir la hoja al libro
  XLSX.utils.book_append_sheet(workbook, worksheet, "Datos de prueba");
  
  // Escribir el archivo
  XLSX.writeFile(workbook, outputPath, { 
    bookType: 'xlsx',
    cellStyles: true,
    cellDates: true,
    compression: true
  });
  
  console.log(`Archivo Excel generado en: ${outputPath}`);
  return outputPath;
}

// Ejecutar la prueba
const outputFile = path.join(__dirname, 'test-semicolon.xlsx');
generateExcelFile(testData, outputFile);

// Verificar que el archivo se haya creado
if (fs.existsSync(outputFile)) {
  console.log(`✅ Prueba exitosa: Archivo creado correctamente (${fs.statSync(outputFile).size} bytes)`);
} else {
  console.error('❌ Prueba fallida: No se pudo crear el archivo');
}

// Leer el archivo creado para verificar su contenido
console.log('\nVerificando contenido del archivo Excel:');
const readWorkbook = XLSX.readFile(outputFile);
const sheetName = readWorkbook.SheetNames[0];
const sheet = readWorkbook.Sheets[sheetName];
const parsedData = XLSX.utils.sheet_to_json(sheet);

console.log(JSON.stringify(parsedData, null, 2));

// Verificar que los datos se hayan preservado correctamente
let success = true;
for (let i = 0; i < testData.length; i++) {
  if (parsedData[i].nombre !== testData[i].nombre ||
      parsedData[i].descripcion !== testData[i].descripcion ||
      parsedData[i].notas !== testData[i].notas) {
    console.error(`❌ Error: Los datos del ítem ${i + 1} no coinciden`);
    console.error('Original:', testData[i]);
    console.error('Leído:', parsedData[i]);
    success = false;
  }
}

if (success) {
  console.log('✅ Verificación exitosa: Todos los datos se mantuvieron intactos, incluyendo los puntos y coma');
} else {
  console.error('❌ Verificación fallida: Algunos datos no se mantuvieron correctamente');
}