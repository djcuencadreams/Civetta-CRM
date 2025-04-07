// Test script for database backup functionality
import { backupDatabase } from './db/backup';

async function testBackup() {
  try {
    console.log('Starting backup test...');
    const backupPath = await backupDatabase();
    console.log('Backup completed successfully:', backupPath);
    return backupPath;
  } catch (error) {
    console.error('Backup test failed:', error);
    throw error;
  }
}

// Run test
testBackup()
  .then(path => {
    console.log('Test completed successfully');
    process.exit(0);
  })
  .catch(err => {
    console.error('Test failed with error:', err);
    process.exit(1);
  });