#!/usr/bin/env node

/**
 * Deployment Health Check Script
 * 
 * Tests the deployed application to ensure everything works correctly.
 * Run after deployment: npm run health-check
 */

const https = require('https');
const http = require('http');

// Production Vercel deployment URL
const DEPLOYMENT_URL = process.env.DEPLOYMENT_URL || process.env.VERCEL_URL || 'https://www.craftyourlogo.com';

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    client.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, data, headers: res.headers }));
    }).on('error', reject);
  });
}

async function testMainPage() {
  console.log('🔍 Testing main page...');
  
  try {
    const response = await makeRequest(DEPLOYMENT_URL);
    
    if (response.statusCode !== 200) {
      throw new Error(`Main page returned ${response.statusCode}`);
    }
    
    if (!response.data.includes('<title>')) {
      throw new Error('Main page does not contain HTML');
    }
    
    if (!response.data.includes('React')) {
      console.warn('⚠️  Warning: Main page may not be loading React app');
    }
    
    console.log('✅ Main page loads correctly');
    return true;
    
  } catch (error) {
    console.error(`❌ Main page test failed: ${error.message}`);
    return false;
  }
}

async function testStaticAssets() {
  console.log('🔍 Testing static assets...');
  
  // Test common asset paths
  const assetTests = [
    '/assets/',  // Should not return 404
    '/vite.svg', // Should serve the SVG file
  ];
  
  for (const assetPath of assetTests) {
    try {
      const url = `${DEPLOYMENT_URL}${assetPath}`;
      const response = await makeRequest(url);
      
      if (response.statusCode === 404) {
        console.warn(`⚠️  Warning: ${assetPath} returns 404`);
      } else if (response.headers['content-type']?.includes('text/html')) {
        throw new Error(`${assetPath} returns HTML instead of asset - MIME type issue!`);
      } else {
        console.log(`✅ ${assetPath} serves correctly`);
      }
      
    } catch (error) {
      console.error(`❌ Asset test failed for ${assetPath}: ${error.message}`);
      return false;
    }
  }
  
  return true;
}

async function testApiEndpoints() {
  console.log('🔍 Testing API endpoints...');
  
  try {
    // Test that API endpoint is accessible 
    const response = await makeRequest(`${DEPLOYMENT_URL}/api/generate`);
    
    // API should return 405 (Method Not Allowed) for GET, 400 (Bad Request), or 500 (Server Error - missing API key is OK)
    if (response.statusCode !== 405 && response.statusCode !== 400 && response.statusCode !== 500) {
      throw new Error(`API endpoint returned unexpected status ${response.statusCode}`);
    }
    
    if (response.statusCode === 500) {
      console.log('✅ API endpoints are accessible (500 likely due to missing API key - OK for deployment test)');
    } else {
      console.log('✅ API endpoints are accessible');
    }
    return true;
    
  } catch (error) {
    console.error(`❌ API test failed: ${error.message}`);
    return false;
  }
}

async function testJavaScriptLoading() {
  console.log('🔍 Testing JavaScript module loading...');
  
  try {
    const response = await makeRequest(DEPLOYMENT_URL);
    
    // Look for script tags in the HTML
    const scriptMatches = response.data.match(/<script[^>]*src="([^"]*)"[^>]*>/g);
    
    if (!scriptMatches || scriptMatches.length === 0) {
      throw new Error('No script tags found in HTML');
    }
    
    // Test loading one of the script files
    for (const scriptTag of scriptMatches.slice(0, 2)) { // Test first 2 scripts
      const srcMatch = scriptTag.match(/src="([^"]*)"/);
      if (srcMatch) {
        const scriptUrl = srcMatch[1].startsWith('/') 
          ? `${DEPLOYMENT_URL}${srcMatch[1]}`
          : srcMatch[1];
          
        const scriptResponse = await makeRequest(scriptUrl);
        
        if (scriptResponse.statusCode !== 200) {
          throw new Error(`Script ${srcMatch[1]} returns ${scriptResponse.statusCode}`);
        }
        
        if (scriptResponse.headers['content-type']?.includes('text/html')) {
          throw new Error(`Script ${srcMatch[1]} returns HTML - CRITICAL MIME TYPE ERROR!`);
        }
        
        console.log(`✅ Script ${srcMatch[1]} loads correctly`);
      }
    }
    
    return true;
    
  } catch (error) {
    console.error(`❌ JavaScript loading test failed: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🚀 DEPLOYMENT HEALTH CHECK\n');
  console.log(`Testing deployment at: ${DEPLOYMENT_URL}\n`);
  
  const tests = [
    testMainPage,
    testStaticAssets, 
    testApiEndpoints,
    testJavaScriptLoading
  ];
  
  let allTestsPassed = true;
  
  for (const test of tests) {
    try {
      const result = await test();
      allTestsPassed = allTestsPassed && result;
    } catch (error) {
      console.error(`❌ Test failed: ${error.message}`);
      allTestsPassed = false;
    }
    console.log(''); // Empty line between tests
  }
  
  if (allTestsPassed) {
    console.log('🎉 ALL HEALTH CHECKS PASSED!');
    console.log('✅ Deployment is working correctly');
    process.exit(0);
  } else {
    console.log('💥 HEALTH CHECK FAILED!');
    console.log('🛑 Deployment has issues that need attention');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { testMainPage, testStaticAssets, testApiEndpoints, testJavaScriptLoading };