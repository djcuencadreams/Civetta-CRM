/**
 * Script para actualizar el esquema de la tabla de productos
 * Este script añade las nuevas columnas necesarias para productos
 */
import { pool } from "../db";

async function updateProductSchema() {
  const client = await pool.connect();
  
  try {
    // Iniciar transacción
    await client.query('BEGIN');
    
    console.log("Actualizando esquema de productos...");
    
    // Comprobar si existen las columnas antes de añadirlas
    const columnsToAdd = [
      {
        name: 'status',
        definition: "VARCHAR(20) DEFAULT 'active'"
      },
      {
        name: 'price_discount',
        definition: 'DECIMAL(10, 2)'
      },
      {
        name: 'woocommerce_parent_id',
        definition: 'INTEGER'
      },
      {
        name: 'product_type',
        definition: "VARCHAR(50) DEFAULT 'simple'"
      },
      {
        name: 'weight',
        definition: 'DECIMAL(10, 2)'
      },
      {
        name: 'dimensions',
        definition: 'JSONB DEFAULT \'{}\''
      }
    ];
    
    // Renombrar category a category_id si es necesario
    const checkCategoryColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'products' AND column_name = 'category'
    `);
    
    if (checkCategoryColumn.rows.length > 0) {
      console.log("Renombrando columna 'category' a 'category_id'...");
      await client.query(`
        ALTER TABLE products 
        RENAME COLUMN category TO category_id
      `);
    }
    
    // Añadir las nuevas columnas si no existen
    for (const column of columnsToAdd) {
      const checkColumn = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = $1
      `, [column.name]);
      
      if (checkColumn.rows.length === 0) {
        console.log(`Añadiendo columna '${column.name}'...`);
        await client.query(`
          ALTER TABLE products 
          ADD COLUMN IF NOT EXISTS ${column.name} ${column.definition}
        `);
      } else {
        console.log(`La columna '${column.name}' ya existe.`);
      }
    }
    
    // Confirmar transacción
    await client.query('COMMIT');
    console.log("Esquema de productos actualizado correctamente.");
    
  } catch (error) {
    // Revertir en caso de error
    await client.query('ROLLBACK');
    console.error("Error actualizando el esquema de productos:", error);
    throw error;
  } finally {
    // Liberar cliente
    client.release();
  }
}

// Ejecutar la actualización
updateProductSchema()
  .then(() => {
    console.log("Proceso completado.");
    process.exit(0);
  })
  .catch(error => {
    console.error("Error en el proceso:", error);
    process.exit(1);
  });