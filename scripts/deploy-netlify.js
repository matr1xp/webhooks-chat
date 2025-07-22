#!/usr/bin/env node

/**
 * Netlify deployment script
 * Deploys the static site to Netlify
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

async function checkNetlifyCli() {
  try {
    await execPromise('netlify --version');
    console.log('✅ Netlify CLI is installed');
  } catch (error) {
    console.error('❌ Netlify CLI not found. Please install it:');
    console.error('   npm install -g netlify-cli');
    process.exit(1);
  }
}

async function checkNetlifyAuth() {
  try {
    await execPromise('netlify status');
    console.log('✅ Netlify authentication verified');
  } catch (error) {
    console.error('❌ Netlify login required:');
    console.error('   netlify login');
    process.exit(1);
  }
}

async function createNetlifyConfig() {
  const configPath = path.join(process.cwd(), 'netlify.toml');
  
  const config = `# Netlify configuration for static site
[build]
  publish = "out"
  command = "npm run build:static"

[build.environment]
  NODE_VERSION = "20"
  NPM_VERSION = "10"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "*.js"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "*.css"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "*.png"
  [headers.values]
    Cache-Control = "public, max-age=86400"

[[headers]]
  for = "*.jpg"
  [headers.values]
    Cache-Control = "public, max-age=86400"

[[headers]]
  for = "*.gif"
  [headers.values]
    Cache-Control = "public, max-age=86400"

[[headers]]
  for = "*.svg"
  [headers.values]
    Cache-Control = "public, max-age=86400"
`;
  
  fs.writeFileSync(configPath, config);
  console.log('✅ Created netlify.toml configuration');
}

async function deployToNetlify() {
  console.log('🚀 Deploying to Netlify...');
  
  try {
    const { stdout } = await execPromise('netlify deploy --prod --dir=out');
    console.log('✅ Deployment successful!');
    
    // Extract the URL from the output
    const urlMatch = stdout.match(/Website URL: (https?:\/\/[^\s]+)/);
    if (urlMatch) {
      console.log(`\n🌐 Your site is live at: ${urlMatch[1]}`);
    }
    
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

async function main() {
  console.log('🌊 Netlify Deployment\n');
  
  try {
    await checkNetlifyCli();
    await checkNetlifyAuth();
    await createNetlifyConfig();
    await deployToNetlify();
    
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