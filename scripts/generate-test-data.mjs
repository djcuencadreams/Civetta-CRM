import * as XLSX from 'xlsx';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get current module's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Function to generate test data file for customer import
function generateCustomersTestFile() {
  // Create a new workbook
  const wb = XLSX.utils.book_new();
  
  // Define test data with English headers
  const customerData = [
    {
      'FirstName': 'Juan',
      'LastName': 'Perez',
      'Email': 'juan.perez@ejemplo.com',
      'PhoneCountry': 'Ecuador',
      'PhoneNumber': '0991234567',
      'IdNumber': '1712345678',
      'Street': 'Av. República',
      'City': 'Quito',
      'Province': 'Pichincha',
      'DeliveryInstructions': 'Edificio Torre Blanca, piso 3',
      'Source': 'Website',
      'Brand': 'Civetta Sleepwear',
      'Notes': 'Cliente regular'
    },
    {
      'FirstName': 'Maria',
      'LastName': 'Rodriguez',
      'Email': 'maria.rodriguez@ejemplo.com',
      'PhoneCountry': 'Ecuador',
      'PhoneNumber': '0987654321',
      'IdNumber': '1798765432',
      'Street': 'Calle Antonio Granda',
      'City': 'Guayaquil',
      'Province': 'Guayas',
      'DeliveryInstructions': 'Casa blanca esquinera',
      'Source': 'Referral',
      'Brand': 'Civetta Bride',
      'Notes': 'Boda en diciembre'
    },
    {
      'FirstName': 'Carlos',
      'LastName': 'Suarez',
      'Email': 'carlos.suarez@ejemplo.com',
      'PhoneCountry': 'Ecuador',
      'PhoneNumber': '0998765432',
      'IdNumber': '1701234567',
      'Street': 'Av. 6 de Diciembre',
      'City': 'Quito',
      'Province': 'Pichincha',
      'DeliveryInstructions': 'Conjunto residencial, casa 5',
      'Source': 'Instagram',
      'Brand': 'Civetta Sleepwear',
      'Notes': 'Cliente VIP'
    }
  ];
  
  // Create worksheet
  const ws = XLSX.utils.json_to_sheet(customerData);
  
  // Set column widths
  const colWidths = [
    { wch: 15 }, // FirstName
    { wch: 15 }, // LastName
    { wch: 25 }, // Email
    { wch: 15 }, // PhoneCountry
    { wch: 15 }, // PhoneNumber
    { wch: 15 }, // IdNumber
    { wch: 25 }, // Street
    { wch: 15 }, // City
    { wch: 15 }, // Province
    { wch: 30 }, // DeliveryInstructions
    { wch: 15 }, // Source
    { wch: 20 }, // Brand
    { wch: 30 }  // Notes
  ];
  ws['!cols'] = colWidths;
  
  // Add the worksheet to the workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Customers');
  
  // Write to file - use absolute path based on project root
  const customersFileName = join(__dirname, '..', 'client', 'public', 'test_customers.xlsx');
  XLSX.writeFile(wb, customersFileName);
  console.log(`Test customers file created: ${customersFileName}`);
}

// Function to generate test data file for leads import
function generateLeadsTestFile() {
  // Create a new workbook
  const wb = XLSX.utils.book_new();
  
  // Define test data with English headers
  const leadsData = [
    {
      'FirstName': 'Ana',
      'LastName': 'Gomez',
      'Email': 'ana.gomez@ejemplo.com',
      'PhoneCountry': 'Ecuador',
      'PhoneNumber': '0993456789',
      'Status': 'new',
      'Source': 'Facebook',
      'Brand': 'Civetta Bride',
      'Street': 'Av. Colon',
      'City': 'Quito',
      'Province': 'Pichincha',
      'DeliveryInstructions': 'Casa verde con jardín',
      'Notes': 'Interesada en vestidos de novia'
    },
    {
      'FirstName': 'Pedro',
      'LastName': 'Martinez',
      'Email': 'pedro.martinez@ejemplo.com',
      'PhoneCountry': 'Ecuador',
      'PhoneNumber': '0997654321',
      'Status': 'contacted',
      'Source': 'Instagram',
      'Brand': 'Civetta Sleepwear',
      'Street': 'Calle Toledo',
      'City': 'Guayaquil',
      'Province': 'Guayas',
      'DeliveryInstructions': 'Edificio Marina Plaza, apto 302',
      'Notes': 'Buscando regalo para esposa'
    },
    {
      'FirstName': 'Laura',
      'LastName': 'Fernandez',
      'Email': 'laura.fernandez@ejemplo.com',
      'PhoneCountry': 'Ecuador',
      'PhoneNumber': '0991122334',
      'Status': 'qualified',
      'Source': 'Website',
      'Brand': 'Civetta Bride',
      'Street': 'Av. Amazonas',
      'City': 'Cuenca',
      'Province': 'Azuay',
      'DeliveryInstructions': 'Centro comercial, local 15',
      'Notes': 'Boda en junio, alta prioridad'
    }
  ];
  
  // Create worksheet
  const ws = XLSX.utils.json_to_sheet(leadsData);
  
  // Set column widths
  const colWidths = [
    { wch: 15 }, // FirstName
    { wch: 15 }, // LastName
    { wch: 25 }, // Email
    { wch: 15 }, // PhoneCountry
    { wch: 15 }, // PhoneNumber
    { wch: 15 }, // Status
    { wch: 15 }, // Source
    { wch: 20 }, // Brand
    { wch: 25 }, // Street
    { wch: 15 }, // City
    { wch: 15 }, // Province
    { wch: 30 }, // DeliveryInstructions
    { wch: 30 }  // Notes
  ];
  ws['!cols'] = colWidths;
  
  // Add the worksheet to the workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Leads');
  
  // Write to file - use absolute path based on project root
  const leadsFileName = join(__dirname, '..', 'client', 'public', 'test_leads.xlsx');
  XLSX.writeFile(wb, leadsFileName);
  console.log(`Test leads file created: ${leadsFileName}`);
}

// Generate both test files
generateCustomersTestFile();
generateLeadsTestFile();

console.log('Test data files generation completed!');