/**
 * Script para generar un backup manual del proyecto
 * Esta es una interfaz simplificada para zip-project.js
 */

import { spawn } from 'child_process';

console.log('🔄 Iniciando backup manual del proyecto...');

// Usar spawn para mostrar la salida en tiempo real
const backupProcess = spawn('node', ['--experimental-modules', 'zip-project.js'], {
  stdio: 'inherit'
});

backupProcess.on('close', (code) => {
  if (code === 0) {
    console.log('✅ Backup completado con éxito');
  } else {
    console.error(`❌ El proceso de backup falló con código ${code}`);
    process.exit(1);
  }
});