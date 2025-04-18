/**
 * Script para probar el acceso a las rutas de activos estáticos
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const baseUrl = 'http://localhost:3000';

// Función para probar una ruta y devolver el resultado
async function testRoute(route) {
  try {
    const response = await fetch(`${baseUrl}${route}`);
    const contentType = response.headers.get('content-type');
    const status = response.status;
    const size = response.headers.get('content-length') || 'desconocido';
    
    let result = {
      route,
      status,
      contentType,
      size,
      body: null
    };
    
    // Si es una respuesta de texto relativamente pequeña, mostrar el contenido
    if (contentType && contentType.includes('text') && size !== 'desconocido' && parseInt(size) < 500) {
      result.body = await response.text();
    }
    
    return result;
  } catch (error) {
    return {
      route,
      error: error.message
    };
  }
}

async function main() {
  console.log('=== PRUEBA DE RUTAS DE ACTIVOS ESTÁTICOS ===\n');
  
  // Lista de rutas para probar
  const routesToTest = [
    '/',                              // Ruta principal
    '/assets',                        // Directorio de activos
    '/health',                        // Endpoint de salud
    '/index.html',                    // Archivo index.html
  ];
  
  // Añadir rutas de activos específicos si existen
  try {
    if (fs.existsSync('dist/public/assets')) {
      const assets = fs.readdirSync('dist/public/assets');
      assets.forEach(asset => {
        routesToTest.push(`/assets/${asset}`);
      });
    }
  } catch (error) {
    console.error('Error al leer el directorio de activos:', error.message);
  }
  
  // Probar cada ruta
  for (const route of routesToTest) {
    console.log(`Probando ruta: ${route}`);
    const result = await testRoute(route);
    
    if (result.error) {
      console.log(`  ERROR: ${result.error}\n`);
    } else {
      console.log(`  Estado: ${result.status}`);
      console.log(`  Tipo de contenido: ${result.contentType}`);
      console.log(`  Tamaño: ${result.size}`);
      
      if (result.body) {
        console.log(`  Contenido: ${result.body.substring(0, 100)}${result.body.length > 100 ? '...' : ''}\n`);
      } else {
        console.log('');
      }
    }
  }
  
  console.log('=== PRUEBA FINALIZADA ===');
}

main().catch(error => {
  console.error('Error en el script de prueba:', error);
});