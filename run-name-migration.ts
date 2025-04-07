/**
 * Script para ejecutar la migración del campo 'name' a nullable
 * Esto es el primer paso para eliminar la redundancia entre los campos 'name' y 'firstName'/'lastName'
 */

import { runMigrations } from './migrations/run-migrations.ts';

async function main() {
  console.log("🔄 Iniciando migración del campo 'name'...");
  
  try {
    await runMigrations();
    console.log("✅ Migración completada exitosamente");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error durante la migración:", error);
    process.exit(1);
  }
}

main();