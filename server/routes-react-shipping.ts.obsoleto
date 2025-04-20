// server/routes-react-shipping.ts
import express, { Request, Response } from "express";
import path from "path";

/**
 * Registra rutas específicas para el formulario de envío en React
 * Esta implementación está optimizada para servir SIEMPRE la aplicación React
 * y no los antiguos formularios HTML estáticos.
 * 
 * IMPORTANTE: Estas rutas tienen prioridad absoluta sobre cualquier otra ruta
 * para asegurar que solo se sirva la versión React del formulario
 */
export function registerReactShippingRoutes(app: express.Express): void {
  console.log("🚨 Registrando rutas EXCLUSIVAS para formulario de envío en React...");
  
  // Lista de todas las rutas que servirán el formulario React
  const shippingRoutes = [
    '/shipping-form',
    '/shipping',
    '/etiqueta',
    '/etiqueta-de-envio',
    '/embed/shipping-form',
    '/embed/shipping-form-static'
  ];
  
  // Función para servir la aplicación React con cabeceras CORS
  const serveReactApp = (req: Request, res: Response): void => {
    try {
      // Configurar cabeceras CORS para permitir el acceso desde cualquier origen
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
      
      // Si es una solicitud OPTIONS, respondemos OK para preflights CORS
      if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
      }
      
      // Usar ruta absoluta explícita para asegurar que el archivo se pueda encontrar
      const indexHtmlPath = '/home/runner/workspace/client/dist/index.html';
      console.log(`✅ [REACT] Sirviendo app React para: ${req.path} (${indexHtmlPath})`);
      res.sendFile(indexHtmlPath);
    } catch (error) {
      console.error('❌ [ERROR] Error al servir React App:', error);
      res.status(500).send('Error al cargar la aplicación React.');
    }
  };

  // Registrar cada ruta para GET y OPTIONS
  shippingRoutes.forEach(route => {
    console.log(`📝 Registrando ruta EXCLUSIVA para React: ${route}`);
    
    // Usar .all() para capturar cualquier método HTTP en estas rutas
    app.all(route, serveReactApp);
    
    // También registramos explícitamente OPTIONS para CORS
    app.options(route, serveReactApp);
  });
  
  console.log("✅ Rutas para formulario React registradas exitosamente");
}