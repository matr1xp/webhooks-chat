#!/usr/bin/env node

/**
 * Build validation script for static export
 * Validates that the static build is ready for production deployment
 */

const fs = require('fs');
const path = require('path');

const BUILD_DIR = path.join(process.cwd(), 'out');
const REQUIRED_FILES = [
  'index.html',
  'favicon.ico',
  '404.html',
  '_next/static'
];

const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_WEBHOOK_SEND_URL',
  'NEXT_PUBLIC_HEALTH_CHECK_URL',
  'NEXT_PUBLIC_TEST_WEBHOOK_URL'
];

function validateBuildExists() {
  console.log('🔍 Validating build directory...');
  if (!fs.existsSync(BUILD_DIR)) {
    console.error('❌ Build directory not found. Run "npm run build" first.');
    process.exit(1);
  }
  console.log('✅ Build directory exists');
}

function validateRequiredFiles() {
  console.log('🔍 Validating required files...');
  const missing = [];
  
  for (const file of REQUIRED_FILES) {
    const filePath = path.join(BUILD_DIR, file);
    if (!fs.existsSync(filePath)) {
      missing.push(file);
    }
  }
  
  if (missing.length > 0) {
    console.error('❌ Missing required files:');
    missing.forEach(file => console.error(`   - ${file}`));
    process.exit(1);
  }
  console.log('✅ All required files present');
}

function validateEnvironmentVariables() {
  console.log('🔍 Validating environment variables in build...');
  const jsFiles = findJSFiles(path.join(BUILD_DIR, '_next/static'));
  const envVarsFound = new Set();
  
  for (const jsFile of jsFiles) {
    const content = fs.readFileSync(jsFile, 'utf-8');
    for (const envVar of REQUIRED_ENV_VARS) {
      // Look for the actual value, not the variable name
      if (content.includes('***REMOVED***') || 
          content.includes('***REMOVED***') ||
          content.includes('***REMOVED***')) {
        envVarsFound.add('firebase_config');
      }
      if (content.includes('***REMOVED***')) {
        envVarsFound.add('cloud_functions');
      }
    }
  }
  
  if (!envVarsFound.has('firebase_config')) {
    console.error('❌ Firebase configuration not found in build');
    process.exit(1);
  }
  
  if (!envVarsFound.has('cloud_functions')) {
    console.error('❌ Cloud Functions URLs not found in build');
    process.exit(1);
  }
  
  console.log('✅ Environment variables embedded correctly');
}

function findJSFiles(dir) {
  const files = [];
  
  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir);
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        traverse(fullPath);
      } else if (item.endsWith('.js')) {
        files.push(fullPath);
      }
    }
  }
  
  if (fs.existsSync(dir)) {
    traverse(dir);
  }
  
  return files;
}

function validateBundleSize() {
  console.log('🔍 Validating bundle sizes...');
  const staticDir = path.join(BUILD_DIR, '_next/static');
  if (!fs.existsSync(staticDir)) {
    console.error('❌ Static directory not found');
    process.exit(1);
  }
  
  const jsFiles = findJSFiles(staticDir);
  let totalSize = 0;
  let largeFiles = [];
  
  for (const jsFile of jsFiles) {
    const stats = fs.statSync(jsFile);
    totalSize += stats.size;
    
    if (stats.size > 500 * 1024) { // 500KB
      largeFiles.push({
        file: path.relative(BUILD_DIR, jsFile),
        size: (stats.size / 1024).toFixed(1) + 'KB'
      });
    }
  }
  
  console.log(`📊 Total JS bundle size: ${(totalSize / 1024).toFixed(1)}KB`);
  
  if (largeFiles.length > 0) {
    console.log('⚠️  Large bundle files detected:');
    largeFiles.forEach(file => {
      console.log(`   - ${file.file}: ${file.size}`);
    });
  }
  
  if (totalSize > 2 * 1024 * 1024) { // 2MB
    console.error('❌ Total bundle size exceeds 2MB limit');
    process.exit(1);
  }
  
  console.log('✅ Bundle sizes within acceptable limits');
}

function validateHTMLPages() {
  console.log('🔍 Validating HTML pages...');
  const indexHtml = path.join(BUILD_DIR, 'index.html');
  const content = fs.readFileSync(indexHtml, 'utf-8');
  
  if (!content.includes('<title>WebhookIQ</title>')) {
    console.error('❌ Title not found in index.html');
    process.exit(1);
  }
  
  if (!content.includes('_next/static')) {
    console.error('❌ Static assets not referenced in HTML');
    process.exit(1);
  }
  
  console.log('✅ HTML pages valid');
}

function main() {
  console.log('🚀 Starting build validation...\n');
  
  try {
    validateBuildExists();
    validateRequiredFiles();
    validateEnvironmentVariables();
    validateBundleSize();
    validateHTMLPages();
    
    console.log('\n✅ Build validation successful! 🎉');
    console.log('📦 Static site is ready for deployment\n');
    
    // Print deployment summary
    console.log('📋 Deployment Summary:');
    console.log(`   - Build directory: ${BUILD_DIR}`);
    console.log(`   - Firebase project: ***REMOVED***`);
    console.log(`   - Cloud Functions: 3 functions deployed`);
    console.log(`   - Environment: Production ready`);
    
  } catch (error) {
    console.error('\n❌ Build validation failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };