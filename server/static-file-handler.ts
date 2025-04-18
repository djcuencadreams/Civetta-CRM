import express, { Express, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { log } from './vite';

/**
 * Maneja los encabezados de tipo de contenido para archivos estáticos
 * @param filePath Ruta del archivo
 * @returns Content-Type apropiado
 */
function getContentTypeByExt(filePath: string): string {
  if (filePath.endsWith('.js')) {
    return 'application/javascript; charset=utf-8';
  } else if (filePath.endsWith('.css')) {
    return 'text/css; charset=utf-8';
  } else if (filePath.endsWith('.html')) {
    return 'text/html; charset=utf-8';
  } else if (filePath.endsWith('.svg')) {
    return 'image/svg+xml';
  } else if (filePath.endsWith('.png')) {
    return 'image/png';
  } else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
    return 'image/jpeg';
  } else if (filePath.endsWith('.gif')) {
    return 'image/gif';
  } else if (filePath.endsWith('.json')) {
    return 'application/json; charset=utf-8';
  } else if (filePath.endsWith('.woff2')) {
    return 'font/woff2';
  } else if (filePath.endsWith('.woff')) {
    return 'font/woff';
  } else if (filePath.endsWith('.ttf')) {
    return 'font/ttf';
  } else if (filePath.endsWith('.eot')) {
    return 'application/vnd.ms-fontobject';
  } else if (filePath.endsWith('.otf')) {
    return 'font/otf';
  } else if (filePath.endsWith('.ico')) {
    return 'image/x-icon';
  } else if (filePath.endsWith('.pdf')) {
    return 'application/pdf';
  } else if (filePath.endsWith('.xml')) {
    return 'application/xml';
  } else if (filePath.endsWith('.txt')) {
    return 'text/plain; charset=utf-8';
  }
  
  return 'application/octet-stream';
}

/**
 * Configura el manejo de archivos estáticos para el modo de producción
 * @param app Aplicación Express
 */
export function setupStaticFileHandling(app: Express): void {
  // Rutas estáticas para producción
  const distPath = path.resolve(process.cwd(), 'dist/public');
  log(`Configurando archivos estáticos desde: ${distPath}`);
  
  try {
    // Verificar que el directorio existe
    if (!fs.existsSync(distPath)) {
      throw new Error(`El directorio de distribución no existe: ${distPath}`);
    }
    
    // Verificar que index.html existe
    const indexPath = path.join(distPath, 'index.html');
    if (!fs.existsSync(indexPath)) {
      throw new Error(`No se encontró index.html en: ${indexPath}`);
    }
    
    // Verificar archivos de assets
    const assetsPath = path.join(distPath, 'assets');
    if (fs.existsSync(assetsPath)) {
      const assets = fs.readdirSync(assetsPath);
      log(`Archivos en assets: ${assets.join(', ')}`);
    } else {
      log(`Advertencia: No se encontró la carpeta de assets en: ${assetsPath}`);
    }
    
    // PASO 1: Ruta específica para archivos JavaScript y CSS con manejo manual de tipo MIME
    app.get('/assets/:filename', (req: Request, res: Response) => {
      const filename = req.params.filename;
      const filePath = path.join(distPath, 'assets', filename);
      
      if (!fs.existsSync(filePath)) {
        log(`Asset no encontrado: ${filePath}`);
        return res.status(404).send('Archivo no encontrado');
      }
      
      // Determinar el tipo MIME correcto
      const contentType = getContentTypeByExt(filePath);
      
      // Configurar encabezados manualmente
      res.setHeader('Content-Type', contentType);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 día
      
      log(`Sirviendo asset específico: ${filename} con Content-Type: ${contentType}`);
      
      // Enviar el archivo
      res.sendFile(filePath);
    });
    
    // PASO 2: Servir archivos estáticos con middleware express.static
    app.use(express.static(distPath, {
      index: false,
      maxAge: '1d',
      setHeaders: (res, filePath) => {
        const contentType = getContentTypeByExt(filePath);
        res.setHeader('Content-Type', contentType);
        if (filePath.endsWith('.js')) {
          res.setHeader('X-Content-Type-Options', 'nosniff');
        }
        
        log(`Middleware estático sirviendo: ${path.basename(filePath)} (${contentType})`);
      }
    }));
    
    // PASO 3: Soporte para React Router u otras rutas de SPA
    app.use("*", (_req: Request, res: Response) => {
      log(`Fallback a index.html para SPA`);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.sendFile(path.resolve(distPath, "index.html"));
    });
    
    log('✅ Configuración de archivos estáticos completada con éxito');
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`❌ Error configurando archivos estáticos: ${errorMessage}`);
    
    // Configurar respuesta de error para cualquier ruta
    app.get('*', (_req: Request, res: Response) => {
      res.status(500).send(`
        <html>
          <head><title>Error de Configuración</title></head>
          <body>
            <h1>Error en la configuración de archivos estáticos</h1>
            <p>${errorMessage}</p>
            <p>Por favor, asegúrese de compilar la aplicación antes de ejecutarla en modo producción.</p>
          </body>
        </html>
      `);
    });
  }
}