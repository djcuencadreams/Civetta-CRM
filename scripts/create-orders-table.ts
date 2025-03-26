/**
 * Script para crear las tablas orders, products y order_items
 * Este script es una versión simplificada de add-new-columns.ts
 * que solo crea las tablas necesarias sin añadir restricciones adicionales
 */

import { pool } from '../db';

async function createOrdersTable() {
  console.log('Iniciando creación de tablas...');
  
  try {
    // Conexión directa para ejecutar SQL
    const client = await pool.connect();
    
    try {
      // Iniciamos transacción
      await client.query('BEGIN');
      
      // Verificamos si existe la tabla products
      console.log('Verificando si existe tabla products...');
      const productsTable = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name = 'products'
      `);
      
      if (productsTable.rowCount === 0) {
        console.log('Creando tabla products...');
        await client.query(`
          CREATE TABLE products (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            sku TEXT NOT NULL UNIQUE,
            description TEXT,
            category_id INTEGER REFERENCES product_categories(id),
            price DECIMAL(10, 2) NOT NULL,
            stock INTEGER DEFAULT 0,
            brand VARCHAR(20) DEFAULT 'sleepwear',
            woocommerce_id INTEGER,
            woocommerce_url TEXT,
            active BOOLEAN DEFAULT true,
            images JSONB DEFAULT '[]',
            attributes JSONB DEFAULT '{}',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
          )
        `);
      } else {
        console.log('La tabla products ya existe.');
      }
      
      // Verificamos si existe la tabla crm_users (necesaria para la referencia en orders)
      console.log('Verificando si existe tabla crm_users...');
      const crmUsersTable = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name = 'crm_users'
      `);
      
      if (crmUsersTable.rowCount === 0) {
        console.log('ADVERTENCIA: La tabla crm_users no existe. La tabla orders no podrá tener la restricción foreign key a crm_users.');
      } else {
        console.log('La tabla crm_users existe.');
      }
      
      // Verificamos si existe la tabla orders
      console.log('Verificando si existe tabla orders...');
      const ordersTable = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name = 'orders'
      `);
      
      if (ordersTable.rowCount === 0) {
        console.log('Creando tabla orders...');
        await client.query(`
          CREATE TABLE orders (
            id SERIAL PRIMARY KEY,
            customer_id INTEGER REFERENCES customers(id),
            lead_id INTEGER REFERENCES leads(id),
            order_number TEXT UNIQUE,
            total_amount DECIMAL(10, 2) NOT NULL,
            subtotal DECIMAL(10, 2),
            tax DECIMAL(10, 2) DEFAULT 0,
            discount DECIMAL(10, 2) DEFAULT 0,
            shipping_cost DECIMAL(10, 2) DEFAULT 0,
            status VARCHAR(50) DEFAULT 'new',
            payment_status VARCHAR(50) DEFAULT 'pending',
            payment_method VARCHAR(50),
            payment_details JSONB DEFAULT '{}',
            payment_date TIMESTAMP,
            source VARCHAR(50) DEFAULT 'website',
            is_from_web_form BOOLEAN DEFAULT false,
            woocommerce_id INTEGER,
            tracking_number TEXT,
            shipping_method VARCHAR(50),
            brand VARCHAR(20) DEFAULT 'sleepwear',
            shipping_address JSONB DEFAULT '{}',
            billing_address JSONB DEFAULT '{}',
            coupon_code TEXT,
            assigned_user_id INTEGER,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
          )
        `);
      } else {
        console.log('La tabla orders ya existe.');
      }
      
      // Verificamos si existe la tabla order_items
      console.log('Verificando si existe tabla order_items...');
      const orderItemsTable = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name = 'order_items'
      `);
      
      if (orderItemsTable.rowCount === 0) {
        console.log('Creando tabla order_items...');
        await client.query(`
          CREATE TABLE order_items (
            id SERIAL PRIMARY KEY,
            order_id INTEGER NOT NULL REFERENCES orders(id),
            product_id INTEGER REFERENCES products(id),
            product_name TEXT NOT NULL,
            quantity INTEGER NOT NULL DEFAULT 1,
            unit_price DECIMAL(10, 2) NOT NULL,
            discount DECIMAL(10, 2) DEFAULT 0,
            subtotal DECIMAL(10, 2) NOT NULL,
            attributes JSONB DEFAULT '{}',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
          )
        `);
      } else {
        console.log('La tabla order_items ya existe.');
      }
      
      // Verificamos si la columna order_id existe en la tabla sales
      console.log('Verificando columna order_id en sales...');
      const salesOrderId = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'sales' AND column_name = 'order_id'
      `);
      
      if (salesOrderId.rowCount === 0) {
        console.log('Añadiendo columna order_id a tabla sales...');
        await client.query(`
          ALTER TABLE sales
          ADD COLUMN order_id INTEGER REFERENCES orders(id)
        `);
      } else {
        console.log('La columna order_id ya existe en sales.');
      }
      
      // Confirmamos transacción
      await client.query('COMMIT');
      console.log('Creación de tablas completada con éxito');
      
    } catch (err) {
      // Revertimos transacción en caso de error
      await client.query('ROLLBACK');
      console.error('Error durante la creación de tablas:', err);
      throw err;
    } finally {
      // Liberamos el cliente
      client.release();
    }
    
  } catch (err) {
    console.error('Error conectando a la base de datos:', err);
    throw err;
  }
}

// Ejecutamos la función
createOrdersTable()
  .then(() => {
    console.log('Script de creación de tablas finalizado.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error en el script de creación de tablas:', err);
    process.exit(1);
  });