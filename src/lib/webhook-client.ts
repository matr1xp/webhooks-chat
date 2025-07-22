import { WebhookPayload, WebhookResponse } from '@/types/chat';
import { WebhookConfig } from '@/types/config';
import { cloudFunctions } from './cloud-functions';

class WebhookClient {
  private fallbackURL: string;
  private fallbackSecret?: string;

  constructor() {
    this.fallbackURL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    this.fallbackSecret = process.env.NEXT_PUBLIC_WEBHOOK_SECRET;
  }

  async sendMessage(payload: WebhookPayload, webhookConfig?: WebhookConfig): Promise<WebhookResponse> {
    try {
      // Use Cloud Functions for all webhook calls, passing webhook configuration if available
      const response = await cloudFunctions.sendWebhook(
        payload,
        webhookConfig?.url,
        webhookConfig?.apiSecret
      );
      
      // Cloud Function already handles the response parsing
      return response;
    } catch (error) {
      console.error('Failed to send webhook via Cloud Function:', error instanceof Error ? error.message : 'Unknown error');
      
      // Return a proper error response
      return {
        success: false,
        messageId: payload.messageId,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Failed to send message to webhook',
      };
    }
  }

  async getMessageHistory(sessionId: string, limit: number = 50, webhookConfig?: WebhookConfig): Promise<any> {
    // For Phase 2, message history will be handled directly via Firestore
    // This method is kept for backward compatibility but will be deprecated
    console.warn('getMessageHistory is deprecated in Cloud Functions mode. Use Firestore directly.');
    
    // Return empty history for now - Firestore integration handles this
    return {
      messages: [],
      sessionId,
      limit,
    };
  }

  async checkHealth(webhookConfig?: WebhookConfig): Promise<boolean> {
    try {
      // Use Cloud Functions health check
      const response = await cloudFunctions.checkHealth(
        webhookConfig?.url,
        webhookConfig?.apiSecret
      );
      
      return response.status === 'healthy';
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  async testWebhook(webhookConfig?: WebhookConfig): Promise<any> {
    try {
      // Use Cloud Functions test webhook
      return await cloudFunctions.testWebhook(
        webhookConfig?.url,
        webhookConfig?.apiSecret,
        false // Not a health check
      );
    } catch (error) {
      console.error('Webhook test failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Test failed',
      };
    }
  }
}

export { WebhookClient };
export const webhookClient = new WebhookClient();