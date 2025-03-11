/**
 * Script para actualizar el esquema de la base de datos 
 * si hay campos faltantes entre el esquema definido y la base de datos actual
 */

import { pool } from '../db';

async function updateSchema() {
  console.log('Iniciando actualización del esquema...');
  
  try {
    const client = await pool.connect();
    
    // Actualizaciones de la tabla 'leads'
    await updateLeadsTable(client);
    
    // Actualizaciones de la tabla 'customers'
    await updateCustomersTable(client);
    
    // Actualizaciones de la tabla 'orders'
    await updateOrdersTable(client);
    
    // Actualizaciones de la tabla 'products'
    await updateProductsTable(client);
    
    // Actualizaciones de la tabla 'order_items'
    await updateOrderItemsTable(client);
    
    client.release();
    console.log('Esquema actualizado correctamente');
  } catch (error) {
    console.error('Error al actualizar el esquema:', error);
  } finally {
    await pool.end();
  }
}

async function updateLeadsTable(client) {
  console.log('Verificando y actualizando tabla leads...');
  
  // Añadir convertedCustomerId si no existe
  await addColumnIfNotExists(client, 'leads', 'converted_customer_id', 'INTEGER REFERENCES customers(id)');
  
  // Añadir idNumber si no existe
  await addColumnIfNotExists(client, 'leads', 'id_number', 'TEXT');
  
  // Añadir brandInterest si no existe
  await addColumnIfNotExists(client, 'leads', 'brand_interest', 'VARCHAR(50)');
}

async function updateCustomersTable(client) {
  console.log('Verificando y actualizando tabla customers...');
  
  // Añadir idNumber si no existe
  await addColumnIfNotExists(client, 'customers', 'id_number', 'TEXT');
}

async function updateOrdersTable(client) {
  console.log('Verificando y actualizando tabla orders...');
  
  // Añadir leadId si no existe (para pedidos generados desde leads)
  await addColumnIfNotExists(client, 'orders', 'lead_id', 'INTEGER REFERENCES leads(id)');
  
  // Añadir shipping_address y billing_address si no existen
  await addColumnIfNotExists(client, 'orders', 'shipping_address', 'JSONB DEFAULT \'{}\'');
  await addColumnIfNotExists(client, 'orders', 'billing_address', 'JSONB DEFAULT \'{}\'');
  
  // Añadir woocommerce_id si no existe
  await addColumnIfNotExists(client, 'orders', 'woocommerce_id', 'INTEGER');
}

async function updateProductsTable(client) {
  console.log('Verificando y actualizando tabla products...');
  
  // Añadir campos de integración con WooCommerce si no existen
  await addColumnIfNotExists(client, 'products', 'woocommerce_id', 'INTEGER');
  await addColumnIfNotExists(client, 'products', 'woocommerce_url', 'TEXT');
  
  // Añadir campo de imágenes como JSON si no existe
  await addColumnIfNotExists(client, 'products', 'images', 'JSONB DEFAULT \'[]\'');
  
  // Añadir campo de atributos como JSON si no existe
  await addColumnIfNotExists(client, 'products', 'attributes', 'JSONB DEFAULT \'{}\'');
}

async function updateOrderItemsTable(client) {
  console.log('Verificando y actualizando tabla order_items...');
  
  // Añadir campo de atributos como JSON si no existe
  await addColumnIfNotExists(client, 'order_items', 'attributes', 'JSONB DEFAULT \'{}\'');
}

async function addColumnIfNotExists(client, table, column, definition) {
  // Verificar si la columna ya existe
  const checkQuery = `
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = $1 AND column_name = $2;
  `;
  
  const result = await client.query(checkQuery, [table, column]);
  
  if (result.rows.length === 0) {
    console.log(`Añadiendo columna ${column} a la tabla ${table}...`);
    
    // La columna no existe, agregarla
    const addQuery = `
      ALTER TABLE ${table} 
      ADD COLUMN IF NOT EXISTS ${column} ${definition};
    `;
    
    await client.query(addQuery);
    console.log(`Columna ${column} añadida correctamente a la tabla ${table}`);
  } else {
    console.log(`La columna ${column} ya existe en la tabla ${table}`);
  }
}

// Ejecutar el script
updateSchema()
  .then(() => {
    console.log('Actualización del esquema completada');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error en la actualización del esquema:', error);
    process.exit(1);
  });