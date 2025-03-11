/**
 * Script para crear la estructura completa de la base de datos
 * Este script usa directamente SQL para crear todas las tablas necesarias
 * en lugar de depender de Drizzle para las migraciones
 */

import { pool } from '../db';
import { sql } from 'drizzle-orm';

// Función principal para crear todas las tablas
async function createSchema() {
  console.log('Iniciando creación del esquema de base de datos...');
  
  try {
    await pool.connect();
    console.log('Conexión a la base de datos establecida.');
    
    // Crear tablas en el orden correcto (respetando relaciones de clave foránea)
    await createWebhooksTable();
    await createCustomersTable();
    await createLeadsTable();
    await createLeadActivitiesTable();
    await createProductCategoriesTable();
    await createProductsTable();
    await createOrdersTable();
    await createOrderItemsTable();
    await createSalesTable();
    
    console.log('Esquema de base de datos creado exitosamente.');
  } catch (error) {
    console.error('Error al crear el esquema de base de datos:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Crear tabla webhooks
async function createWebhooksTable() {
  console.log('Creando tabla webhooks...');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS webhooks (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      event TEXT NOT NULL,
      active BOOLEAN DEFAULT TRUE NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
  `);
}

// Crear tabla customers
async function createCustomersTable() {
  console.log('Creando tabla customers...');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS customers (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      first_name TEXT,
      last_name TEXT,
      id_number TEXT,
      email TEXT,
      phone TEXT,
      phone_country TEXT,
      phone_number TEXT,
      street TEXT,
      city TEXT,
      province TEXT,
      delivery_instructions TEXT,
      address TEXT,
      source VARCHAR(50) DEFAULT 'instagram',
      brand VARCHAR(20) DEFAULT 'sleepwear',
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
  `);
}

// Crear tabla leads
async function createLeadsTable() {
  console.log('Creando tabla leads...');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS leads (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      first_name TEXT,
      last_name TEXT,
      id_number TEXT,
      email TEXT,
      phone TEXT,
      phone_country TEXT,
      phone_number TEXT,
      street TEXT,
      city TEXT,
      province TEXT,
      delivery_instructions TEXT,
      status VARCHAR(50) DEFAULT 'new' NOT NULL,
      source VARCHAR(50) DEFAULT 'instagram' NOT NULL,
      brand VARCHAR(20) DEFAULT 'sleepwear',
      brand_interest VARCHAR(50),
      notes TEXT,
      converted_to_customer BOOLEAN DEFAULT FALSE,
      converted_customer_id INTEGER REFERENCES customers(id),
      last_contact TIMESTAMP,
      next_follow_up TIMESTAMP,
      customer_lifecycle_stage VARCHAR(50),
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
  `);
}

// Crear tabla lead_activities
async function createLeadActivitiesTable() {
  console.log('Creando tabla lead_activities...');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS lead_activities (
      id SERIAL PRIMARY KEY,
      lead_id INTEGER NOT NULL REFERENCES leads(id),
      type VARCHAR(50) NOT NULL,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
  `);
}

// Crear tabla product_categories
async function createProductCategoriesTable() {
  console.log('Creando tabla product_categories...');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS product_categories (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      slug TEXT NOT NULL UNIQUE,
      brand VARCHAR(20) DEFAULT 'sleepwear',
      woocommerce_category_id INTEGER,
      parent_category_id INTEGER,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
  `);
  
  // Agregar restricción de clave foránea para parent_category_id después de crear la tabla
  await pool.query(`
    ALTER TABLE product_categories 
    ADD CONSTRAINT fk_product_category_parent 
    FOREIGN KEY (parent_category_id) 
    REFERENCES product_categories(id);
  `);
}

// Crear tabla products
async function createProductsTable() {
  console.log('Creando tabla products...');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
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
      active BOOLEAN DEFAULT TRUE,
      images JSONB DEFAULT '[]',
      attributes JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
  `);
}

// Crear tabla orders
async function createOrdersTable() {
  console.log('Creando tabla orders...');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
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
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
  `);
}

// Crear tabla order_items
async function createOrderItemsTable() {
  console.log('Creando tabla order_items...');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      order_id INTEGER NOT NULL REFERENCES orders(id),
      product_id INTEGER REFERENCES products(id),
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price DECIMAL(10, 2) NOT NULL,
      discount DECIMAL(10, 2) DEFAULT 0,
      subtotal DECIMAL(10, 2) NOT NULL,
      attributes JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
  `);
}

// Crear tabla sales
async function createSalesTable() {
  console.log('Creando tabla sales...');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sales (
      id SERIAL PRIMARY KEY,
      customer_id INTEGER NOT NULL REFERENCES customers(id),
      order_id INTEGER REFERENCES orders(id),
      amount DECIMAL(10, 2) NOT NULL,
      status TEXT NOT NULL,
      payment_method TEXT,
      brand VARCHAR(20) DEFAULT 'sleepwear',
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
  `);
}

// Ejecutamos el script
createSchema()
  .then(() => {
    console.log('Script completado exitosamente.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error durante la ejecución del script:', error);
    process.exit(1);
  });