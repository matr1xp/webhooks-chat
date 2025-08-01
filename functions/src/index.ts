import * as admin from 'firebase-admin';

import { healthCheck } from './health-check';
import { setGlobalOptions } from 'firebase-functions/v2';
import { webhookSend } from './webhook-send';

// Configure global options for all functions
// Default to Europe North region, but allow override via environment variable
const deployRegion = process.env.FUNCTIONS_REGION || 'us-central1';

console.log(`Configuring Firebase Functions for region: ${deployRegion}`);
setGlobalOptions({ region: deployRegion });

// Initialize Firebase Admin SDK
admin.initializeApp();

// Export Cloud Functions
export { webhookSend, healthCheck };