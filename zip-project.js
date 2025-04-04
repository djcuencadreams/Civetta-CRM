
/**
 * Civetta-CRM Extended Backup Script
 * 
 * This script creates a comprehensive ZIP backup of the entire project including:
 * - Source code files (.js, .ts, .py, etc.)
 * - Configuration files
 * - Documentation files
 * - Database backups
 * - Project structure
 * 
 * The backup is created after each git commit with format:
 * backup_YYYY-MM-DD_HH-MM-SS_COMMITHASH.zip
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

// Function to create a project-info.txt file
function createProjectInfoFile(commitInfo) {
  const now = new Date();
  const ecuadorTime = new Date(now.getTime() - 5 * 60 * 60 * 1000);
  
  const content = `CIVETTA-CRM PROJECT BACKUP

PROJECT INFORMATION
-----------------
Project Name: Civetta-CRM
Environment: Replit
Backup Type: Full Project + Data Backup

COMMIT INFORMATION
-----------------
Commit Hash: ${commitInfo.hash}
Date: ${commitInfo.date}
Author: ${commitInfo.author}

COMMIT MESSAGE
-----------------
${commitInfo.message}

BACKUP CONTENTS
-----------------
- Complete source code
- Configuration files
- Documentation
- Database backups
- Project structure
- Automation scripts

Backup generated: ${ecuadorTime.toISOString()} (Ecuador Time)
`;

  const tempFilePath = path.join(BACKUP_DIR, 'project-info.txt');
  fs.writeFileSync(tempFilePath, content);
  return tempFilePath;
}

// Function to check if a file/directory should be excluded from the backup
function shouldExclude(filePath) {
  const fileName = path.basename(filePath);
  
  // Critical directories to exclude
  const excludedDirs = [
    'node_modules',
    '.git',
    BACKUP_DIR,
    'attached_assets',
    'temp_download',
    'temp_excel'
  ];

  // If it's one of the excluded directories
  if (excludedDirs.includes(filePath)) {
    return true;
  }

  // Exclude hidden directories (starting with '.')
  if (fileName.startsWith('.') && fs.statSync(filePath).isDirectory()) {
    return true;
  }

  // Exclude specific file types
  const excludedExtensions = [
    '.jpg', '.jpeg', '.png', '.gif',  // Images
    '.mp4', '.avi', '.mov',           // Videos
    '.mp3', '.wav',                   // Audio
    '.zip', '.rar', '.7z',            // Archives
    '.exe', '.dll',                   // Binaries
    '.log'                            // Log files
  ];

  const extension = path.extname(filePath).toLowerCase();
  if (excludedExtensions.includes(extension)) {
    return true;
  }

  // Exclude temporary and cache files
  const excludedPatterns = [
    'thumbs.db',
    '.ds_store',
    '*.tmp',
    '*.temp',
    '*.cache'
  ];

  if (excludedPatterns.some(pattern => 
    fileName.toLowerCase().includes(pattern.replace('*', '').toLowerCase()))) {
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
    console.log('Starting comprehensive project backup...');
    
    // Get git commit information
    const commitInfo = getGitCommitInfo();
    
    // Ensure backup directory exists
    ensureBackupDirectory();
    
    // Delete old backups
    deleteOldBackups();
    
    // Generate backup filename with date and commit hash (Ecuador timezone UTC-5)
    const now = new Date();
    const ecuadorTime = new Date(now.getTime() - 5 * 60 * 60 * 1000);
    
    const year = ecuadorTime.getUTCFullYear();
    const month = String(ecuadorTime.getUTCMonth() + 1).padStart(2, '0');
    const day = String(ecuadorTime.getUTCDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    const hours = String(ecuadorTime.getUTCHours()).padStart(2, '0');
    const minutes = String(ecuadorTime.getUTCMinutes()).padStart(2, '0');
    const seconds = String(ecuadorTime.getUTCSeconds()).padStart(2, '0');
    const timeStr = `${hours}-${minutes}-${seconds}`;
    
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
    
    // Create and add project info file
    const projectInfoPath = createProjectInfoFile(commitInfo);
    archive.file(projectInfoPath, { name: 'project-info.txt' });
    
    // Add all project files to the archive
    console.log('Adding project files to backup...');
    addDirectoryToZip(archive, '.');
    
    // Finalize the archive
    await archive.finalize();
    
    // Wait for the output stream to finish
    await new Promise((resolve, reject) => {
      output.on('close', () => {
        // Clean up temporary files
        if (fs.existsSync(projectInfoPath)) {
          fs.unlinkSync(projectInfoPath);
        }
        
        const finalSize = (archive.pointer() / 1024 / 1024).toFixed(2);
        console.log(`✅ Backup completo generado: ${BACKUP_DIR}/${backupFileName} (${finalSize} MB)`);
        
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
