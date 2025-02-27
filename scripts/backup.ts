#!/usr/bin/env tsx

/**
 * Manual database backup script
 * 
 * Run this script to manually create a database backup:
 * $ npx tsx scripts/backup.ts
 */

import { backupDatabase } from "../db/backup";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runBackup() {
  console.log("Starting manual database backup...");

  try {
    const backupPath = await backupDatabase();
    console.log(`✅ Backup completed successfully!`);
    console.log(`Backup saved to: ${backupPath}`);
  } catch (error) {
    console.error("❌ Backup failed:", error);
    process.exit(1);
  }
}

runBackup();