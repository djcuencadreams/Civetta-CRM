/**
 * Módulo para gestionar la configuración de WooCommerce
 * Este módulo almacena y recupera las credenciales en la base de datos
 */
import { db } from '../../db';
import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm/sql';

// Definición de la interfaz de configuración
export interface WooCommerceConfig {
  url: string;
  consumerKey: string;
  consumerSecret: string;
  enabled: boolean;
}

// Configuración predeterminada
let config: WooCommerceConfig = {
  url: '',
  consumerKey: '',
  consumerSecret: '',
  enabled: false
};

// Nombre de la tabla de configuración en la base de datos
const CONFIG_TABLE = 'system_config';
const WOO_CONFIG_KEY = 'woocommerce';

/**
 * Carga la configuración de WooCommerce desde la base de datos
 * @returns Configuración cargada
 */
export async function loadWooCommerceConfig(): Promise<WooCommerceConfig> {
  try {
    // Verificar si la tabla de configuración existe
    const tablesResult = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'system_config'
      );
    `);
    
    const tableExists = tablesResult.rows[0]?.exists || false;
    
    if (!tableExists) {
      // Crear la tabla de configuración si no existe
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS system_config (
          key TEXT PRIMARY KEY,
          value JSONB NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
    }
    
    // Consultar la configuración en la base de datos
    const result = await db.execute(sql`
      SELECT value FROM system_config 
      WHERE key = 'woocommerce';
    `);
    
    if (result.rows.length > 0) {
      const dbConfig = result.rows[0].value as Record<string, any>;
      config = {
        url: dbConfig.url || '',
        consumerKey: dbConfig.consumerKey || '',
        consumerSecret: dbConfig.consumerSecret || '',
        enabled: !!dbConfig.enabled
      };
      
      // Actualizar las variables de entorno para compatibilidad con código existente
      if (config.url) process.env.WOO_URL = config.url;
      if (config.consumerKey) process.env.WOO_KEY = config.consumerKey;
      if (config.consumerSecret) process.env.WOO_SECRET = config.consumerSecret;
    }
    
    return config;
  } catch (error) {
    console.error('Error al cargar la configuración de WooCommerce:', error);
    return config;
  }
}

/**
 * Guarda la configuración de WooCommerce en la base de datos
 * @param newConfig Configuración a guardar
 * @returns Resultado de la operación
 */
export async function saveWooCommerceConfig(newConfig: WooCommerceConfig): Promise<WooCommerceConfig> {
  try {
    // Asegurarse de que la tabla existe
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS system_config (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Insertar o actualizar la configuración
    const configJson = JSON.stringify(newConfig);
    await db.execute(sql`
      INSERT INTO system_config (key, value, updated_at)
      VALUES ('woocommerce', ${configJson}::jsonb, CURRENT_TIMESTAMP)
      ON CONFLICT (key) 
      DO UPDATE SET 
        value = ${configJson}::jsonb,
        updated_at = CURRENT_TIMESTAMP;
    `);
    
    // Actualizar la configuración en memoria
    config = { ...newConfig };
    
    // Actualizar las variables de entorno para compatibilidad con código existente
    if (config.url) process.env.WOO_URL = config.url;
    if (config.consumerKey) process.env.WOO_KEY = config.consumerKey;
    if (config.consumerSecret) process.env.WOO_SECRET = config.consumerSecret;
    
    return config;
  } catch (error) {
    console.error('Error al guardar la configuración de WooCommerce:', error);
    throw new Error(`Error al guardar la configuración: ${(error as Error).message}`);
  }
}

/**
 * Obtiene la configuración actual de WooCommerce
 * @returns Configuración actual
 */
export function getWooCommerceConfig(): WooCommerceConfig {
  return { ...config };
}

/**
 * Verifica si las credenciales de WooCommerce están configuradas
 * @returns true si las credenciales están completas, false en caso contrario
 */
export function hasWooCommerceCredentials(): boolean {
  return !!config.url && !!config.consumerKey && !!config.consumerSecret;
}

/**
 * Verifica si WooCommerce está habilitado
 * @returns true si está habilitado, false en caso contrario
 */
export function isWooCommerceEnabled(): boolean {
  return config.enabled && hasWooCommerceCredentials();
}

// Cargar la configuración cuando se importa el módulo
loadWooCommerceConfig()
  .then(() => {
    console.log('Configuración de WooCommerce cargada correctamente');
  })
  .catch(error => {
    console.error('Error al inicializar la configuración de WooCommerce:', error);
  });