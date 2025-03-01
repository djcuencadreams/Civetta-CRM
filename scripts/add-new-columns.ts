/**
 * Script para añadir nuevas columnas a las tablas existentes de forma segura
 * Se ejecutará manualmente cuando estemos listos para migrar
 */

import { db, pool } from '../db';
import { sql } from 'drizzle-orm';

async function addColumnsToTables() {
  console.log('Iniciando migración de columnas...');
  
  try {
    // Conexión directa para ejecutar SQL
    const client = await pool.connect();
    
    try {
      // Iniciamos transacción
      await client.query('BEGIN');
      
      // Añadimos columna id_number a leads si no existe
      console.log('Verificando columna id_number en leads...');
      const leadsColumns = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'id_number'
      `);
      
      if (leadsColumns.rowCount === 0) {
        console.log('Añadiendo columna id_number a tabla leads...');
        await client.query(`
          ALTER TABLE leads
          ADD COLUMN id_number TEXT
        `);
      } else {
        console.log('La columna id_number ya existe en leads.');
      }
      
      // Añadimos columna brand_interest a leads si no existe
      console.log('Verificando columna brand_interest en leads...');
      const leadsBrandInterest = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'brand_interest'
      `);
      
      if (leadsBrandInterest.rowCount === 0) {
        console.log('Añadiendo columna brand_interest a tabla leads...');
        await client.query(`
          ALTER TABLE leads
          ADD COLUMN brand_interest VARCHAR(50)
        `);
      } else {
        console.log('La columna brand_interest ya existe en leads.');
      }
      
      // Añadimos columna order_id a sales si no existe
      console.log('Verificando columna order_id en sales...');
      const salesColumns = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'sales' AND column_name = 'order_id'
      `);
      
      if (salesColumns.rowCount === 0) {
        console.log('Añadiendo columna order_id a tabla sales...');
        await client.query(`
          ALTER TABLE sales
          ADD COLUMN order_id INTEGER
        `);
      } else {
        console.log('La columna order_id ya existe en sales.');
      }
      
      // Verificamos si existe la tabla product_categories
      console.log('Verificando si existe tabla product_categories...');
      const productCategoriesTable = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name = 'product_categories'
      `);
      
      if (productCategoriesTable.rowCount === 0) {
        console.log('Creando tabla product_categories...');
        await client.query(`
          CREATE TABLE product_categories (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            slug TEXT NOT NULL UNIQUE,
            brand VARCHAR(20) DEFAULT 'sleepwear',
            woocommerce_category_id INTEGER,
            parent_category_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
          )
        `);
      } else {
        console.log('La tabla product_categories ya existe.');
      }
      
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
            status VARCHAR(50) DEFAULT 'new',
            payment_status VARCHAR(50) DEFAULT 'pending',
            payment_method VARCHAR(50),
            source VARCHAR(50) DEFAULT 'website',
            woocommerce_id INTEGER,
            brand VARCHAR(20) DEFAULT 'sleepwear',
            shipping_address JSONB DEFAULT '{}',
            billing_address JSONB DEFAULT '{}',
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
            discount DECIMAL(10, 2) DEFAULT '0',
            subtotal DECIMAL(10, 2) NOT NULL,
            attributes JSONB DEFAULT '{}',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
          )
        `);
      } else {
        console.log('La tabla order_items ya existe.');
      }
      
      // Verificamos si existe la restricción de clave foránea para sales.order_id
      if (salesColumns.rowCount !== null && salesColumns.rowCount > 0) {
        console.log('Verificando si existe la restricción de clave foránea para sales.order_id...');
        const foreignKeyExists = await client.query(`
          SELECT constraint_name
          FROM information_schema.table_constraints
          WHERE table_name = 'sales' 
          AND constraint_type = 'FOREIGN KEY' 
          AND constraint_name LIKE '%order_id%'
        `);
        
        if (foreignKeyExists.rowCount === 0) {
          console.log('Añadiendo restricción de clave foránea a sales.order_id...');
          await client.query(`
            ALTER TABLE sales
            ADD CONSTRAINT sales_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id)
          `);
        } else {
          console.log('La restricción de clave foránea para sales.order_id ya existe.');
        }
      }
      
      // Añadimos self-reference a product_categories
      if (productCategoriesTable.rowCount !== null && productCategoriesTable.rowCount > 0) {
        console.log('Verificando si existe la restricción de clave foránea para product_categories.parent_category_id...');
        const categoryForeignKeyExists = await client.query(`
          SELECT constraint_name
          FROM information_schema.table_constraints
          WHERE table_name = 'product_categories' 
          AND constraint_type = 'FOREIGN KEY' 
          AND constraint_name LIKE '%parent_category_id%'
        `);
        
        if (categoryForeignKeyExists.rowCount === 0) {
          console.log('Añadiendo restricción de clave foránea a product_categories.parent_category_id...');
          await client.query(`
            ALTER TABLE product_categories
            ADD CONSTRAINT product_categories_parent_category_id_fkey FOREIGN KEY (parent_category_id) REFERENCES product_categories(id)
          `);
        } else {
          console.log('La restricción de clave foránea para product_categories.parent_category_id ya existe.');
        }
      }
      
      // Confirmamos transacción
      await client.query('COMMIT');
      console.log('Migración completada con éxito!');
      
    } catch (err) {
      // Revertimos transacción en caso de error
      await client.query('ROLLBACK');
      console.error('Error durante la migración:', err);
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

// Ejecutamos la migración
addColumnsToTables()
  .then(() => {
    console.log('Script de migración finalizado.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error en el script de migración:', err);
    process.exit(1);
  });