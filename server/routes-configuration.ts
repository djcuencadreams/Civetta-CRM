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
  enabled: z.boolean().default(true),
  storeName: z.string().optional()
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
        storeName: config.storeName || '',
        storeInfo: config.storeInfo || { version: '', productsCount: 0, ordersCount: 0 },
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
        storeName: savedConfig.storeName || '',
        storeInfo: savedConfig.storeInfo || { version: '', productsCount: 0, ordersCount: 0 },
        hasCredentials: !!savedConfig.consumerKey && !!savedConfig.consumerSecret
      };
      
      res.json(safeConfig);
    } catch (error) {
      console.error('Error al actualizar la configuración de WooCommerce:', error);
      res.status(500).json({ error: 'Error al guardar la configuración' });
    }
  });

  /**
   * Verifica la conexión con WooCommerce y recopila información de la tienda
   */
  app.post('/api/configuration/woocommerce/test', async (req: Request, res: Response) => {
    try {
      // Usar los valores proporcionados directamente en la petición en lugar de cargar la configuración
      const { url, consumerKey, consumerSecret, storeName } = req.body;
      
      if (!url || !consumerKey || !consumerSecret) {
        return res.status(400).json({ 
          error: 'Configuración incompleta. Proporcione URL, Consumer Key y Consumer Secret.' 
        });
      }
      
      // Verificar que la URL es correcta y accesible primero
      try {
        // Comprobar primero si el sitio es accesible
        console.log('Verificando acceso al sitio:', url);
        const siteCheck = await fetch(url, { 
          method: 'GET',
          headers: { 'Accept': 'text/html' }
        });

        if (!siteCheck.ok) {
          return res.status(400).json({
            error: 'El sitio no está accesible',
            details: `No se pudo acceder a ${url}. Respuesta: ${siteCheck.status} ${siteCheck.statusText}`
          });
        }
      } catch (urlError: any) {
        console.error('Error al verificar la URL:', urlError);
        return res.status(400).json({
          error: 'Error al acceder al sitio',
          details: urlError.message || 'No se pudo conectar con el sitio WordPress'
        });
      }
      
      // Intenta hacer una petición a la API de WooCommerce para verificar credenciales
      // Asegúrate de que la URL termine sin "/" para evitar problemas
      const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
      const endpoint = `${baseUrl}/wp-json/wc/v3/products?per_page=1`;
      
      console.log('Verificando API WooCommerce:', endpoint);
      
      const headers: { [key: string]: string } = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      
      // Usar Basic Auth con las claves proporcionadas
      const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
      headers.Authorization = `Basic ${auth}`;
      
      const response = await fetch(endpoint, { 
        method: 'GET',
        headers
      });
      
      // Obtenemos primero el texto completo de la respuesta para mejor diagnóstico
      let responseText;
      let responseData;
      
      try {
        responseText = await response.text();
        
        // Si contiene marcado HTML, es probable que sea una página de error o login
        if (responseText.includes('<!DOCTYPE') || responseText.includes('<html')) {
          console.error('Respuesta HTML inesperada de la API de WooCommerce');
          return res.status(400).json({ 
            error: 'La respuesta del servidor no es un JSON válido', 
            details: 'La API de WooCommerce está devolviendo HTML en lugar de JSON. Posibles causas:\n\n' +
                     '1. La URL no es correcta o no apunta a una instalación de WooCommerce\n' +
                     '2. Las credenciales API son inválidas\n' +
                     '3. La API REST de WooCommerce no está habilitada\n' +
                     '4. Hay algún plugin de seguridad o firewall bloqueando el acceso'
          });
        }
        
        // Intentamos parsear como JSON si la respuesta no es HTML
        try {
          responseData = JSON.parse(responseText);
        } catch (jsonError) {
          // Si no es HTML ni JSON válido, es otro tipo de error
          return res.status(400).json({ 
            error: 'La respuesta no tiene un formato válido', 
            details: 'La API devolvió una respuesta que no es JSON válido ni HTML. Comprueba la URL y las credenciales.'
          });
        }
      } catch (error) {
        console.error('Error al leer respuesta:', error);
        return res.status(500).json({ 
          error: 'Error al procesar la respuesta', 
          details: 'No se pudo leer la respuesta del servidor WooCommerce'
        });
      }
      
      // Si la respuesta no fue exitosa pero es JSON válido
      if (!response.ok && responseData) {
        console.error('Error de conexión WooCommerce:', responseData);
        const errorDetails = responseData.message || responseData.error || 'Credenciales inválidas o acceso denegado';
        
        return res.status(400).json({ 
          error: 'Error al conectar con WooCommerce', 
          details: errorDetails
        });
      }
      
      // Obtener información de la tienda y estadísticas básicas
      const storeInfo: {
        version?: string;
        productsCount?: number;
        ordersCount?: number;
      } = {};
      
      // 1. Obtenemos info del sistema
      try {
        const systemInfoResponse = await fetch(`${baseUrl}/wp-json/wc/v3/system_status`, { 
          method: 'GET', 
          headers 
        });
        
        if (systemInfoResponse.ok) {
          const systemInfo = await systemInfoResponse.json() as Record<string, any>;
          storeInfo.version = systemInfo.environment?.version || '';
        }
      } catch (error) {
        console.warn('No se pudo obtener la información del sistema:', error);
      }
      
      // 2. Contamos productos
      try {
        const productsCountResponse = await fetch(`${baseUrl}/wp-json/wc/v3/products/count`, { 
          method: 'GET', 
          headers 
        });
        
        if (productsCountResponse.ok) {
          const countData = await productsCountResponse.json() as Record<string, any>;
          storeInfo.productsCount = countData.count || 0;
        }
      } catch (error) {
        console.warn('No se pudo obtener el conteo de productos:', error);
      }
      
      // 3. Contamos pedidos
      try {
        const ordersCountResponse = await fetch(`${baseUrl}/wp-json/wc/v3/orders/count`, { 
          method: 'GET', 
          headers 
        });
        
        if (ordersCountResponse.ok) {
          const countData = await ordersCountResponse.json() as Record<string, any>;
          storeInfo.ordersCount = countData.count || 0;
        }
      } catch (error) {
        console.warn('No se pudo obtener el conteo de pedidos:', error);
      }
      
      // Intentamos obtener el nombre de la tienda WooCommerce si es posible
      let storeDisplayName = storeName || "";
      try {
        const storeInfoResponse = await fetch(`${baseUrl}/wp-json/wc/v3/`, { 
          method: 'GET', 
          headers 
        });
        
        if (storeInfoResponse.ok) {
          const storeData = await storeInfoResponse.json() as Record<string, any>;
          if (!storeDisplayName && storeData.store && storeData.store.name) {
            storeDisplayName = storeData.store.name;
          }
        }
      } catch (error) {
        console.warn('No se pudo obtener información básica de la tienda:', error);
      }
      
      // Guardamos la configuración con la información recopilada
      const config = {
        url,
        consumerKey,
        consumerSecret,
        storeName: storeDisplayName || "Tienda WooCommerce",
        enabled: true,
        storeInfo
      };
      
      // Guardar la información actualizada
      await WooConfig.saveWooCommerceConfig(config);
      
      // Conexión exitosa
      res.json({ 
        success: true, 
        message: 'Conexión exitosa con WooCommerce',
        store: {
          name: storeDisplayName || "Tienda WooCommerce",
          url: url,
          version: storeInfo.version || "",
          productsCount: storeInfo.productsCount || 0,
          ordersCount: storeInfo.ordersCount || 0
        },
        storeInfo
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