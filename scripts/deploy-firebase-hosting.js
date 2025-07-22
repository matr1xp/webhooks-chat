#!/usr/bin/env node

/**
 * Firebase Hosting deployment script
 * Deploys the static site to Firebase Hosting
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

async function checkFirebaseCli() {
  try {
    await execPromise('firebase --version');
    console.log('✅ Firebase CLI is installed');
  } catch (error) {
    console.error('❌ Firebase CLI not found. Please install it:');
    console.error('   npm install -g firebase-tools');
    process.exit(1);
  }
}

async function checkFirebaseLogin() {
  try {
    const { stdout } = await execPromise('firebase projects:list');
    if (stdout.includes('***REMOVED***')) {
      console.log('✅ Firebase authentication verified');
    } else {
      console.error('❌ Project not found. Please login:');
      console.error('   firebase login');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Firebase login required:');
    console.error('   firebase login');
    process.exit(1);
  }
}

async function updateFirebaseJson() {
  const firebaseJsonPath = path.join(process.cwd(), 'firebase.json');
  
  if (!fs.existsSync(firebaseJsonPath)) {
    console.error('❌ firebase.json not found');
    process.exit(1);
  }
  
  const config = JSON.parse(fs.readFileSync(firebaseJsonPath, 'utf-8'));
  
  // Update hosting configuration for static site
  config.hosting = {
    public: "out",
    ignore: ["firebase.json", "**/.*", "**/node_modules/**"],
    rewrites: [
      {
        source: "**",
        destination: "/index.html"
      }
    ],
    headers: [
      {
        source: "**/*.@(js|css)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable"
          }
        ]
      },
      {
        source: "**/*.@(jpg|jpeg|gif|png|svg|webp|ico)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400"
          }
        ]
      }
    ]
  };
  
  fs.writeFileSync(firebaseJsonPath, JSON.stringify(config, null, 2));
  console.log('✅ Updated firebase.json for hosting');
}

async function deployToFirebase() {
  console.log('🚀 Deploying to Firebase Hosting...');
  
  try {
    const { stdout } = await execPromise('firebase deploy --only hosting');
    console.log('✅ Deployment successful!');
    
    // Extract the hosting URL from the output
    const urlMatch = stdout.match(/Hosting URL: (https?:\/\/[^\s]+)/);
    if (urlMatch) {
      console.log(`\n🌐 Your site is live at: ${urlMatch[1]}`);
    }
    
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

async function main() {
  console.log('🔥 Firebase Hosting Deployment\n');
  
  try {
    await checkFirebaseCli();
    await checkFirebaseLogin();
    await updateFirebaseJson();
    await deployToFirebase();
    
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