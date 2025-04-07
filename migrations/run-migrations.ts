/**
 * Migration runner script to apply all pending database migrations
 */

import { makeNameFieldNullable } from './name-field-nullable';

async function runMigrations() {
  console.log("📦 Starting database migrations...");
  
  // Run the name field nullable migration
  const nameFieldResult = await makeNameFieldNullable();
  console.log(`Migration result: ${nameFieldResult.success ? '✅ Success' : '❌ Failed'}`);
  if (!nameFieldResult.success) {
    console.error("Migration error:", nameFieldResult.error);
  }
  
  console.log("📦 Migrations completed");
}

// Auto-run migrations when this file is executed directly
// Using import.meta.url instead of require.main === module for ES modules
if (import.meta.url === import.meta.resolve(process.argv[1])) {
  runMigrations().catch(error => {
    console.error("Migration failed with error:", error);
    process.exit(1);
  });
}

export { runMigrations };