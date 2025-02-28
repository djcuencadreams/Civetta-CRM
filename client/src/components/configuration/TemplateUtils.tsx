import * as XLSX from 'xlsx';

/**
 * Generate and download a template file based on the import type
 * Supports both CSV and Excel formats
 * @param type The type of data to import ('customers' or 'leads')
 */
export const generateExcelTemplate = (type: string) => {
  // Create data array based on type
  let headers: string[] = [];
  let sampleData: string[][] = [];
  let filename = '';

  // Define headers and sample data based on type
  if (type === 'customers') {
    headers = [
      'firstName', 
      'lastName', 
      'idNumber',
      'email', 
      'phoneCountry', 
      'phoneNumber', 
      'street',
      'city',
      'province',
      'deliveryInstructions',
      'source',
      'brand',
      'notes'
    ];
    
    sampleData = [
      [
        'Juan',
        'Perez',
        '1712345678',
        'juan.perez@ejemplo.com',
        'Ecuador',
        '0991234567',
        'Av. República',
        'Quito',
        'Pichincha',
        'Edificio Torre Blanca, piso 3',
        'Website',
        'Civetta Sleepwear',
        'Cliente regular'
      ],
      [
        'Maria',
        'Rodriguez',
        '1798765432',
        'maria.rodriguez@ejemplo.com',
        'Ecuador',
        '0987654321',
        'Calle Antonio Granda',
        'Guayaquil',
        'Guayas',
        'Casa blanca esquinera',
        'Referral',
        'Civetta Bride',
        'Boda en diciembre'
      ]
    ];
    
    filename = 'plantilla_clientes';
  } else if (type === 'leads') {
    headers = [
      'firstName', 
      'lastName', 
      'email', 
      'phoneCountry', 
      'phoneNumber', 
      'status',
      'source',
      'brand',
      'street',
      'city',
      'province',
      'deliveryInstructions',
      'notes'
    ];
    
    sampleData = [
      [
        'Carlos',
        'Gonzalez',
        'carlos.gonzalez@ejemplo.com',
        'Ecuador',
        '0993456789',
        'new',
        'Instagram',
        'Civetta Sleepwear',
        'Av. 6 de Diciembre',
        'Quito',
        'Pichincha',
        'Conjunto Residencial Las Palmas, casa 15',
        'Interesado en pijamas para regalo'
      ],
      [
        'Ana',
        'Suarez',
        'ana.suarez@ejemplo.com',
        'Ecuador',
        '0987123456',
        'contacted',
        'Facebook',
        'Civetta Bride',
        'Calle Juan Montalvo',
        'Cuenca',
        'Azuay',
        'Casa azul con jardín',
        'Boda en marzo, interesada en citas'
      ]
    ];
    
    filename = 'plantilla_leads';
  }

  // Generate CSV format
  try {
    // Create CSV content with semicolons as separators (standard in Spanish-speaking regions)
    let csvContent = headers.join(';') + '\n';
    
    // Add sample data rows
    sampleData.forEach(row => {
      csvContent += row.join(';') + '\n';
    });
    
    // Create a blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    return true;
  } catch (error) {
    console.error('Error creating CSV template:', error);
    
    // Fallback to Excel format if CSV creation fails
    try {
      // Create workbook for Excel format
      const wb = XLSX.utils.book_new();
      
      // Combine headers and data
      const excelData = [headers, ...sampleData];
      
      // Create worksheet
      const ws = XLSX.utils.aoa_to_sheet(excelData);
      
      // Set column widths
      const colWidths = headers.map(() => ({ wch: 20 }));
      ws['!cols'] = colWidths;
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      
      // Write to file and trigger download
      XLSX.writeFile(wb, `${filename}.xlsx`);
      
      return true;
    } catch (excelError) {
      console.error('Error creating Excel template:', excelError);
      return false;
    }
  }
};