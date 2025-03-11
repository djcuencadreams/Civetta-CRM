/**
 * Script para verificar el estado actual del esquema de la base de datos
 */

import { pool } from '../db';

// Consulta SQL para obtener todas las tablas existentes
const TABLES_QUERY = `
  SELECT table_name 
  FROM information_schema.tables 
  WHERE table_schema = 'public'
  ORDER BY table_name;
`;

// Consulta SQL para obtener detalles de una tabla específica
const TABLE_STRUCTURE_QUERY = `
  SELECT 
    column_name, 
    data_type, 
    character_maximum_length,
    column_default,
    is_nullable
  FROM 
    information_schema.columns
  WHERE 
    table_schema = 'public' AND 
    table_name = $1
  ORDER BY 
    ordinal_position;
`;

// Función principal para verificar el esquema
async function checkSchema() {
  console.log('Verificando esquema de base de datos...');
  
  try {
    const client = await pool.connect();
    
    // Obtener lista de tablas
    const tablesResult = await client.query(TABLES_QUERY);
    const tables = tablesResult.rows.map(row => row.table_name);
    
    console.log(`\nTablas encontradas (${tables.length}):`);
    console.log('-'.repeat(40));
    
    if (tables.length === 0) {
      console.log('No se encontraron tablas en la base de datos.');
    } else {
      for (const tableName of tables) {
        console.log(`\nEstructura de tabla: ${tableName}`);
        console.log('-'.repeat(40));
        
        // Obtener estructura de la tabla
        const columnsResult = await client.query(TABLE_STRUCTURE_QUERY, [tableName]);
        
        // Mostrar columnas
        columnsResult.rows.forEach(column => {
          const type = column.character_maximum_length 
            ? `${column.data_type}(${column.character_maximum_length})` 
            : column.data_type;
            
          const nullable = column.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
          const defaultValue = column.column_default ? `DEFAULT ${column.column_default}` : '';
          
          console.log(`${column.column_name.padEnd(25)} ${type.padEnd(15)} ${nullable.padEnd(10)} ${defaultValue}`);
        });
      }
    }
    
    // Verificar si existen tablas específicas requeridas por la aplicación
    const requiredTables = ['customers', 'leads', 'orders', 'order_items', 'products'];
    const missingTables = requiredTables.filter(tableName => !tables.includes(tableName));
    
    if (missingTables.length > 0) {
      console.log('\nTablas requeridas que faltan:');
      console.log('-'.repeat(40));
      missingTables.forEach(tableName => console.log(tableName));
    } else if (requiredTables.every(tableName => tables.includes(tableName))) {
      console.log('\nTodas las tablas requeridas están presentes.');
    }
    
    client.release();
  } catch (error) {
    console.error('Error al verificar el esquema de la base de datos:', error);
  } finally {
    await pool.end();
  }
}

// Ejecutar el script
checkSchema()
  .then(() => {
    console.log('\nVerificación completada.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error en la verificación:', error);
    process.exit(1);
  });