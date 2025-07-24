/**
 * Cloud Functions client for calling Firebase Functions from the frontend
 */

// 2nd Gen Cloud Functions have individual URLs
const WEBHOOK_SEND_URL = process.env.NEXT_PUBLIC_WEBHOOK_SEND_URL || 
  `${process.env.NEXT_PUBLIC_FUNCTIONS_BASE_URL}/webhookSend`;
const HEALTH_CHECK_URL = process.env.NEXT_PUBLIC_HEALTH_CHECK_URL || 
  `${process.env.NEXT_PUBLIC_FUNCTIONS_BASE_URL}/healthCheck`;

// No fallback needed - all functions should have explicit URLs configured
const FALLBACK_ERROR = () => {
  throw new Error('Cloud Function URL not configured. Please set NEXT_PUBLIC_WEBHOOK_SEND_URL and NEXT_PUBLIC_HEALTH_CHECK_URL environment variables.');
};

export class CloudFunctionsClient {
  constructor() {}

  private getUrl(functionName: 'webhookSend' | 'healthCheck'): string {
    switch (functionName) {
      case 'webhookSend':
        return WEBHOOK_SEND_URL || FALLBACK_ERROR();
      case 'healthCheck':
        return HEALTH_CHECK_URL || FALLBACK_ERROR();
      default:
        throw new Error(`Unknown function: ${functionName}`);
    }
  }

  /**
   * Send message via webhook Cloud Function
   */
  async sendWebhook(payload: any, webhookUrl?: string, secret?: string): Promise<any> {
    const url = this.getUrl('webhookSend');
    
    // Create extended payload that includes webhook configuration
    const extendedPayload = {
      ...payload,
      // Add webhook configuration if provided
      ...(webhookUrl && { webhookUrl }),
      ...(secret && { webhookSecret: secret })
    };
    
    try {
      const payloadStr = JSON.stringify(extendedPayload);
      const payloadSizeMB = (payloadStr.length / 1024 / 1024).toFixed(2);
      
      console.log(`Sending webhook payload: ${payloadSizeMB}MB`);
      
      // Check payload size before sending
      if (payloadStr.length > 10 * 1024 * 1024) { // 10MB limit
        throw new Error(`Payload too large: ${payloadSizeMB}MB (max 10MB)`);
      }
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': secret || process.env.NEXT_PUBLIC_WEBHOOK_SECRET || '',
        },
        body: payloadStr,
      });


      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Webhook failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      return result;
    } catch (error: any) {
      
      // Provide more specific error messages
      if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
        throw new Error('Cannot connect to Cloud Functions. Check if the URL is correct and CORS is configured.');
      }
      
      throw error;
    }
  }

  /**
   * Check health via Cloud Function
   */
  async checkHealth(webhookUrl?: string, secret?: string): Promise<any> {
    try {
      const baseUrl = this.getUrl('healthCheck');
      const url = new URL(baseUrl);
      if (webhookUrl) url.searchParams.set('webhookUrl', webhookUrl);
      if (secret) url.searchParams.set('apiSecret', secret);

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        return { status: 'unhealthy', error: `HTTP ${response.status}: ${response.statusText}` };
      }
      
      return await response.json();
    } catch (error) {
      return { status: 'unhealthy', error: error instanceof Error ? error.message : 'Health check failed' };
    }
  }

}

// Export singleton instance
export const cloudFunctions = new CloudFunctionsClient();