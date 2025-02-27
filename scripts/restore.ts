#!/usr/bin/env tsx

/**
 * Database restore script
 * 
 * Run this script to restore a database from a backup file:
 * $ npx tsx scripts/restore.ts ./backups/backup-file-name.sql
 */

import { restoreDatabase } from "../db/backup";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runRestore() {
  const args = process.argv.slice(2);

  if (args.length !== 1) {
    console.error("❌ Error: Please provide the path to the backup file");
    console.error("Usage: npx tsx scripts/restore.ts ./backups/backup-file.sql");
    process.exit(1);
  }

  const backupPath = path.resolve(args[0]);

  if (!fs.existsSync(backupPath)) {
    console.error(`❌ Error: Backup file not found: ${backupPath}`);
    process.exit(1);
  }

  console.log("⚠️ WARNING: This will overwrite the current database");
  console.log(`Restoring from: ${backupPath}`);
  console.log("Press Ctrl+C to cancel within the next 5 seconds...");

  // Give the user 5 seconds to cancel if needed
  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log("Starting database restore...");

  try {
    await restoreDatabase(backupPath);
    console.log(`✅ Database restored successfully from ${backupPath}`);
  } catch (error) {
    console.error("❌ Restore failed:", error);
    process.exit(1);
  }
}

runRestore();