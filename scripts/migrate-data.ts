/**
 * Script para migrar datos existentes a la nueva estructura de tablas
 * Este script se encargará de:
 * 1. Separar leads y clientes en sus respectivas tablas
 * 2. Crear orders a partir de las ventas actuales
 * 3. Mantener la coherencia de los datos durante la migración
 */

import { db, pool } from '../db';
import { customers, leads, sales } from '../db/schema-original';
import * as newSchema from '../db/schema-new';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

const DEFAULT_BRAND = 'sleepwear';
const DEFAULT_CATEGORY_NAME = 'General';
const DEFAULT_PRODUCT_NAME = 'Producto sin especificar';

async function migrateData() {
  console.log('Iniciando migración de datos a la nueva estructura...');
  
  try {
    // Conexión directa para ejecutar SQL
    const client = await pool.connect();
    
    try {
      // Iniciamos transacción
      await client.query('BEGIN');
      
      // 1. Primero verificamos si existen las tablas necesarias
      console.log('Verificando tablas necesarias...');
      
      // Verificar tablas del esquema nuevo
      const tablesToCheck = [
        'product_categories', 'products', 'orders', 'order_items'
      ];
      
      for (const tableName of tablesToCheck) {
        const tableExists = await client.query(`
          SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = $1
          )
        `, [tableName]);
        
        if (!tableExists.rows[0].exists) {
          console.error(`La tabla ${tableName} no existe. Por favor ejecuta primero el script add-new-columns.ts`);
          throw new Error(`Tabla ${tableName} no encontrada`);
        }
      }
      
      // 2. Crear categoría por defecto si no existe
      console.log('Verificando categoría por defecto...');
      const defaultCategory = await client.query(`
        SELECT id FROM product_categories 
        WHERE name = $1 AND brand = $2
      `, [DEFAULT_CATEGORY_NAME, DEFAULT_BRAND]);
      
      let defaultCategoryId: number;
      
      if (defaultCategory.rowCount === 0) {
        const insertResult = await client.query(`
          INSERT INTO product_categories (name, description, slug, brand)
          VALUES ($1, $2, $3, $4)
          RETURNING id
        `, [
          DEFAULT_CATEGORY_NAME, 
          'Categoría general para productos sin clasificar', 
          'general', 
          DEFAULT_BRAND
        ]);
        
        defaultCategoryId = insertResult.rows[0].id;
        console.log(`Categoría por defecto creada con ID: ${defaultCategoryId}`);
      } else {
        defaultCategoryId = defaultCategory.rows[0].id;
        console.log(`Categoría por defecto encontrada con ID: ${defaultCategoryId}`);
      }
      
      // 3. Crear producto por defecto para las ventas existentes
      console.log('Verificando producto por defecto...');
      const defaultProduct = await client.query(`
        SELECT id FROM products 
        WHERE name = $1 AND brand = $2
      `, [DEFAULT_PRODUCT_NAME, DEFAULT_BRAND]);
      
      let defaultProductId: number;
      
      if (defaultProduct.rowCount === 0) {
        const insertResult = await client.query(`
          INSERT INTO products (
            name, sku, description, category_id, price, 
            stock, brand, active
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING id
        `, [
          DEFAULT_PRODUCT_NAME,
          'DEFAULT-0001',
          'Producto utilizado para migración de datos históricos',
          defaultCategoryId,
          0, // Precio 0, se actualizará con el precio de la venta
          999, // Stock arbitrario
          DEFAULT_BRAND,
          true // Activo
        ]);
        
        defaultProductId = insertResult.rows[0].id;
        console.log(`Producto por defecto creado con ID: ${defaultProductId}`);
      } else {
        defaultProductId = defaultProduct.rows[0].id;
        console.log(`Producto por defecto encontrado con ID: ${defaultProductId}`);
      }
      
      // 4. Migrar ventas actuales a órdenes
      console.log('Migrando ventas existentes a órdenes...');
      
      // Obtener todas las ventas existentes que no tengan order_id
      const existingSales = await client.query(`
        SELECT s.*, c.name as customer_name 
        FROM sales s
        JOIN customers c ON s.customer_id = c.id
        WHERE s.order_id IS NULL
        ORDER BY s.created_at ASC
      `);
      
      console.log(`Se encontraron ${existingSales.rowCount} ventas para migrar a órdenes`);
      
      for (const sale of existingSales.rows) {
        // Generar número de orden basado en el ID de la venta
        const orderNumber = `ORD-${String(sale.id).padStart(6, '0')}`;
        
        // Insertar la orden
        const orderResult = await client.query(`
          INSERT INTO orders (
            customer_id, order_number, total_amount, status,
            payment_status, payment_method, source, brand, notes,
            created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING id
        `, [
          sale.customer_id,
          orderNumber,
          sale.amount,
          'completed', // Estado completado para órdenes históricas
          sale.status === 'paid' ? 'paid' : 'pending',
          sale.payment_method || 'cash', // Método de pago predeterminado
          sale.source || 'direct', // Fuente predeterminada
          sale.brand || DEFAULT_BRAND,
          sale.notes,
          sale.created_at,
          sale.updated_at || sale.created_at
        ]);
        
        const orderId = orderResult.rows[0].id;
        
        // Actualizar la venta con el nuevo order_id
        await client.query(`
          UPDATE sales
          SET order_id = $1
          WHERE id = $2
        `, [orderId, sale.id]);
        
        // Crear item de orden con el producto predeterminado
        await client.query(`
          INSERT INTO order_items (
            order_id, product_id, product_name, quantity,
            unit_price, subtotal, created_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          orderId,
          defaultProductId,
          DEFAULT_PRODUCT_NAME,
          1, // Cantidad predeterminada
          sale.amount, // Precio unitario igual al monto de la venta
          sale.amount, // Subtotal igual al monto de la venta
          sale.created_at
        ]);
        
        console.log(`- Migrada venta ID ${sale.id} a orden ID ${orderId} para cliente: ${sale.customer_name}`);
      }
      
      // 5. Identificar leads vs customers
      console.log('Separando leads de clientes...');
      
      // Verificar clientes actuales
      const currentCustomers = await client.query(`
        SELECT * FROM customers
      `);
      
      console.log(`Se encontraron ${currentCustomers.rowCount} clientes para revisar`);
      
      let leadCount = 0;
      
      // Identificar clientes sin ventas y moverlos a leads
      for (const customer of currentCustomers.rows) {
        // Verificar si el cliente tiene ventas
        const customerSales = await client.query(`
          SELECT id FROM sales WHERE customer_id = $1 LIMIT 1
        `, [customer.id]);
        
        // Si no tiene ventas, es un lead
        if (customerSales.rowCount === 0) {
          leadCount++;
          
          // Verificar si ya existe un lead con este correo
          let leadExists = false;
          
          if (customer.email) {
            const existingLead = await client.query(`
              SELECT id FROM leads WHERE email = $1 LIMIT 1
            `, [customer.email]);
            
            leadExists = existingLead.rowCount > 0;
          }
          
          if (!leadExists) {
            // Insertarlo como lead
            await client.query(`
              INSERT INTO leads (
                name, first_name, last_name, email, phone, 
                phone_country, phone_number, street, city, province,
                delivery_instructions, id_number, status, source, 
                brand, brand_interest, notes, created_at, updated_at
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
            `, [
              customer.name,
              customer.first_name || '',
              customer.last_name || '',
              customer.email,
              customer.phone,
              customer.phone_country,
              customer.phone_number,
              customer.street,
              customer.city,
              customer.province,
              customer.delivery_instructions,
              customer.id_number,
              'new', // Estado predeterminado
              customer.source,
              customer.brand,
              customer.brand, // Brand interest = current brand
              `Migrado desde cliente ID ${customer.id}: ${customer.notes || ''}`,
              customer.created_at,
              customer.updated_at || customer.created_at
            ]);
            
            console.log(`- Cliente ID ${customer.id} (${customer.name}) movido a leads`);
          } else {
            console.log(`- Cliente ID ${customer.id} (${customer.name}) ya existe como lead, se omite`);
          }
        }
      }
      
      console.log(`Se identificaron ${leadCount} clientes como leads`);
      
      // Confirmamos transacción
      await client.query('COMMIT');
      console.log('Migración de datos completada con éxito!');
      
    } catch (err) {
      // Revertimos transacción en caso de error
      await client.query('ROLLBACK');
      console.error('Error durante la migración de datos:', err);
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
migrateData()
  .then(() => {
    console.log('Script de migración de datos finalizado.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error en el script de migración de datos:', err);
    process.exit(1);
  });