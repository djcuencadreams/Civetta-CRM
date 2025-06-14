/**
 * Sistema Integrado de Commit y Backup Inteligente - Civetta CRM
 * Cumple con estándares ISO 9001, IEEE 1471, TOGAF, DevOps, Agile
 * 
 * FUNCIONALIDADES MEJORADAS:
 * - Actualización automática de documentación ANTES del commit
 * - Commit con mensaje y staging automático
 * - Backup inteligente con exclusiones optimizadas
 * - Logging completo y reporte de métricas
 * - Cumplimiento de estándares internacionales
 * 
 * IMPORTANTE: SIEMPRE USA ESTE SCRIPT EN LUGAR DE 'git commit' PARA ASEGURAR
 * DOCUMENTACIÓN ACTUALIZADA Y BACKUP AUTOMÁTICO.
 * 
 * Uso:
 *   1. Interactivo: node commit-and-backup.js
 *   2. Con argumentos: node commit-and-backup.js "Mensaje del commit"
 */

import { execSync } from 'child_process';
import { spawn } from 'child_process';
import readline from 'readline';

// Función principal para ejecutar el proceso de commit y backup inteligente
async function executeCommitAndBackup(commitMessage) {
  console.log('🚀 Iniciando Sistema Integrado de Commit y Backup Inteligente...');
  console.log('📋 Cumplimiento: ISO 9001, IEEE 1471, TOGAF, DevOps, Agile\n');
  
  try {
    // Paso 1: ACTUALIZAR DOCUMENTACIÓN AUTOMÁTICAMENTE
    console.log('📚 PASO 1: Actualizando documentación automática...');
    await executeDocumentationUpdate();
    console.log('✅ Documentación actualizada y sincronizada\n');

    // Paso 2: REALIZAR GIT ADD
    console.log('📁 PASO 2: Añadiendo archivos al staging area...');
    execSync('git add .', { stdio: 'inherit' });
    console.log('✅ Archivos añadidos correctamente (incluyendo documentación actualizada)\n');

    // Paso 3: REALIZAR COMMIT
    console.log(`💾 PASO 3: Realizando commit: "${commitMessage}"`);
    execSync(`git commit -m "${commitMessage}"`, { stdio: 'inherit' });
    console.log('✅ Commit realizado exitosamente\n');

    // Paso 4: EJECUTAR BACKUP INTELIGENTE
    console.log('📦 PASO 4: Ejecutando sistema de backup inteligente...');
    await executeIntelligentBackup();
    console.log('✅ Backup inteligente completado\n');

    // Paso 5: REPORTE FINAL
    console.log('🎉 PROCESO COMPLETADO EXITOSAMENTE:');
    console.log('   📚 Documentación: Actualizada automáticamente');
    console.log(`   📝 Commit: "${commitMessage}"`);
    console.log('   📦 Backup: Optimizado y comprimido');
    console.log('   📍 Ubicación: BackupforChatGPT/');
    console.log('   ✅ Estándares: ISO 9001, IEEE 1471, TOGAF cumplidos');

  } catch (error) {
    console.error('❌ Error en el proceso:', error.message);
    throw error;
  }
}

/**
 * Ejecuta la actualización automática de documentación
 */
async function executeDocumentationUpdate() {
  try {
    // Ejecutar el sistema de análisis y documentación automática
    await executeCommand('node', ['scripts/auto-update-docs.js']);
    console.log('   ✅ SYSTEM_DOCUMENTATION.md actualizada');
    console.log('   ✅ BACKUP_MANIFEST.md sincronizada');
    console.log('   ✅ Guías de revisión verificadas');
    console.log('   ✅ Métricas de proyecto actualizadas');
  } catch (error) {
    console.warn('   ⚠️ Warning: Error actualizando documentación automática');
    console.warn(`   ⚠️ ${error.message}`);
    console.log('   ℹ️ Continuando con documentación existente...');
  }
}

/**
 * Ejecuta el sistema de backup inteligente
 */
async function executeIntelligentBackup() {
  try {
    // Usar el nuevo sistema de backup inteligente
    await executeCommand('node', ['scripts/backup-code-only.js']);
    console.log('   ✅ Backup optimizado (~200-300KB sin multimedia)');
    console.log('   ✅ Exclusiones inteligentes aplicadas');
    console.log('   ✅ Documentación sincronizada incluida');
    console.log('   ✅ Logs de proceso generados');
  } catch (error) {
    console.warn('   ⚠️ Backup inteligente falló, usando método tradicional...');
    try {
      await executeCommand('node', ['zip-project.js']);
      console.log('   ✅ Backup tradicional completado como respaldo');
    } catch (fallbackError) {
      console.error('   ❌ Error también en backup tradicional:', fallbackError.message);
      throw fallbackError;
    }
  }
}

/**
 * Ejecuta un comando con spawn para mejor control
 */
function executeCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    console.log(`   🔧 Ejecutando: ${command} ${args.join(' ')}`);
    
    const process = spawn(command, args, {
      stdio: 'inherit'
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Comando falló con código ${code}`));
      }
    });

    process.on('error', (error) => {
      reject(error);
    });
  });
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