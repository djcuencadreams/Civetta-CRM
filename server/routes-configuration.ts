/**
 * Rutas para la configuración general del CRM
 */
import { Express, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../db';
import fetch from 'node-fetch';
import * as WooConfig from './lib/woocommerce-config';

// Esquema de validación para configuración de WooCommerce
const wooCommerceConfigSchema = z.object({
  url: z.string().url().min(1),
  consumerKey: z.string().min(1),
  consumerSecret: z.string().min(1),
  enabled: z.boolean().default(true)
});

/**
 * Registra las rutas de configuración del sistema
 * @param app Aplicación Express
 */
export function registerConfigurationRoutes(app: Express): void {
  /**
   * Obtiene la configuración de WooCommerce
   */
  app.get('/api/configuration/woocommerce', async (_req: Request, res: Response) => {
    try {
      const config = await WooConfig.loadWooCommerceConfig();
      
      // Retorna un objeto seguro sin las credenciales sensibles
      const safeConfig = {
        url: config.url,
        enabled: config.enabled,
        hasCredentials: !!config.consumerKey && !!config.consumerSecret
      };
      
      res.json(safeConfig);
    } catch (error) {
      console.error('Error al obtener la configuración de WooCommerce:', error);
      res.status(500).json({ error: 'Error al obtener la configuración' });
    }
  });

  /**
   * Actualiza la configuración de WooCommerce
   */
  app.post('/api/configuration/woocommerce', async (req: Request, res: Response) => {
    try {
      const validation = wooCommerceConfigSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ 
          error: 'Datos de configuración inválidos', 
          details: validation.error.format() 
        });
      }
      
      const config = validation.data;
      
      // Verificar que la URL es accesible
      try {
        const urlCheck = await fetch(config.url);
        if (!urlCheck.ok) {
          return res.status(400).json({ 
            error: 'No se pudo conectar a la URL proporcionada' 
          });
        }
      } catch (urlError) {
        return res.status(400).json({ 
          error: 'URL inaccesible o con formato incorrecto',
          details: (urlError as Error).message
        });
      }
      
      // Guardar la configuración en la base de datos
      const savedConfig = await WooConfig.saveWooCommerceConfig(config);
      
      // Retorna un objeto seguro sin las credenciales sensibles
      const safeConfig = {
        url: savedConfig.url,
        enabled: savedConfig.enabled,
        hasCredentials: !!savedConfig.consumerKey && !!savedConfig.consumerSecret
      };
      
      res.json(safeConfig);
    } catch (error) {
      console.error('Error al actualizar la configuración de WooCommerce:', error);
      res.status(500).json({ error: 'Error al guardar la configuración' });
    }
  });

  /**
   * Verifica la conexión con WooCommerce 
   */
  app.get('/api/configuration/woocommerce/test', async (_req: Request, res: Response) => {
    try {
      const config = await WooConfig.loadWooCommerceConfig();
      
      if (!config.url || !config.consumerKey || !config.consumerSecret) {
        return res.status(400).json({ 
          error: 'Configuración incompleta. Proporcione URL, Consumer Key y Consumer Secret.' 
        });
      }
      
      // Intenta hacer una petición a la API de WooCommerce para verificar credenciales
      const endpoint = `${config.url}/wp-json/wc/v3/products?per_page=1`;
      
      const headers: { [key: string]: string } = {
        'Content-Type': 'application/json',
      };
      
      // Usar Basic Auth con las claves proporcionadas
      const auth = Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString('base64');
      headers.Authorization = `Basic ${auth}`;
      
      const response = await fetch(endpoint, { 
        method: 'GET',
        headers
      });
      
      if (!response.ok) {
        const errorData = await response.json() as Record<string, any>;
        console.error('Error de conexión WooCommerce:', errorData);
        return res.status(response.status).json({ 
          error: 'Error al conectar con WooCommerce', 
          details: errorData.message || 'Credenciales inválidas o acceso denegado'
        });
      }
      
      // Conexión exitosa
      res.json({ 
        success: true, 
        message: 'Conexión exitosa con WooCommerce' 
      });
    } catch (error) {
      console.error('Error al verificar conexión con WooCommerce:', error);
      res.status(500).json({ 
        error: 'Error al verificar la conexión', 
        details: (error as Error).message 
      });
    }
  });

  /**
   * Obtiene la configuración de WooCommerce para uso interno del servidor
   */
  app.get('/api/internal/woocommerce-config', async (_req: Request, res: Response) => {
    try {
      const config = await WooConfig.loadWooCommerceConfig();
      
      if (!WooConfig.isWooCommerceEnabled()) {
        return res.status(400).json({ error: 'WooCommerce no está habilitado o configurado correctamente' });
      }
      
      res.json({
        url: config.url,
        consumerKey: config.consumerKey,
        consumerSecret: config.consumerSecret,
        enabled: config.enabled
      });
    } catch (error) {
      console.error('Error al obtener la configuración interna de WooCommerce:', error);
      res.status(500).json({ error: 'Error al obtener la configuración interna' });
    }
  });
}