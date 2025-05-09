import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db, pool } from './index';
import * as schema from './schema';

// Create __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure backup directory exists
const backupDir = path.join(__dirname, '../backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// Tables to backup in the correct order (respecting foreign key dependencies)
// Add tables in the order they should be restored (parents before children)
const TABLES_TO_BACKUP = ['customers', 'leads', 'sales']; // Temporarily removed 'webhooks' until table is created

/**
 * Creates a database backup by exporting all tables to JSON files
 * @returns {Promise<string>} Backup directory path
 */
export async function backupDatabase(): Promise<string> {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDirPath = path.join(backupDir, `backup-${timestamp}`);
    
    // Track record counts for metadata
    const recordCounts: Record<string, number> = {};

    // Create backup directory with timestamp
    fs.mkdirSync(backupDirPath, { recursive: true });

    // Export each table
    for (const tableName of TABLES_TO_BACKUP) {
      // @ts-ignore - we're using dynamic table access
      const table = schema[tableName];

      if (table) {
        try {
          // Use raw SQL query to avoid array parsing issues
          const query = `SELECT * FROM "${tableName}"`;
          const result = await pool.query(query);
          const records = result.rows;

          // Process records to handle array fields correctly
          const processedRecords = records.map((record: Record<string, any>) => {
            // Create a copy of the record to avoid modifying the original
            const processedRecord: Record<string, any> = { ...record };
            
            // Handle 'tags' field specifically, which is known to be an array
            if (tableName === 'customers' && record.tags) {
              // If tags is a string representation of an array, parse it
              if (typeof record.tags === 'string' && record.tags.startsWith('{') && record.tags.endsWith('}')) {
                try {
                  // Parse PostgreSQL array format {item1,item2} to JS array
                  processedRecord.tags = record.tags.slice(1, -1).split(',').filter((item: string) => item.length > 0);
                } catch (e) {
                  console.warn(`Could not parse tags for record in ${tableName}:`, e);
                  processedRecord.tags = [];
                }
              } else if (!Array.isArray(record.tags)) {
                // If tags is not an array or parseable string, default to empty array
                processedRecord.tags = [];
              }
            }
            
            return processedRecord;
          });

          // Write records to a JSON file
          const filePath = path.join(backupDirPath, `${tableName}.json`);
          fs.writeFileSync(filePath, JSON.stringify(processedRecords, null, 2));
          
          // Save record count for metadata
          recordCounts[tableName] = processedRecords.length;
          
          console.log(`Backed up ${processedRecords.length} records from ${tableName} table`);
        } catch (error) {
          console.error(`Error backing up table ${tableName}:`, error);
          // Continue with next table instead of failing the entire backup
        }
      } else {
        console.warn(`Table ${tableName} not found in schema, skipping`);
      }
    }

    // Create a metadata file with backup info
    const metadataPath = path.join(backupDirPath, 'metadata.json');
    const metadata = {
      timestamp: new Date().toISOString(),
      tables: TABLES_TO_BACKUP,
      recordCounts: recordCounts,
    };

    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    console.log(`Database backup created successfully: ${backupDirPath}`);
    return backupDirPath;
  } catch (error) {
    console.error('Error creating database backup:', error);
    throw error;
  }
}

/**
 * Restores a database backup
 * @param {string} backupDirPath Path to the backup directory
 */
export async function restoreDatabase(backupDirPath: string): Promise<void> {
  try {
    // Check if backup directory exists
    if (!fs.existsSync(backupDirPath)) {
      throw new Error(`Backup directory not found: ${backupDirPath}`);
    }

    // Check metadata file
    const metadataPath = path.join(backupDirPath, 'metadata.json');
    if (!fs.existsSync(metadataPath)) {
      throw new Error(`Metadata file not found in backup directory: ${backupDirPath}`);
    }

    // Get tables from the backup
    let tables = TABLES_TO_BACKUP;
    try {
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      if (metadata.tables && Array.isArray(metadata.tables)) {
        tables = metadata.tables;
      }
    } catch (error) {
      console.warn('Error parsing metadata, using default table order:', error);
    }

    // Process each table file in the backup
    for (const tableName of tables) {
      const filePath = path.join(backupDirPath, `${tableName}.json`);

      if (fs.existsSync(filePath)) {
        try {
          // Read the table data from the backup file
          const records = JSON.parse(fs.readFileSync(filePath, 'utf8'));

          if (!Array.isArray(records)) {
            console.warn(`Backup file for ${tableName} doesn't contain an array, skipping`);
            continue;
          }

          if (records.length === 0) {
            console.log(`No records to restore for ${tableName}`);
            continue;
          }

          // @ts-ignore - we're using dynamic table access
          const table = schema[tableName];

          if (!table) {
            console.warn(`Table ${tableName} not found in schema, skipping`);
            continue;
          }

          console.log(`Restoring ${records.length} records to ${tableName}...`);

          // Insert the records
          // Note: This is a simple approach that doesn't handle conflicts
          // In a production environment, you'd want to handle conflicts and primary keys
          for (const record of records) {
            try {
              // Process array fields for restoring
              const processedRecord: Record<string, any> = { ...record };
              
              // Handle tags specifically if this is a customers table
              if (tableName === 'customers' && Array.isArray(processedRecord.tags)) {
                // Ensure tags is properly formatted for postgres
                // No need to convert as drizzle handles conversion automatically
              }
              
              await db.insert(table).values(processedRecord).onConflictDoNothing();
            } catch (err) {
              console.error(`Error inserting record into ${tableName}:`, err);
            }
          }

          console.log(`Restored ${tableName} table successfully`);
        } catch (error) {
          console.error(`Error restoring ${tableName}:`, error);
        }
      } else {
        console.warn(`Backup file for ${tableName} not found, skipping`);
      }
    }

    console.log(`Database restored successfully from: ${backupDirPath}`);
  } catch (error) {
    console.error('Error restoring database:', error);
    throw error;
  }
}

// Function to run scheduled backups
export async function scheduleBackups(intervalHours = 24): Promise<void> {
  console.log(`Scheduling database backups every ${intervalHours} hours`);

  // Perform initial backup
  try {
    await backupDatabase();
    console.log("Initial backup completed successfully");
  } catch (error) {
    console.error("Initial backup failed:", error);
  }

  // Schedule recurring backups
  setInterval(async () => {
    try {
      await backupDatabase();
      console.log("Scheduled backup completed successfully");

      // Clean up old backups (keep only the 10 most recent)
      cleanupOldBackups(10);
    } catch (error) {
      console.error('Scheduled backup failed:', error);
    }
  }, intervalHours * 60 * 60 * 1000);
}

/**
 * Cleans up old backups, keeping only the most recent ones
 * @param {number} keepCount Number of recent backups to keep
 */
function cleanupOldBackups(keepCount: number): void {
  try {
    // Get all backup directories
    const dirs = fs.readdirSync(backupDir)
      .filter(name => name.startsWith('backup-'))
      .map(name => ({
        name,
        path: path.join(backupDir, name),
        time: fs.statSync(path.join(backupDir, name)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time); // Sort newest to oldest

    // Remove old backups
    if (dirs.length > keepCount) {
      const toRemove = dirs.slice(keepCount);
      for (const dir of toRemove) {
        fs.rmSync(dir.path, { recursive: true, force: true });
        console.log(`Removed old backup: ${dir.name}`);
      }
    }
  } catch (error) {
    console.error('Error cleaning up old backups:', error);
  }
}

// When this file is executed directly, run a backup
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Executing backup script directly...');
  backupDatabase()
    .then(backupPath => {
      console.log(`Backup completed successfully: ${backupPath}`);
      process.exit(0);
    })
    .catch(error => {
      console.error('Backup failed:', error);
      process.exit(1);
    });
}