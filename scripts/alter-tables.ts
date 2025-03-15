/**
 * Script para alterar las tablas existentes y añadir las nuevas columnas
 */
import { pool } from '../db';

async function alterTables() {
  const client = await pool.connect();
  
  try {
    console.log('Iniciando alteración de tablas...');
    
    await client.query('BEGIN');
    
    // Añadir columnas a customers
    console.log('Alterando tabla customers...');
    await addColumnsIfNotExist(client, 'customers', [
      { name: 'type', definition: 'VARCHAR(20) DEFAULT \'person\'' },
      { name: 'secondary_phone', definition: 'TEXT' },
      { name: 'billing_address', definition: 'JSONB DEFAULT \'{}\'' },
      { name: 'status', definition: 'VARCHAR(20) DEFAULT \'active\'' },
      { name: 'tags', definition: 'JSONB DEFAULT \'[]\'' },
      { name: 'total_value', definition: 'DECIMAL(10, 2) DEFAULT 0' },
      { name: 'assigned_user_id', definition: 'INTEGER' },
      { name: 'last_purchase', definition: 'TIMESTAMP' }
    ]);

    // Añadir columnas a leads
    console.log('Alterando tabla leads...');
    await addColumnsIfNotExist(client, 'leads', [
      { name: 'priority', definition: 'VARCHAR(10) DEFAULT \'medium\'' },
      { name: 'assigned_user_id', definition: 'INTEGER' },
      { name: 'communication_preference', definition: 'VARCHAR(20)' }
    ]);

    // Añadir columnas a productos
    console.log('Alterando tabla products...');
    await addColumnsIfNotExist(client, 'products', [
      { name: 'price_discount', definition: 'DECIMAL(10, 2)' },
      { name: 'product_type', definition: 'VARCHAR(50) DEFAULT \'simple\'' },
      { name: 'variants', definition: 'JSONB DEFAULT \'[]\'' },
      { name: 'related_products', definition: 'JSONB DEFAULT \'[]\'' }
    ]);

    // Añadir columnas a orders
    console.log('Alterando tabla orders...');
    await addColumnsIfNotExist(client, 'orders', [
      { name: 'subtotal', definition: 'DECIMAL(10, 2)' },
      { name: 'tax', definition: 'DECIMAL(10, 2) DEFAULT 0' },
      { name: 'discount', definition: 'DECIMAL(10, 2) DEFAULT 0' },
      { name: 'shipping_cost', definition: 'DECIMAL(10, 2) DEFAULT 0' },
      { name: 'payment_details', definition: 'JSONB DEFAULT \'{}\'' },
      { name: 'payment_date', definition: 'TIMESTAMP' },
      { name: 'tracking_number', definition: 'TEXT' },
      { name: 'shipping_method', definition: 'VARCHAR(50)' },
      { name: 'coupon_code', definition: 'TEXT' },
      { name: 'assigned_user_id', definition: 'INTEGER' }
    ]);

    // Añadir columnas a lead_activities
    console.log('Alterando tabla lead_activities...');
    await addColumnsIfNotExist(client, 'lead_activities', [
      { name: 'title', definition: 'TEXT' },
      { name: 'status', definition: 'VARCHAR(20) DEFAULT \'pending\'' },
      { name: 'priority', definition: 'VARCHAR(10) DEFAULT \'medium\'' },
      { name: 'due_date', definition: 'TIMESTAMP' },
      { name: 'completed_date', definition: 'TIMESTAMP' },
      { name: 'assigned_user_id', definition: 'INTEGER' },
      { name: 'result', definition: 'TEXT' },
      { name: 'updated_at', definition: 'TIMESTAMP DEFAULT NOW()' }
    ]);

    // Crear nuevas tablas
    console.log('Creando nuevas tablas si no existen...');
    
    // Tabla de CRM Users
    await createTableIfNotExists(client, 'crm_users', `
      id SERIAL PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'sales',
      active BOOLEAN NOT NULL DEFAULT TRUE,
      last_login TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    `);

    // Tabla de Oportunidades
    await createTableIfNotExists(client, 'opportunities', `
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      customer_id INTEGER REFERENCES customers(id),
      lead_id INTEGER REFERENCES leads(id),
      estimated_value DECIMAL(10, 2) NOT NULL,
      probability INTEGER,
      status VARCHAR(50) NOT NULL DEFAULT 'negotiation',
      stage VARCHAR(50) NOT NULL,
      assigned_user_id INTEGER REFERENCES crm_users(id),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      estimated_close_date TIMESTAMP,
      notes TEXT,
      products_interested JSONB DEFAULT '[]',
      next_action_date TIMESTAMP
    `);

    // Tabla de Interacciones
    await createTableIfNotExists(client, 'interactions', `
      id SERIAL PRIMARY KEY,
      customer_id INTEGER REFERENCES customers(id),
      lead_id INTEGER REFERENCES leads(id),
      opportunity_id INTEGER REFERENCES opportunities(id),
      type VARCHAR(50) NOT NULL DEFAULT 'query',
      channel VARCHAR(50) NOT NULL DEFAULT 'whatsapp',
      content TEXT NOT NULL,
      attachments JSONB DEFAULT '[]',
      assigned_user_id INTEGER REFERENCES crm_users(id),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      is_resolved BOOLEAN DEFAULT FALSE,
      resolution_notes TEXT
    `);

    // Tabla de Actividades
    await createTableIfNotExists(client, 'activities', `
      id SERIAL PRIMARY KEY,
      type VARCHAR(50) NOT NULL DEFAULT 'task',
      title TEXT NOT NULL,
      description TEXT,
      start_time TIMESTAMP NOT NULL,
      end_time TIMESTAMP NOT NULL,
      customer_id INTEGER REFERENCES customers(id),
      lead_id INTEGER REFERENCES leads(id),
      opportunity_id INTEGER REFERENCES opportunities(id),
      assigned_user_id INTEGER REFERENCES crm_users(id) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      priority VARCHAR(10) DEFAULT 'medium',
      reminder_time TIMESTAMP,
      notes TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    `);

    await client.query('COMMIT');
    console.log('Alteración de tablas completada exitosamente');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error alterando tablas:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function addColumnsIfNotExist(client: any, table: string, columns: { name: string, definition: string }[]) {
  for (const column of columns) {
    try {
      // Verificar si la columna ya existe
      const columnCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = $1 AND column_name = $2
      `, [table, column.name]);
      
      if (columnCheck.rows.length === 0) {
        // Si la columna no existe, añadirla
        await client.query(`ALTER TABLE ${table} ADD COLUMN ${column.name} ${column.definition}`);
        console.log(`Columna ${column.name} añadida a la tabla ${table}`);
      } else {
        console.log(`Columna ${column.name} ya existe en la tabla ${table}`);
      }
    } catch (error) {
      console.error(`Error al añadir columna ${column.name} a ${table}:`, error);
      throw error;
    }
  }
}

async function createTableIfNotExists(client: any, table: string, definition: string) {
  try {
    // Verificar si la tabla ya existe
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = $1
    `, [table]);
    
    if (tableCheck.rows.length === 0) {
      // Si la tabla no existe, crearla
      await client.query(`CREATE TABLE ${table} (${definition})`);
      console.log(`Tabla ${table} creada`);
    } else {
      console.log(`Tabla ${table} ya existe`);
    }
  } catch (error) {
    console.error(`Error al crear tabla ${table}:`, error);
    throw error;
  }
}

// Ejecutar la función principal
alterTables().then(() => {
  console.log('Script finalizado');
  process.exit(0);
}).catch(error => {
  console.error('Error en el script:', error);
  process.exit(1);
});