/**
 * Civetta-CRM Automatic Backup Script
 * 
 * This script creates a ZIP backup of the project after each git commit.
 * It generates a backup file with format: backup_YYYY-MM-DD_HH-MM-SS_COMMITHASH.zip
 * 
 * The script:
 * 1. Creates a BackupforChatGPT/ folder if it doesn't exist
 * 2. Deletes any previous backup ZIP files
 * 3. Generates a new ZIP with the current project files
 * 4. Adds commit information to the ZIP file
 * 
 * Excluded from backup:
 * - .git/ directory
 * - node_modules/ directory
 * - BackupforChatGPT/ directory
 * - attached_assets/ directory
 * - All hidden folders (starting with .)
 * - Files with extensions: .png, .jpg, .jpeg, .csv, .xlsx, .pdf
 * - Files starting with: screenshot., test_, Pasted-, Screenshot
 */

import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Backup directory
const BACKUP_DIR = 'BackupforChatGPT';

// Function to get git commit information
function getGitCommitInfo() {
  try {
    const hash = execSync('git rev-parse HEAD').toString().trim();
    const shortHash = hash.substring(0, 7);
    const message = execSync('git log -1 --pretty=%B').toString().trim();
    const authorName = execSync('git log -1 --pretty=%an').toString().trim();
    const authorEmail = execSync('git log -1 --pretty=%ae').toString().trim();
    const date = execSync('git log -1 --pretty=%cd --date=iso').toString().trim();
    
    return {
      hash,
      shortHash,
      message,
      author: `${authorName} <${authorEmail}>`,
      date
    };
  } catch (error) {
    console.error('Error obtaining git commit information:', error.message);
    process.exit(1);
  }
}

// Function to create backup directory if it doesn't exist
function ensureBackupDirectory() {
  if (!fs.existsSync(BACKUP_DIR)) {
    console.log(`Creating backup directory: ${BACKUP_DIR}/`);
    fs.mkdirSync(BACKUP_DIR);
  }
}

// Function to delete previous backup ZIP files
function deleteOldBackups() {
  const files = fs.readdirSync(BACKUP_DIR);
  let deletedCount = 0;
  
  for (const file of files) {
    if (file.endsWith('.zip')) {
      fs.unlinkSync(path.join(BACKUP_DIR, file));
      deletedCount++;
    }
  }
  
  if (deletedCount > 0) {
    console.log(`Deleted ${deletedCount} previous backup file(s)`);
  }
}

// Function to create a commit-info.txt file
function createCommitInfoFile(commitInfo) {
  const content = `CIVETTA-CRM PROJECT BACKUP

COMMIT INFORMATION
-----------------
Commit Hash: ${commitInfo.hash}
Date: ${commitInfo.date}
Author: ${commitInfo.author}

COMMIT MESSAGE
-----------------
${commitInfo.message}

Backup generated: ${new Date().toISOString()}
`;

  const tempFilePath = path.join(BACKUP_DIR, 'commit-info.txt');
  fs.writeFileSync(tempFilePath, content);
  return tempFilePath;
}

// Function to check if a file/directory should be excluded from the backup
function shouldExclude(filePath) {
  const fileName = path.basename(filePath);
  const extension = path.extname(filePath).toLowerCase();
  
  // Exclude specific directories
  if (
    filePath === '.git' || 
    filePath === 'node_modules' || 
    filePath === BACKUP_DIR ||
    filePath === 'attached_assets'
  ) {
    return true;
  }
  
  // Exclude hidden directories (starting with '.')
  if (fileName.startsWith('.')) {
    return true;
  }
  
  // Exclude specific file extensions
  if (['.png', '.jpg', '.jpeg', '.csv', '.xlsx', '.pdf'].includes(extension)) {
    return true;
  }
  
  // Exclude files with specific prefixes
  if (
    fileName.startsWith('screenshot.') || 
    fileName.startsWith('test_') || 
    fileName.startsWith('Pasted-') || 
    fileName.startsWith('Screenshot')
  ) {
    return true;
  }
  
  return false;
}

// Function to add a directory to the zip archive
function addDirectoryToZip(archive, dirPath, parentPath = '') {
  const items = fs.readdirSync(dirPath);
  
  for (const item of items) {
    const fullPath = path.join(dirPath, item);
    const zipPath = path.join(parentPath, item);
    
    if (shouldExclude(fullPath)) {
      continue;
    }
    
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      // Recursively add subdirectories
      addDirectoryToZip(archive, fullPath, zipPath);
    } else {
      // Add file to the archive
      archive.file(fullPath, { name: zipPath });
    }
  }
}

// Main function to create the backup
async function createProjectBackup() {
  try {
    console.log('Starting project backup...');
    
    // Get git commit information
    const commitInfo = getGitCommitInfo();
    
    // Ensure backup directory exists
    ensureBackupDirectory();
    
    // Delete old backups
    deleteOldBackups();
    
    // Generate backup filename with date and commit hash
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
    const backupFileName = `backup_${dateStr}_${timeStr}_${commitInfo.shortHash}.zip`;
    const backupFilePath = path.join(BACKUP_DIR, backupFileName);
    
    // Create a file stream for the backup file
    const output = fs.createWriteStream(backupFilePath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });
    
    // Listen for archive warnings
    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') {
        console.warn('Warning during archiving:', err);
      } else {
        throw err;
      }
    });
    
    // Listen for archive errors
    archive.on('error', (err) => {
      throw err;
    });
    
    // Pipe archive data to the file
    archive.pipe(output);
    
    // Create and add commit info file
    const commitInfoPath = createCommitInfoFile(commitInfo);
    archive.file(commitInfoPath, { name: 'commit-info.txt' });
    
    // Add project files to the archive
    console.log('Adding project files to backup...');
    addDirectoryToZip(archive, '.');
    
    // Finalize the archive
    await archive.finalize();
    
    // Wait for the output stream to finish
    await new Promise((resolve, reject) => {
      output.on('close', () => {
        // Clean up temporary files
        if (fs.existsSync(commitInfoPath)) {
          fs.unlinkSync(commitInfoPath);
        }
        
        // Log completion message with the format specified
        console.log(`✅ Backup generado: ${BACKUP_DIR}/${backupFileName}`);
        
        resolve();
      });
      
      output.on('error', reject);
    });
    
  } catch (error) {
    console.error('Error creating backup:', error);
    process.exit(1);
  }
}

// Execute the backup
createProjectBackup().catch(console.error);