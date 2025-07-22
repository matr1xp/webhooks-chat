/**
 * Cloud Functions client for calling Firebase Functions from the frontend
 */

// 2nd Gen Cloud Functions have individual URLs
const WEBHOOK_SEND_URL = process.env.NEXT_PUBLIC_WEBHOOK_SEND_URL || 
  `${process.env.NEXT_PUBLIC_FUNCTIONS_BASE_URL}/webhookSend`;
const HEALTH_CHECK_URL = process.env.NEXT_PUBLIC_HEALTH_CHECK_URL || 
  `${process.env.NEXT_PUBLIC_FUNCTIONS_BASE_URL}/healthCheck`;
const TEST_WEBHOOK_URL = process.env.NEXT_PUBLIC_TEST_WEBHOOK_URL || 
  `${process.env.NEXT_PUBLIC_FUNCTIONS_BASE_URL}/testWebhook`;

// No fallback needed - all functions should have explicit URLs configured
const FALLBACK_ERROR = () => {
  throw new Error('Cloud Function URL not configured. Please set NEXT_PUBLIC_WEBHOOK_SEND_URL, NEXT_PUBLIC_HEALTH_CHECK_URL, and NEXT_PUBLIC_TEST_WEBHOOK_URL environment variables.');
};

export class CloudFunctionsClient {
  constructor() {}

  private getUrl(functionName: 'webhookSend' | 'healthCheck' | 'testWebhook'): string {
    switch (functionName) {
      case 'webhookSend':
        return WEBHOOK_SEND_URL || FALLBACK_ERROR();
      case 'healthCheck':
        return HEALTH_CHECK_URL || FALLBACK_ERROR();
      case 'testWebhook':
        return TEST_WEBHOOK_URL || FALLBACK_ERROR();
      default:
        throw new Error(`Unknown function: ${functionName}`);
    }
  }

  /**
   * Send message via webhook Cloud Function
   */
  async sendWebhook(payload: any, webhookUrl?: string, secret?: string): Promise<any> {
    const url = this.getUrl('webhookSend');
    console.log('🔗 Calling Cloud Function:', url);
    console.log('📤 Payload:', payload);
    console.log('📤 Custom webhook URL:', webhookUrl || 'using default');
    
    // Create extended payload that includes webhook configuration
    const extendedPayload = {
      ...payload,
      // Add webhook configuration if provided
      ...(webhookUrl && { webhookUrl }),
      ...(secret && { webhookSecret: secret })
    };
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': secret || process.env.NEXT_PUBLIC_WEBHOOK_SECRET || '',
        },
        body: JSON.stringify(extendedPayload),
      });

      console.log('📥 Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Cloud Function error:', errorText);
        throw new Error(`Webhook failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Cloud Function success:', result);
      return result;
    } catch (error: any) {
      console.error('🚨 Cloud Function call failed:', error);
      
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
    const baseUrl = this.getUrl('healthCheck');
    const url = new URL(baseUrl);
    if (webhookUrl) url.searchParams.set('webhookUrl', webhookUrl);
    if (secret) url.searchParams.set('apiSecret', secret);

    const response = await fetch(url.toString());
    return response.json();
  }

  /**
   * Test specific webhook via Cloud Function
   */
  async testWebhook(webhookUrl?: string, secret?: string, healthCheck = false): Promise<any> {
    const url = this.getUrl('testWebhook');
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: webhookUrl,
        secret,
        healthCheck,
      }),
    });

    return response.json();
  }
}

// Export singleton instance
export const cloudFunctions = new CloudFunctionsClient();