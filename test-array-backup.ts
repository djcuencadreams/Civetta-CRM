// Test script for verifying array field handling in database backups
import { db, pool } from './db';
import * as schema from './db/schema';
import { backupDatabase, restoreDatabase } from './db/backup';
import fs from 'fs';
import path from 'path';
import { sql, eq } from 'drizzle-orm';

async function testArrayBackup() {
  console.log('Starting array field backup test...');
  
  // Create a customer with array tags for testing
  const testCustomer = {
    firstName: 'Test',
    lastName: 'ArrayFields',
    email: 'test.array@example.com',
    // For jsonb array fields
    tags: sql`'["test", "array", "backup"]'::jsonb` // Using jsonb because that's the actual type in database
  };

  try {
    // Insert the test customer
    console.log('Creating test customer with array tags...');
    const insertResult = await db.insert(schema.customers)
      .values(testCustomer)
      .returning();
    
    console.log('Created test customer:', insertResult[0]);
    const customerId = insertResult[0].id;
    
    // Create a backup
    console.log('Creating database backup...');
    const backupPath = await backupDatabase();
    console.log('Backup created at:', backupPath);
    
    // Check if the backup file exists
    const customerBackupFile = path.join(backupPath, 'customers.json');
    
    if (!fs.existsSync(customerBackupFile)) {
      throw new Error('Customer backup file not found');
    }
    
    // Read and parse the backup file
    const backupData = JSON.parse(fs.readFileSync(customerBackupFile, 'utf8'));
    
    // Find our test customer in the backup
    const backedUpCustomer = backupData.find((c: any) => c.id === customerId);
    
    if (!backedUpCustomer) {
      throw new Error('Test customer not found in backup');
    }
    
    console.log('Backed up customer:', backedUpCustomer);
    
    // Verify that the tags field is an array
    if (!Array.isArray(backedUpCustomer.tags)) {
      throw new Error('Tags field in backup is not an array');
    }
    
    // Verify array contents
    if (backedUpCustomer.tags.length !== 3 || 
        !backedUpCustomer.tags.includes('test') || 
        !backedUpCustomer.tags.includes('array') || 
        !backedUpCustomer.tags.includes('backup')) {
      throw new Error(`Tags array content mismatch. Expected ['test', 'array', 'backup'], got: ${JSON.stringify(backedUpCustomer.tags)}`);
    }
    
    console.log('Array field backup verification passed');
    
    // Clean up - delete the test customer
    console.log('Cleaning up test data...');
    await db.delete(schema.customers)
      .where(eq(schema.customers.id, customerId));
    
    console.log('Test completed successfully');
    return true;
  } catch (error) {
    console.error('Array field backup test failed:', error);
    throw error;
  }
}

// Run test
testArrayBackup()
  .then(success => {
    console.log('Array field backup test completed successfully');
    process.exit(0);
  })
  .catch(err => {
    console.error('Array field backup test failed with error:', err);
    process.exit(1);
  });