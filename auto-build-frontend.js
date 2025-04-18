/**
 * Script para automatizar la compilación y despliegue del frontend
 * Se ejecutará automáticamente al iniciar la aplicación
 */

import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Obtener la ruta absoluta actual
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('💡 Iniciando la compilación automática del frontend...');

// Función para ejecutar comandos
function executeCommand(command, cwd = __dirname) {
  return new Promise((resolve, reject) => {
    console.log(`Ejecutando: ${command}`);
    exec(command, { cwd }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error al ejecutar comando: ${error.message}`);
        return reject(error);
      }
      if (stderr) {
        console.warn(`stderr: ${stderr}`);
      }
      console.log(`stdout: ${stdout}`);
      resolve(stdout);
    });
  });
}

// Función para copiar archivos
function copyFiles(sourceDir, targetDir) {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const items = fs.readdirSync(sourceDir);
  
  items.forEach(item => {
    const sourcePath = path.join(sourceDir, item);
    const targetPath = path.join(targetDir, item);
    
    const stats = fs.statSync(sourcePath);
    
    if (stats.isDirectory()) {
      copyFiles(sourcePath, targetPath);
    } else {
      fs.copyFileSync(sourcePath, targetPath);
    }
  });
}

async function main() {
  try {
    // 1. Compilar el frontend
    await executeCommand('npm run build', path.join(__dirname, 'client'));
    
    // 2. Copiar archivos compilados a la carpeta public
    const sourceDir = path.join(__dirname, 'dist', 'public');
    const targetDir = path.join(__dirname, 'client', 'public');
    
    console.log(`Copiando archivos de ${sourceDir} a ${targetDir}`);
    copyFiles(sourceDir, targetDir);
    
    console.log('✅ Frontend compilado y desplegado correctamente');
    
  } catch (error) {
    console.error('❌ Error en el proceso de compilación del frontend:', error);
  }
}

// Iniciar el proceso
main();