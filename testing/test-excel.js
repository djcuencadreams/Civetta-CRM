import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

function parseExcelFile(filePath) {
  console.log(`Analyzing Excel file: ${filePath}`);
  
  try {
    // Read the file
    const fileData = fs.readFileSync(filePath);
    
    // Log file size and type
    console.log(`File size: ${fileData.length} bytes`);
    
    // Parse the workbook
    const workbook = XLSX.read(fileData, { type: 'buffer' });
    
    // Get sheet names
    const sheetNames = workbook.SheetNames;
    console.log(`Sheets in workbook: ${JSON.stringify(sheetNames)}`);
    
    // Process the first sheet
    const firstSheetName = sheetNames[0];
    console.log(`Processing sheet: ${firstSheetName}`);
    
    // Get the worksheet
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Log worksheet range
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    console.log(`Sheet range: ${worksheet['!ref']}`);
    console.log(`Row count: ${range.e.r - range.s.r + 1}`);
    console.log(`Column count: ${range.e.c - range.s.c + 1}`);
    
    // Get headers (first row)
    const headers = [];
    const cellsInFirstRow = [];
    
    // Log first row cells for debugging
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c });
      const cell = worksheet[cellAddress];
      
      if (cell && cell.v !== undefined) {
        headers.push(cell.v);
        cellsInFirstRow.push({ address: cellAddress, value: cell.v });
      }
    }
    
    console.log(`Headers found: ${JSON.stringify(headers)}`);
    console.log(`First row cells: ${JSON.stringify(cellsInFirstRow)}`);
    
    // Method 1: Use XLSX sheet_to_json for conversion (standard method)
    console.log('\nMethod 1 - Using sheet_to_json:');
    const method1Data = XLSX.utils.sheet_to_json(worksheet, { raw: false });
    console.log(`Records found: ${method1Data.length}`);
    if (method1Data.length > 0) {
      console.log(`Sample row: ${JSON.stringify(method1Data[0])}`);
    }
    
    // Method 2: Manual cell reading with known headers
    console.log('\nMethod 2 - Manual cell iteration:');
    const method2Data = [];
    
    // Start from row 1 (second row, after headers)
    for (let r = range.s.r + 1; r <= range.e.r; r++) {
      const rowData = {};
      let hasData = false;
      
      // Iterate through each column
      for (let c = range.s.c; c <= range.e.c; c++) {
        if (headers[c - range.s.c]) {
          const header = headers[c - range.s.c];
          const cellAddress = XLSX.utils.encode_cell({ r, c });
          const cell = worksheet[cellAddress];
          
          if (cell && cell.v !== undefined && cell.v !== '') {
            rowData[header] = cell.v;
            hasData = true;
          }
        }
      }
      
      if (hasData) {
        method2Data.push(rowData);
      }
    }
    
    console.log(`Records found: ${method2Data.length}`);
    if (method2Data.length > 0) {
      console.log(`Sample row: ${JSON.stringify(method2Data[0])}`);
    }
    
    // Method 3: Direct cell access by column letters
    console.log('\nMethod 3 - Direct cell access by column letters:');
    
    // Generate column letters (A-Z, then AA, AB, etc.)
    const colLetters = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      colLetters.push(XLSX.utils.encode_col(c));
    }
    
    console.log(`Column letters: ${JSON.stringify(colLetters)}`);
    
    const method3Data = [];
    
    // Start from row 1 (second row, after headers)
    for (let row = range.s.r + 1; row <= range.e.r; row++) {
      const rowData = {};
      let hasData = false;
      
      for (let i = 0; i < colLetters.length; i++) {
        const col = colLetters[i];
        const header = headers[i];
        
        if (header) {
          const cellRef = `${col}${row + 1}`; // +1 because Excel is 1-indexed
          const cell = worksheet[cellRef];
          
          if (cell && cell.v !== undefined && cell.v !== '') {
            rowData[header] = cell.v;
            hasData = true;
            console.log(`Found data at ${cellRef}: ${cell.v}`);
          } else {
            console.log(`No data at ${cellRef}`);
          }
        }
      }
      
      if (hasData) {
        method3Data.push(rowData);
      }
    }
    
    console.log(`Records found: ${method3Data.length}`);
    if (method3Data.length > 0) {
      console.log(`Sample row: ${JSON.stringify(method3Data[0])}`);
    }
    
    // Check if all cells in the worksheet
    console.log('\nDirect cell inspection:');
    const allCells = [];
    
    // Scan all possible cells in the range
    Object.keys(worksheet).forEach(key => {
      if (key[0] !== '!' && worksheet[key].v !== undefined) {
        allCells.push({ 
          ref: key, 
          value: worksheet[key].v,
          type: worksheet[key].t
        });
      }
    });
    
    console.log(`Total cells with data: ${allCells.length}`);
    if (allCells.length > 0) {
      console.log(`Sample cells: ${JSON.stringify(allCells.slice(0, 5))}`);
    }
    
    return {
      method1: method1Data,
      method2: method2Data,
      method3: method3Data,
      cellCount: allCells.length
    };
    
  } catch (error) {
    console.error('Error parsing Excel file:', error);
    return { error: error.message };
  }
}

// Process the file provided as command line argument
if (process.argv.length > 2) {
  const filePath = process.argv[2];
  parseExcelFile(filePath);
} else {
  console.log('Please provide the path to an Excel file as a command line argument.');
}