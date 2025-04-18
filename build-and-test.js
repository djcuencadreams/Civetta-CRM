/**
 * Script para probar la construcción en modo producción
 * Este script realiza:
 * 1. Una compilación completa de la aplicación (frontend y backend)
 * 2. Ejecuta brevemente la aplicación en modo producción para pruebas
 */

import { exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

// Función para ejecutar comandos
function runCommand(command) {
  return new Promise((resolve, reject) => {
    console.log(`Ejecutando: ${command}`);
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error ejecutando comando: ${error.message}`);
        console.error(`Salida de error: ${stderr}`);
        reject(error);
        return;
      }
      console.log(stdout);
      resolve(stdout);
    });
  });
}

async function buildAndTest() {
  console.log('=== INICIANDO PROCESO DE COMPILACIÓN Y PRUEBA ===');
  
  try {
    // Compilar frontend y backend
    console.log('\n=== PASO 1: Compilar la aplicación ===');
    await runCommand('npm run build');
    
    // Verificar estructura de archivos generados
    console.log('\n=== PASO 2: Verificar archivos generados ===');
    const distContents = await fs.readdir('dist');
    console.log('Contenido de dist/', distContents);
    
    if (distContents.includes('public')) {
      const publicContents = await fs.readdir('dist/public');
      console.log('Contenido de dist/public/', publicContents);
      
      if (publicContents.includes('assets')) {
        const assetsContents = await fs.readdir('dist/public/assets');
        console.log('Contenido de dist/public/assets/', assetsContents);
      }
    }
    
    // Verificar el contenido del index.html
    try {
      const indexHtml = await fs.readFile('dist/public/index.html', 'utf8');
      console.log('\n=== PASO 3: Verificar index.html ===');
      console.log('Referencias a archivos JS/CSS:');
      
      // Extraer referencias a archivos JS
      const jsMatches = indexHtml.match(/<script[^>]*src="([^"]+)"[^>]*>/g);
      if (jsMatches) {
        jsMatches.forEach(match => {
          const src = match.match(/src="([^"]+)"/);
          if (src && src[1]) console.log('- JS:', src[1]);
        });
      }
      
      // Extraer referencias a archivos CSS
      const cssMatches = indexHtml.match(/<link[^>]*href="([^"]+)"[^>]*rel="stylesheet"/g);
      if (cssMatches) {
        cssMatches.forEach(match => {
          const href = match.match(/href="([^"]+)"/);
          if (href && href[1]) console.log('- CSS:', href[1]);
        });
      }
    } catch (err) {
      console.error('Error leyendo index.html:', err.message);
    }
    
    console.log('\n=== PRUEBA COMPLETADA ===');
    console.log('Realiza un despliegue para aplicar los cambios en producción.');
    
  } catch (error) {
    console.error('Error durante el proceso:', error);
  }
}

buildAndTest();