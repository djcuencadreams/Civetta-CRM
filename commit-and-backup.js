/**
 * Script para realizar un commit y luego ejecutar el script de backup
 * Este enfoque garantiza que SIEMPRE se generará un backup después de cada commit,
 * sin depender de git hooks que pueden no funcionar correctamente en Replit.
 * 
 * IMPORTANTE: SIEMPRE USA ESTE SCRIPT EN LUGAR DE 'git commit' PARA ASEGURAR
 * QUE SE GENERE UN BACKUP AUTOMÁTICAMENTE.
 * 
 * Uso:
 *   1. Interactivo: node commit-and-backup.js
 *   2. Con argumentos: node commit-and-backup.js "Mensaje del commit"
 */

import { execSync } from 'child_process';
import { spawn } from 'child_process';
import readline from 'readline';

// Función principal para ejecutar el proceso de commit y backup
async function executeCommitAndBackup(commitMessage) {
  try {
    // Ejecutar git add .
    console.log('📌 Añadiendo archivos modificados...');
    execSync('git add .', { stdio: 'inherit' });

    // Ejecutar git commit con el mensaje proporcionado
    console.log('💾 Realizando commit...');
    execSync(`git commit -m "${commitMessage}"`, { stdio: 'inherit' });

    // Ejecutar el script de backup
    console.log('🔄 Iniciando script de backup...');
    
    // Usar spawn para mostrar la salida en tiempo real
    return new Promise((resolve, reject) => {
      const backupProcess = spawn('node', ['--experimental-modules', 'zip-project.js'], {
        stdio: 'inherit'
      });

      backupProcess.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Proceso completado con éxito');
          resolve();
        } else {
          console.error(`❌ El proceso de backup falló con código ${code}`);
          reject(new Error(`El proceso de backup falló con código ${code}`));
        }
      });
    });
  } catch (error) {
    console.error('❌ Error en el proceso:', error.message);
    throw error;
  }
}

// Verificar si se proporcionó un mensaje de commit como argumento
const args = process.argv.slice(2);
if (args.length > 0) {
  // Obtener el mensaje de commit desde los argumentos
  const commitMessage = args.join(' ');
  if (!commitMessage.trim()) {
    console.error('❌ El mensaje de commit no puede estar vacío');
    process.exit(1);
  }
  
  // Ejecutar el proceso con el mensaje proporcionado
  executeCommitAndBackup(commitMessage)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
} else {
  // Modo interactivo: crear una interfaz de línea de comandos
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  // Preguntar al usuario por el mensaje de commit
  rl.question('🔍 Ingrese el mensaje de commit: ', async (commitMessage) => {
    if (!commitMessage.trim()) {
      console.error('❌ El mensaje de commit no puede estar vacío');
      rl.close();
      process.exit(1);
      return;
    }

    try {
      await executeCommitAndBackup(commitMessage);
      rl.close();
      process.exit(0);
    } catch (error) {
      rl.close();
      process.exit(1);
    }
  });
}