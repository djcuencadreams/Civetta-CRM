/**
 * Script para añadir una columna isFromWebForm a la tabla de órdenes
 * Esta columna se utilizará para identificar órdenes creadas desde el formulario web
 */

import { drizzle } from 'drizzle-orm/neon-serverless';
import { neon } from '@neondatabase/serverless';
import { sql } from 'drizzle-orm';

const sql_query = `
  ALTER TABLE orders 
  ADD COLUMN IF NOT EXISTS is_from_web_form BOOLEAN DEFAULT FALSE;
`;

async function addWebFormColumn() {
  try {
    console.log('🔧 Añadiendo columna is_from_web_form a la tabla orders...');
    
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error('DATABASE_URL no está definida en las variables de entorno');
    }
    
    const client = neon(dbUrl);
    
    // Ejecutar el SQL directamente, ya que drizzle no tiene una API para esto
    await client(sql_query);
    
    console.log('✅ Columna is_from_web_form añadida correctamente');
  } catch (error) {
    console.error('❌ Error al añadir la columna:', error);
    process.exit(1);
  }
}

// Ejecutar la función principal
addWebFormColumn();