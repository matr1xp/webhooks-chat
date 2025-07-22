#!/usr/bin/env node

/**
 * Vercel deployment script
 * Deploys the static site to Vercel
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

function execPromise(command, options = {}) {
  return new Promise((resolve, reject) => {
    exec(command, options, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

async function checkVercelCli() {
  try {
    await execPromise('vercel --version');
    console.log('✅ Vercel CLI is installed');
  } catch (error) {
    console.error('❌ Vercel CLI not found. Please install it:');
    console.error('   npm install -g vercel');
    process.exit(1);
  }
}

async function checkVercelAuth() {
  try {
    await execPromise('vercel whoami');
    console.log('✅ Vercel authentication verified');
  } catch (error) {
    console.error('❌ Vercel login required:');
    console.error('   vercel login');
    process.exit(1);
  }
}

async function createVercelConfig() {
  const configPath = path.join(process.cwd(), 'vercel.json');
  
  const config = {
    version: 2,
    buildCommand: "npm run build:static",
    outputDirectory: "out",
    devCommand: "npm run dev",
    installCommand: "npm install",
    framework: null,
    headers: [
      {
        source: "/static/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable"
          }
        ]
      }
    ],
    rewrites: [
      {
        source: "/(.*)",
        destination: "/index.html"
      }
    ]
  };
  
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log('✅ Created vercel.json configuration');
}

async function deployToVercel() {
  console.log('🚀 Deploying to Vercel...');
  
  try {
    const { stdout } = await execPromise('vercel --prod');
    console.log('✅ Deployment successful!');
    
    // Extract the URL from the output
    const urlMatch = stdout.match(/https:\/\/[^\s]+\.vercel\.app/);
    if (urlMatch) {
      console.log(`\n🌐 Your site is live at: ${urlMatch[0]}`);
    }
    
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

async function main() {
  console.log('▲ Vercel Deployment\n');
  
  try {
    await checkVercelCli();
    await checkVercelAuth();
    await createVercelConfig();
    await deployToVercel();
    
    console.log('\n🎉 Deployment completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };