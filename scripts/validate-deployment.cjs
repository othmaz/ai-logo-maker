#!/usr/bin/env node

/**
 * Deployment Validation Script
 * 
 * This script validates that the deployment configuration is correct
 * and prevents the 5-hour debugging nightmare from happening again.
 * 
 * Run before any deployment changes: npm run validate-deployment
 */

const fs = require('fs');
const path = require('path');

const REQUIRED_FILES = [
  'vercel.json',
  'package.json', 
  'client/package.json',
  'server/server.js'
];

const CRITICAL_VERCEL_CONFIG = {
  builds: [
    {
      src: "package.json",
      use: "@vercel/static-build",
      config: {
        distDir: "client/dist"
      }
    },
    {
      src: "server/server.js",
      use: "@vercel/node"
    }
  ],
  routes: [
    { src: "/api/(.*)", dest: "server/server.js" },
    { src: "/images/(.*)", dest: "server/server.js" },
    { src: "/assets/(.*)", dest: "/assets/$1" },
    { src: "/(.*\\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$)", dest: "/$1" },
    { src: "/(.*)", dest: "/index.html" }
  ]
};

function validateFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`❌ CRITICAL: Missing file ${filePath}`);
  }
  console.log(`✅ Found ${filePath}`);
}

function validateVercelConfig() {
  console.log('\n🔍 Validating vercel.json configuration...');
  
  const vercelPath = path.join(process.cwd(), 'vercel.json');
  const config = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
  
  // Check builds array
  if (!config.builds || config.builds.length !== 2) {
    throw new Error('❌ CRITICAL: vercel.json must have exactly 2 builds');
  }
  
  // Check static build configuration
  const staticBuild = config.builds.find(b => b.use === '@vercel/static-build');
  if (!staticBuild) {
    throw new Error('❌ CRITICAL: Missing @vercel/static-build in builds');
  }
  
  if (staticBuild.src !== 'package.json') {
    throw new Error('❌ CRITICAL: Static build src must be "package.json"');
  }
  
  if (staticBuild.config.distDir !== 'client/dist') {
    throw new Error('❌ CRITICAL: distDir must be "client/dist"');
  }
  
  // Check routes
  if (!config.routes || config.routes.length !== 5) {
    throw new Error('❌ CRITICAL: vercel.json must have exactly 5 routes in correct order');
  }
  
  // Validate route order (CRITICAL!)
  const expectedRoutes = CRITICAL_VERCEL_CONFIG.routes;
  for (let i = 0; i < expectedRoutes.length; i++) {
    if (config.routes[i].src !== expectedRoutes[i].src || 
        config.routes[i].dest !== expectedRoutes[i].dest) {
      throw new Error(`❌ CRITICAL: Route ${i} is incorrect. Expected: ${JSON.stringify(expectedRoutes[i])}, Got: ${JSON.stringify(config.routes[i])}`);
    }
  }
  
  console.log('✅ vercel.json configuration is correct');
}

function validateBuildScripts() {
  console.log('\n🔍 Validating build scripts...');
  
  const packagePath = path.join(process.cwd(), 'package.json');
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  if (!pkg.scripts.build || !pkg.scripts.build.includes('cd client && npm install && npm run build')) {
    throw new Error('❌ CRITICAL: Root package.json build script must install client dependencies');
  }
  
  if (!pkg.scripts['vercel-build'] || !pkg.scripts['vercel-build'].includes('cd client && npm install && npm run build')) {
    throw new Error('❌ CRITICAL: Root package.json vercel-build script must install client dependencies');
  }
  
  console.log('✅ Build scripts are correct');
}

function validateClientBuild() {
  console.log('\n🔍 Testing client build...');
  
  const { execSync } = require('child_process');
  
  try {
    // Test that the build actually works
    console.log('🔄 Running test build...');
    execSync('cd client && npm install --silent && npm run build', { 
      stdio: 'pipe',
      timeout: 120000 // 2 minutes timeout
    });
    
    // Check that dist directory was created with correct files
    const distPath = path.join(process.cwd(), 'client', 'dist');
    if (!fs.existsSync(distPath)) {
      throw new Error('❌ CRITICAL: client/dist directory not created by build');
    }
    
    if (!fs.existsSync(path.join(distPath, 'index.html'))) {
      throw new Error('❌ CRITICAL: index.html not found in build output');
    }
    
    if (!fs.existsSync(path.join(distPath, 'assets'))) {
      throw new Error('❌ CRITICAL: assets directory not found in build output');
    }
    
    console.log('✅ Client build test successful');
    
  } catch (error) {
    throw new Error(`❌ CRITICAL: Client build failed - ${error.message}`);
  }
}

function main() {
  console.log('🚀 DEPLOYMENT VALIDATION - Preventing the 5-hour nightmare!\n');
  
  try {
    // Validate all required files exist
    console.log('🔍 Checking required files...');
    REQUIRED_FILES.forEach(validateFile);
    
    // Validate vercel.json configuration
    validateVercelConfig();
    
    // Validate build scripts
    validateBuildScripts();
    
    // Test actual build process
    validateClientBuild();
    
    console.log('\n🎉 SUCCESS! Deployment configuration is bulletproof!');
    console.log('✅ All validations passed');
    console.log('✅ Build test successful'); 
    console.log('✅ Ready for deployment');
    
    process.exit(0);
    
  } catch (error) {
    console.error(`\n💥 VALIDATION FAILED!\n`);
    console.error(error.message);
    console.error('\n🛑 DO NOT DEPLOY until this is fixed!');
    console.error('🔧 Check the CLAUDE.md deployment guide for solutions.');
    
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { validateVercelConfig, validateBuildScripts, validateClientBuild };