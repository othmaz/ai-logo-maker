#!/usr/bin/env node

/**
 * Backup Restoration Script
 * 
 * Restores deployment files from a backup
 * Usage: npm run restore-backup [backup-name]
 */

const fs = require('fs');
const path = require('path');

function listBackups() {
  const backupsDir = path.join(process.cwd(), '.backups');
  
  if (!fs.existsSync(backupsDir)) {
    console.log('📁 No backups found');
    return [];
  }
  
  const backups = fs.readdirSync(backupsDir)
    .filter(name => name.startsWith('backup-'))
    .map(name => {
      const backupPath = path.join(backupsDir, name);
      const infoPath = path.join(backupPath, 'backup-info.json');
      
      let info = {};
      if (fs.existsSync(infoPath)) {
        try {
          info = JSON.parse(fs.readFileSync(infoPath, 'utf8'));
        } catch (e) {
          // Ignore invalid info files
        }
      }
      
      return {
        name,
        path: backupPath,
        timestamp: info.timestamp || 'unknown',
        gitCommit: info.gitCommit || 'unknown',
        gitBranch: info.gitBranch || 'unknown'
      };
    })
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
  return backups;
}

function restoreFromBackup(backupName) {
  const backupsDir = path.join(process.cwd(), '.backups');
  const backupPath = path.join(backupsDir, backupName);
  
  if (!fs.existsSync(backupPath)) {
    throw new Error(`Backup not found: ${backupName}`);
  }
  
  console.log(`🔄 Restoring from backup: ${backupName}`);
  
  // Read backup info
  const infoPath = path.join(backupPath, 'backup-info.json');
  let backupInfo = {};
  
  if (fs.existsSync(infoPath)) {
    backupInfo = JSON.parse(fs.readFileSync(infoPath, 'utf8'));
    console.log(`📋 Backup from: ${backupInfo.timestamp}`);
    console.log(`📋 Git state: ${backupInfo.gitBranch}@${backupInfo.gitCommit}`);
  }
  
  // Get all files in backup (except backup-info.json)
  const backupFiles = fs.readdirSync(backupPath)
    .filter(name => name !== 'backup-info.json');
  
  console.log(`\n📥 Restoring ${backupFiles.length} files...\n`);
  
  for (const backupFileName of backupFiles) {
    // Convert backup filename back to original path
    const originalPath = backupFileName.includes('_') 
      ? backupFileName.replace(/_/g, '/').replace(/([^/]+)\/([^/]+)$/, '$1/$2')
      : backupFileName;
    
    const backupFilePath = path.join(backupPath, backupFileName);
    const targetPath = path.join(process.cwd(), originalPath);
    
    try {
      // Create target directory if needed
      const targetDir = path.dirname(targetPath);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      
      // Copy file
      fs.copyFileSync(backupFilePath, targetPath);
      console.log(`✅ Restored: ${originalPath}`);
      
    } catch (error) {
      console.error(`❌ Failed to restore ${originalPath}: ${error.message}`);
      throw error;
    }
  }
}

function main() {
  const backupName = process.argv[2];
  
  console.log('🔄 BACKUP RESTORATION TOOL\n');
  
  try {
    const backups = listBackups();
    
    if (backups.length === 0) {
      console.log('📁 No backups available');
      process.exit(0);
    }
    
    if (!backupName) {
      console.log('📋 Available backups:\n');
      
      backups.forEach((backup, index) => {
        const date = new Date(backup.timestamp).toLocaleString();
        console.log(`${index + 1}. ${backup.name}`);
        console.log(`   📅 ${date}`);
        console.log(`   🌿 ${backup.gitBranch}@${backup.gitCommit}`);
        console.log('');
      });
      
      console.log('💡 Usage: npm run restore-backup <backup-name>');
      console.log(`💡 Example: npm run restore-backup ${backups[0].name}`);
      process.exit(0);
    }
    
    // Restore the specified backup
    restoreFromBackup(backupName);
    
    console.log('\n🎉 RESTORATION COMPLETED!');
    console.log('\n🔍 Next steps:');
    console.log('1. Run: npm run validate-deployment');
    console.log('2. If validation passes, you\'re good to go!');
    console.log('3. If still broken, check DEPLOYMENT_LOCKDOWN.md');
    
  } catch (error) {
    console.error(`\n💥 RESTORATION FAILED: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { listBackups, restoreFromBackup };