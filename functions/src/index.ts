import * as admin from 'firebase-admin';
import { webhookSend } from './webhook-send';
import { healthCheck } from './health-check';

// Initialize Firebase Admin SDK
admin.initializeApp();

// Export Cloud Functions
export { webhookSend, healthCheck };