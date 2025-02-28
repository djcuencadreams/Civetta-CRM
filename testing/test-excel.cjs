const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

function parseExcelFile(filePath) {
  console.log(`Analyzing Excel file: ${filePath}`);
  
  try {
    // Read the file
    const fileData = fs.readFileSync(filePath);
    
    // Log file size and type
    console.log(`File size: ${fileData.length} bytes`);
    
    // Parse the workbook
    const workbook = XLSX.read(fileData, { type: 'buffer' });
    
    // Inspect the workbook
    console.log("Full workbook properties:", Object.keys(workbook));
    console.log("Sheets in workbook:", workbook.SheetNames);
    
    // Process the first sheet
    const firstSheetName = workbook.SheetNames[0];
    console.log("Processing sheet:", firstSheetName);
    
    // Get the worksheet
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Inspect the worksheet properties
    console.log("Worksheet properties:", Object.keys(worksheet));
    
    // Log worksheet range
    console.log("Sheet range:", worksheet['!ref']);
    
    if (!worksheet['!ref']) {
      console.log("WARNING: Sheet has no defined range - it might be empty or damaged");
      worksheet['!ref'] = 'A1';
    }
    
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    console.log(`Row count: ${range.e.r - range.s.r + 1}`);
    console.log(`Column count: ${range.e.c - range.s.c + 1}`);
    
    // Get a list of all cells with data
    const cells = [];
    let cellsWithData = 0;
    
    Object.keys(worksheet).forEach(key => {
      if (key[0] !== '!') {
        if (worksheet[key].v !== undefined) {
          cellsWithData++;
          cells.push({
            ref: key,
            value: worksheet[key].v,
            type: worksheet[key].t
          });
        }
      }
    });
    
    console.log(`Total cells: ${Object.keys(worksheet).length - 5}, cells with data: ${cellsWithData}`);
    if (cells.length > 0) {
      console.log("First 5 cells with data:", cells.slice(0, 5));
    }
    
    // Try to read directly by column letters and row numbers
    console.log("\nReading specific cells:");
    try {
      console.log("Cell A1:", worksheet.A1 ? worksheet.A1.v : "not found");
      console.log("Cell B1:", worksheet.B1 ? worksheet.B1.v : "not found");
      console.log("Cell A2:", worksheet.A2 ? worksheet.A2.v : "not found");
    } catch (e) {
      console.log("Error reading cells:", e.message);
    }
    
    // Try method 1 - sheet_to_json (preferred method)
    try {
      console.log("\nMETHOD 1 - sheet_to_json:");
      const options = {
        header: 1,
        raw: false,
        dateNF: 'yyyy-mm-dd',
        defval: null,
        blankrows: false
      };
      const data = XLSX.utils.sheet_to_json(worksheet, options);
      
      console.log(`Got ${data.length} rows, first row has ${data[0] ? data[0].length : 0} columns`);
      if (data.length > 0) {
        console.log("Headers row:", data[0]);
        if (data.length > 1) {
          console.log("First data row:", data[1]);
        }
      }
      
      // Now try with different options
      console.log("\nMETHOD 1b - sheet_to_json with object output:");
      const objectOptions = {
        raw: false,
        dateNF: 'yyyy-mm-dd',
        defval: null,
        blankrows: false
      };
      const objectData = XLSX.utils.sheet_to_json(worksheet, objectOptions);
      console.log(`Got ${objectData.length} objects`);
      if (objectData.length > 0) {
        console.log("First object:", objectData[0]);
      }
    } catch (e) {
      console.log("Method 1 failed:", e.message);
    }
    
    // Try method 2 - cell-by-cell manual reading
    try {
      console.log("\nMETHOD 2 - Manual cell reading:");
      
      // Read headers from first row
      const headers = [];
      for (let c = range.s.c; c <= range.e.c; c++) {
        const headerAddress = XLSX.utils.encode_cell({r: range.s.r, c});
        if (worksheet[headerAddress] && worksheet[headerAddress].v !== undefined) {
          headers.push(worksheet[headerAddress].v);
        } else {
          headers.push(`Column${c+1}`);
        }
      }
      
      console.log("Headers found:", headers);
      
      // Read data rows
      const data = [];
      for (let r = range.s.r + 1; r <= range.e.r; r++) {
        const rowObj = {};
        let hasData = false;
        
        for (let c = range.s.c; c <= range.e.c; c++) {
          const cellAddress = XLSX.utils.encode_cell({r, c});
          const cell = worksheet[cellAddress];
          
          if (cell && cell.v !== undefined && cell.v !== '') {
            const header = headers[c];
            if (header) {
              rowObj[header] = cell.v;
              hasData = true;
            }
          }
        }
        
        if (hasData) {
          data.push(rowObj);
        }
      }
      
      console.log(`Read ${data.length} data rows`);
      if (data.length > 0) {
        console.log("First data row:", data[0]);
      }
    } catch (e) {
      console.log("Method 2 failed:", e.message);
    }
    
    // Try method 3 - Use direct column letters (A1 style)
    try {
      console.log("\nMETHOD 3 - Direct A1 style addressing:");
      
      // Get all column letters
      const colLetters = [];
      for (let c = range.s.c; c <= range.e.c; c++) {
        colLetters.push(XLSX.utils.encode_col(c));
      }
      console.log("Column letters:", colLetters);
      
      // Read headers from first row
      const headers = [];
      colLetters.forEach(col => {
        const cellRef = `${col}1`; // Assuming headers are always in row 1
        if (worksheet[cellRef] && worksheet[cellRef].v !== undefined) {
          headers.push(worksheet[cellRef].v);
        } else {
          headers.push(`Column_${col}`);
        }
      });
      
      console.log("Headers found:", headers);
      
      // Read data rows
      const data = [];
      // Start from row 2 (after headers)
      for (let row = 2; row <= range.e.r + 1; row++) {
        const rowObj = {};
        let hasData = false;
        
        for (let i = 0; i < colLetters.length; i++) {
          const col = colLetters[i];
          const header = headers[i];
          const cellRef = `${col}${row}`;
          
          if (worksheet[cellRef] && worksheet[cellRef].v !== undefined && worksheet[cellRef].v !== '') {
            rowObj[header] = worksheet[cellRef].v;
            hasData = true;
          }
        }
        
        if (hasData) {
          data.push(rowObj);
        }
      }
      
      console.log(`Read ${data.length} data rows`);
      if (data.length > 0) {
        console.log("First data row:", data[0]);
      }
    } catch (e) {
      console.log("Method 3 failed:", e.message);
    }
    
    return "Analysis complete";
  } catch (error) {
    console.error("ERROR:", error);
    return `Error: ${error.message}`;
  }
}

// Check if file path was provided as argument
if (process.argv.length > 2) {
  const filePath = process.argv[2];
  console.log(`Processing file: ${filePath}`);
  parseExcelFile(filePath);
} else {
  console.log("Please provide Excel file path as argument");
}