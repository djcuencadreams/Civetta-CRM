// Este script genera una plantilla Excel correcta para importar clientes
// Se ejecuta manualmente con node

import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Datos de ejemplo en el formato correcto
const sampleData = [
  {
    firstName: "Sandra",
    lastName: "Agila Chinchay",
    idNumber: "1717685729",
    email: "sandrach1982@yahoo.es",
    phoneCountry: "+593",
    phoneNumber: "959920025",
    street: "Cumbaya, urbanización la católica calle de los cardenales y calle de los azulejos, lote 4 casa 2, puerta gris",
    city: "Quito",
    province: "Pichincha",
    deliveryInstructions: "Indicar al guardia que va al lote 4 casa 2 donde familia Galitsyn",
    source: "Social Media",
    brand: "sleepwear",
    notes: "Cliente frecuente"
  },
  {
    firstName: "Patricia",
    lastName: "Torres",
    idNumber: "0706335916",
    email: "patricia@example.com",
    phoneCountry: "+593",
    phoneNumber: "959652203",
    street: "Entrada de la Cdla. Jaime Roldos, Calle Zaruma",
    city: "Piñas",
    province: "El Oro",
    deliveryInstructions: "",
    source: "Social Media",
    brand: "sleepwear",
    notes: ""
  },
  {
    firstName: "Luis",
    lastName: "Aldaz",
    idNumber: "1801449586",
    email: "lualdaz@hotmail.com",
    phoneCountry: "+593",
    phoneNumber: "987628702",
    street: "5 de junio entre 9 de octubre y Pedro Carbo Boutique Pineapple style",
    city: "Milagro",
    province: "Guayas",
    deliveryInstructions: "En la boutique Pineapple style",
    source: "Social Media",
    brand: "sleepwear",
    notes: ""
  }
];

// Crear una hoja de trabajo a partir de los datos
const ws = XLSX.utils.json_to_sheet(sampleData);

// Crear un libro de trabajo
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Plantilla");

// Escribir el archivo Excel
const outputPath = path.join(__dirname, 'plantilla_clientes_correcta.xlsx');
XLSX.writeFile(wb, outputPath);

console.log(`Plantilla generada en: ${outputPath}`);