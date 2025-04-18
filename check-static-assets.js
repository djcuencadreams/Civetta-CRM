/**
 * Script para diagnosticar y corregir problemas con activos estáticos
 */

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

// Verificar la estructura de la compilación
async function checkBuildStructure() {
  console.log('\n===== VERIFICANDO ESTRUCTURA DE COMPILACIÓN =====');
  
  const distPath = path.resolve('./dist');
  const publicPath = path.resolve('./dist/public');
  const assetsPath = path.resolve('./dist/public/assets');
  
  // Verificar si los directorios existen
  const distExists = fs.existsSync(distPath);
  const publicExists = distExists && fs.existsSync(publicPath);
  const assetsExists = publicExists && fs.existsSync(assetsPath);
  
  console.log(`dist/ existe: ${distExists ? 'SÍ' : 'NO'}`);
  console.log(`dist/public/ existe: ${publicExists ? 'SÍ' : 'NO'}`);
  console.log(`dist/public/assets/ existe: ${assetsExists ? 'SÍ' : 'NO'}`);
  
  // Listar contenido
  if (distExists) {
    console.log('\nContenido de dist/');
    console.log(fs.readdirSync(distPath).join(', '));
  }
  
  if (publicExists) {
    console.log('\nContenido de dist/public/');
    console.log(fs.readdirSync(publicPath).join(', '));
  }
  
  if (assetsExists) {
    console.log('\nContenido de dist/public/assets/');
    console.log(fs.readdirSync(assetsPath).join(', '));
  }
  
  // Verificar index.html
  if (publicExists && fs.existsSync(path.join(publicPath, 'index.html'))) {
    const indexContent = fs.readFileSync(path.join(publicPath, 'index.html'), 'utf8');
    console.log('\nReferencias en index.html:');
    
    // Buscar scripts
    const scriptMatches = Array.from(indexContent.matchAll(/<script[^>]*src="([^"]+)"[^>]*>/g));
    if (scriptMatches.length > 0) {
      console.log('Scripts:');
      scriptMatches.forEach(match => {
        const src = match[1];
        console.log(`  - ${src}`);
      });
    }
    
    // Buscar estilos
    const styleMatches = Array.from(indexContent.matchAll(/<link[^>]*href="([^"]+)"[^>]*rel="stylesheet"/g));
    if (styleMatches.length > 0) {
      console.log('Estilos:');
      styleMatches.forEach(match => {
        const href = match[1];
        console.log(`  - ${href}`);
      });
    }
  }
}

// Verificar rutas de archivos estáticos en el servidor
async function fixStaticFileHandling() {
  console.log('\n===== CORRIGIENDO MANEJO DE ARCHIVOS ESTÁTICOS =====');
  
  // Asegurar que index.ts está usando correctamente express.static
  const serverIndexPath = path.resolve('./server/index.ts');
  if (fs.existsSync(serverIndexPath)) {
    let indexContent = fs.readFileSync(serverIndexPath, 'utf8');
    
    // Verificar si ya tiene nuestra corrección mejorada
    if (indexContent.includes('catch (error) {') && 
        indexContent.includes('log(`Error configurando archivos estáticos:')) {
      console.log('✅ Correcciones ya aplicadas en server/index.ts');
    } else {
      console.log('❌ Se necesitan aplicar correcciones en server/index.ts');
    }
  }
}

// Verificar configuración de Vite
async function checkViteConfig() {
  console.log('\n===== VERIFICANDO CONFIGURACIÓN DE VITE =====');
  
  const viteConfigPath = path.resolve('./vite.config.ts');
  if (fs.existsSync(viteConfigPath)) {
    const configContent = fs.readFileSync(viteConfigPath, 'utf8');
    
    // Buscar configuración de build
    const buildConfig = configContent.match(/build:\s*{([^}]*)}/s);
    if (buildConfig) {
      console.log('Configuración de build encontrada:');
      console.log(buildConfig[0]);
    } else {
      console.log('❌ No se encontró configuración de build en vite.config.ts');
    }
    
    // Buscar resoluciones de alias
    const aliasConfig = configContent.match(/alias:\s*{([^}]*)}/s);
    if (aliasConfig) {
      console.log('\nConfiguraciones de alias:');
      console.log(aliasConfig[0]);
    }
  } else {
    console.log('❌ No se encontró vite.config.ts');
  }
}

// Función principal
async function main() {
  console.log('===== DIAGNÓSTICO DE ACTIVOS ESTÁTICOS =====');
  
  try {
    await checkBuildStructure();
    await fixStaticFileHandling();
    await checkViteConfig();
    
    console.log('\n===== RECOMENDACIONES =====');
    console.log('1. Ejecuta "npm run build" para regenerar la compilación');
    console.log('2. Asegúrate de que las rutas en index.html sean correctas');
    console.log('3. Verifica que express.static esté configurado adecuadamente');
    console.log('4. Considera usar rutas absolutas en lugar de relativas para los activos estáticos');
    
  } catch (error) {
    console.error('Error durante el diagnóstico:', error);
  }
}

main();