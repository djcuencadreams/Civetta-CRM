/**
 * Script para modificar y verificar el servidor para corregir los tipos MIME
 */

import fs from 'fs';
import path from 'path';

const serverIndexPath = path.resolve('./server/index.ts');

// Leer archivo original
console.log(`Leyendo archivo: ${serverIndexPath}`);
const originalContent = fs.readFileSync(serverIndexPath, 'utf8');

// Versión corregida que garantiza los tipos MIME correctos
let updatedContent = originalContent.replace(
  /setHeaders: \(res, filePath\) => {[\s\S]*?}/,
  `setHeaders: (res, filePath) => {
          // Set proper MIME types with explicit logic
          if (filePath.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
            res.setHeader('X-Content-Type-Options', 'nosniff');
          } else if (filePath.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css; charset=utf-8');
          } else if (filePath.endsWith('.html')) {
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
          } else if (filePath.endsWith('.svg')) {
            res.setHeader('Content-Type', 'image/svg+xml');
          } else if (filePath.endsWith('.png')) {
            res.setHeader('Content-Type', 'image/png');
          } else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
            res.setHeader('Content-Type', 'image/jpeg');
          } else if (filePath.endsWith('.gif')) {
            res.setHeader('Content-Type', 'image/gif');
          } else if (filePath.endsWith('.json')) {
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
          }
          console.log(\`Sirviendo archivo \${path.basename(filePath)} con Content-Type: \${res.getHeader('Content-Type') || 'no-especificado'}\`);
        }`
);

// También asegurémonos de que las rutas de assets se manejen correctamente
updatedContent = updatedContent.replace(
  /app\.get\('\/assets\/\*', \(req, res\) => {[\s\S]*?}\);/,
  `app.get('/assets/*', (req, res) => {
        log(\`Intentando servir asset: \${req.path}\`);
        const assetPath = path.join(distPath, req.path);
        
        // Verificar que el archivo existe
        if (!fs.existsSync(assetPath)) {
          log(\`Advertencia: Asset no encontrado: \${assetPath}\`);
          return res.status(404).send('Archivo no encontrado');
        }
        
        // Determinar el tipo MIME correcto
        let contentType = 'application/octet-stream';
        if (assetPath.endsWith('.js')) {
          contentType = 'application/javascript; charset=utf-8';
        } else if (assetPath.endsWith('.css')) {
          contentType = 'text/css; charset=utf-8';
        }
        
        // Configurar encabezados manualmente
        res.setHeader('Content-Type', contentType);
        res.setHeader('X-Content-Type-Options', 'nosniff');
        
        // Enviar el archivo
        res.sendFile(assetPath);
      });`
);

// Escribir archivo actualizado
console.log(`Escribiendo archivo actualizado`);
fs.writeFileSync(serverIndexPath, updatedContent);

console.log('Cambios aplicados correctamente!');
console.log('Reinicia el servidor para aplicar los cambios.');