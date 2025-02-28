// Script para generar plantillas Excel para importación de clientes
// Para ejecutar: node scripts/generate-template.cjs

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Función para generar la plantilla de clientes
function generateCustomerTemplate() {
  console.log("Generando plantilla de clientes...");
  
  // Encabezados en inglés con los campos requeridos para el sistema
  const headers = [
    "firstName", 
    "lastName", 
    "idNumber", 
    "email", 
    "phoneCountry", 
    "phoneNumber",
    "street",
    "city",
    "province",
    "deliveryInstructions",
    "source",
    "brand",
    "notes"
  ];
  
  // Datos de ejemplo
  const exampleData = [
    {
      firstName: "Sandra",
      lastName: "Agila Chinchay",
      idNumber: "1717685729",
      email: "sandrach1982@yahoo.es",
      phoneCountry: "+593",
      phoneNumber: "959920025",
      street: "Cumbaya, urbanización la católica calle de los cardenales y calle de los azulejos, lote 4 casa 2",
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
  
  // Crear hoja de trabajo con los encabezados
  const ws = XLSX.utils.json_to_sheet(exampleData, {
    header: headers,
    skipHeader: false
  });
  
  // Ajustar ancho de columnas
  const colWidths = [
    { wch: 15 },  // firstName
    { wch: 15 },  // lastName
    { wch: 15 },  // idNumber
    { wch: 25 },  // email
    { wch: 8 },   // phoneCountry
    { wch: 12 },  // phoneNumber
    { wch: 40 },  // street
    { wch: 15 },  // city
    { wch: 15 },  // province
    { wch: 30 },  // deliveryInstructions
    { wch: 15 },  // source
    { wch: 15 },  // brand
    { wch: 20 }   // notes
  ];
  
  ws['!cols'] = colWidths;
  
  // Añadir estilos para los encabezados
  // Crear un nuevo libro y añadir la hoja
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
  
  // Guardar el libro como archivo Excel
  const outputDir = path.join(__dirname, '..', 'client', 'public');
  const outputPath = path.join(outputDir, 'plantilla_clientes_correcta.xlsx');
  
  // Asegurarse de que el directorio existe
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  XLSX.writeFile(wb, outputPath);
  console.log(`✅ Plantilla de clientes generada en: ${outputPath}`);
  
  return outputPath;
}

// Función para generar la plantilla de leads
function generateLeadTemplate() {
  console.log("Generando plantilla de leads...");
  
  // Encabezados en inglés con los campos requeridos para el sistema
  const headers = [
    "firstName", 
    "lastName",
    "email", 
    "phoneCountry", 
    "phoneNumber",
    "status",
    "source",
    "brand",
    "street",
    "city",
    "province",
    "notes"
  ];
  
  // Datos de ejemplo
  const exampleData = [
    {
      firstName: "Ana María",
      lastName: "Robles",
      email: "ana.maria@ejemplo.com",
      phoneCountry: "+593",
      phoneNumber: "987654321",
      status: "nuevo",
      source: "Instagram",
      brand: "bride",
      street: "Av. 6 de Diciembre y Colón",
      city: "Quito",
      province: "Pichincha",
      notes: "Interesada en vestidos de novia"
    },
    {
      firstName: "Carlos",
      lastName: "Mendoza",
      email: "carlos@ejemplo.com",
      phoneCountry: "+593",
      phoneNumber: "998877665",
      status: "contactado",
      source: "Referido",
      brand: "sleepwear",
      street: "Cdla. Kennedy Norte",
      city: "Guayaquil",
      province: "Guayas",
      notes: "Busca regalo para su esposa"
    }
  ];
  
  // Crear hoja de trabajo con los encabezados
  const ws = XLSX.utils.json_to_sheet(exampleData, {
    header: headers,
    skipHeader: false
  });
  
  // Ajustar ancho de columnas
  const colWidths = [
    { wch: 15 },  // firstName
    { wch: 15 },  // lastName
    { wch: 25 },  // email
    { wch: 8 },   // phoneCountry
    { wch: 12 },  // phoneNumber
    { wch: 15 },  // status
    { wch: 15 },  // source
    { wch: 10 },  // brand
    { wch: 40 },  // street
    { wch: 15 },  // city
    { wch: 15 },  // province
    { wch: 30 }   // notes
  ];
  
  ws['!cols'] = colWidths;
  
  // Crear un nuevo libro y añadir la hoja
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
  
  // Guardar el libro como archivo Excel
  const outputDir = path.join(__dirname, '..', 'client', 'public');
  const outputPath = path.join(outputDir, 'plantilla_leads_correcta.xlsx');
  
  // Asegurarse de que el directorio existe
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  XLSX.writeFile(wb, outputPath);
  console.log(`✅ Plantilla de leads generada en: ${outputPath}`);
  
  return outputPath;
}

// Función principal
function main() {
  console.log("Iniciando generación de plantillas...");
  
  try {
    // Generar plantillas
    const customerTemplatePath = generateCustomerTemplate();
    const leadTemplatePath = generateLeadTemplate();
    
    console.log("\n✅ Generación de plantillas completada con éxito");
    console.log("Plantilla de clientes:", customerTemplatePath);
    console.log("Plantilla de leads:", leadTemplatePath);
  } catch (error) {
    console.error("❌ Error generando plantillas:", error);
  }
}

// Ejecutar el script
main();