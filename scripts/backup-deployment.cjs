#!/usr/bin/env node

/**
 * Deployment Backup Script
 * 
 * Creates a timestamped backup of critical deployment files
 * Run before pushing: npm run backup-deployment
 */

const fs = require('fs');
const path = require('path');

// Critical files that if broken, break deployment
const CRITICAL_FILES = [
  'vercel.json',
  'package.json',
  'client/package.json', 
  'client/vite.config.ts',
  'server/server.js'
];

// Additional important files to backup
const IMPORTANT_FILES = [
  '.env.example',
  'railway.toml',
  'build.sh',
  'vercel-build.sh',
  'tsconfig.json'
];

function createBackupDir() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(process.cwd(), '.backups', `backup-${timestamp}`);
  
  fs.mkdirSync(backupDir, { recursive: true });
  return backupDir;
}

function backupFile(filePath, backupDir) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Skipping ${filePath} (not found)`);
      return;
    }
    
    const fileName = path.basename(filePath);
    const dirName = path.dirname(filePath).replace(/[\/\\]/g, '_');
    const backupFileName = dirName === '.' ? fileName : `${dirName}_${fileName}`;
    const backupPath = path.join(backupDir, backupFileName);
    
    fs.copyFileSync(filePath, backupPath);
    console.log(`✅ Backed up: ${filePath} → ${backupFileName}`);
    
  } catch (error) {
    console.error(`❌ Failed to backup ${filePath}: ${error.message}`);
    throw error;
  }
}

function getCurrentGitInfo() {
  try {
    const { execSync } = require('child_process');
    
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    const commit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim().substring(0, 8);
    const status = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
    
    return { branch, commit, hasChanges: status.length > 0 };
  } catch (error) {
    return { branch: 'unknown', commit: 'unknown', hasChanges: true };
  }
}

function createBackupInfo(backupDir, gitInfo) {
  const backupInfo = {
    timestamp: new Date().toISOString(),
    gitBranch: gitInfo.branch,
    gitCommit: gitInfo.commit,
    hasUncommittedChanges: gitInfo.hasChanges,
    backedUpFiles: [...CRITICAL_FILES, ...IMPORTANT_FILES],
    purpose: 'Pre-deployment safety backup',
    restoreInstructions: [
      '1. Copy files from this backup to project root',
      '2. Run: npm run validate-deployment',
      '3. If validation passes, commit and deploy',
      '4. If still broken, check DEPLOYMENT_LOCKDOWN.md'
    ]
  };
  
  const infoPath = path.join(backupDir, 'backup-info.json');
  fs.writeFileSync(infoPath, JSON.stringify(backupInfo, null, 2));
  
  return backupInfo;
}

function cleanOldBackups() {
  const backupsDir = path.join(process.cwd(), '.backups');
  
  if (!fs.existsSync(backupsDir)) {
    return;
  }
  
  const backupFolders = fs.readdirSync(backupsDir)
    .filter(name => name.startsWith('backup-'))
    .map(name => ({
      name,
      path: path.join(backupsDir, name),
      mtime: fs.statSync(path.join(backupsDir, name)).mtime
    }))
    .sort((a, b) => b.mtime - a.mtime);
  
  // Keep last 10 backups, delete older ones
  if (backupFolders.length > 10) {
    const toDelete = backupFolders.slice(10);
    
    for (const backup of toDelete) {
      try {
        fs.rmSync(backup.path, { recursive: true, force: true });
        console.log(`🧹 Cleaned old backup: ${backup.name}`);
      } catch (error) {
        console.warn(`⚠️  Could not delete old backup ${backup.name}: ${error.message}`);
      }
    }
  }
}

function main() {
  console.log('🔄 CREATING DEPLOYMENT BACKUP...\n');
  
  try {
    // Clean old backups first
    cleanOldBackups();
    
    // Create backup directory
    const backupDir = createBackupDir();
    console.log(`📁 Backup directory: ${path.relative(process.cwd(), backupDir)}\n`);
    
    // Get git info
    const gitInfo = getCurrentGitInfo();
    console.log(`📋 Current state: ${gitInfo.branch}@${gitInfo.commit}${gitInfo.hasChanges ? ' (with changes)' : ''}\n`);
    
    // Backup critical files
    console.log('🔒 Backing up CRITICAL files...');
    for (const filePath of CRITICAL_FILES) {
      backupFile(filePath, backupDir);
    }
    
    console.log('\n📋 Backing up IMPORTANT files...');
    for (const filePath of IMPORTANT_FILES) {
      backupFile(filePath, backupDir);
    }
    
    // Create backup info
    const backupInfo = createBackupInfo(backupDir, gitInfo);
    console.log('\n💾 Backup info saved');
    
    console.log('\n🎉 BACKUP COMPLETED SUCCESSFULLY!');
    console.log(`✅ ${CRITICAL_FILES.length + IMPORTANT_FILES.length} files backed up`);
    console.log(`📂 Location: ${path.relative(process.cwd(), backupDir)}`);
    
    if (gitInfo.hasChanges) {
      console.log('\n⚠️  You have uncommitted changes!');
      console.log('💡 Consider committing before deployment for better tracking');
    }
    
    console.log('\n🚀 Ready to deploy safely!');
    
  } catch (error) {
    console.error(`\n💥 BACKUP FAILED: ${error.message}`);
    console.error('🛑 DO NOT DEPLOY without a successful backup!');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { createBackupDir, backupFile, getCurrentGitInfo };