import axios, { AxiosResponse } from 'axios';
import { WebhookPayload, WebhookResponse } from '@/types/chat';
import { WebhookConfig } from '@/types/config';

class WebhookClient {
  private fallbackURL: string;
  private fallbackSecret?: string;

  constructor() {
    this.fallbackURL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    this.fallbackSecret = process.env.NEXT_PUBLIC_WEBHOOK_SECRET;
  }

  async sendMessage(payload: WebhookPayload, webhookConfig?: WebhookConfig): Promise<WebhookResponse> {
    // Get timeout from public environment variable or use default
    const envTimeout = process.env.NEXT_PUBLIC_TIMEOUT;
    let timeoutMs = 30000; // Default to 30 seconds
    if (envTimeout) {
      const parsedTimeout = parseInt(envTimeout);
      if (!isNaN(parsedTimeout) && parsedTimeout >= 1000 && parsedTimeout <= 120000) {
        timeoutMs = parsedTimeout;
      }
    }
    
    // Use provided webhook config or fallback to environment variables
    const webhookUrl = webhookConfig?.url || `${this.fallbackURL}/api/webhook/send`;
    const secret = webhookConfig?.apiSecret || this.fallbackSecret;
    
    try {
      let response: AxiosResponse<any>;
      
      // Check if this is an external webhook (not localhost) that needs CORS proxy
      const isExternalWebhook = webhookConfig?.url && !webhookConfig.url.includes('localhost') && !webhookConfig.url.includes('127.0.0.1');
      
      if (isExternalWebhook) {
        // Use our proxy to avoid CORS issues with external webhooks
        response = await axios.post(
          `${this.fallbackURL}/api/webhook/proxy`,
          {
            webhookUrl,
            apiSecret: secret,
            payload,
          },
          {
            headers: {
              'Content-Type': 'application/json',
            },
            timeout: timeoutMs,
          }
        );
        
        // The proxy returns the actual webhook response in the data field
        if (response.data && typeof response.data === 'object') {
          // Extract the actual webhook response from the proxy response
          const proxyResponse = response.data;
          response.status = proxyResponse.status || response.status;
          response.statusText = proxyResponse.statusText || response.statusText;
          response.data = proxyResponse.data;
        }
      } else {
        // Direct call for local webhooks
        response = await axios.post(
          webhookUrl,
          payload,
          {
            headers: {
              'Content-Type': 'application/json',
              ...(secret && { 'X-Webhook-Secret': secret }),
            },
            timeout: timeoutMs,
          }
        );
      }
      
      console.log('Raw webhook response:', {
        status: response.status,
        statusText: response.statusText,
        dataType: typeof response.data,
        dataKeys: response.data && typeof response.data === 'object' ? Object.keys(response.data) : null,
        dataPreview: JSON.stringify(response.data)?.substring(0, 200),
      });
      
      // If the response is successful (200-299), treat it as success
      // and try to extract bot message if available
      const webhookResponse: WebhookResponse = {
        success: response.status >= 200 && response.status < 300,
        messageId: payload.messageId,
        timestamp: new Date().toISOString(),
      };
      
      // Try to extract bot response from various possible formats
      if (response.data) {
        const data = response.data;
        
        // Check if the response has a bot message in various formats
        if (typeof data === 'string') {
          // Simple string response
          webhookResponse.botMessage = {
            content: data,
            type: 'text',
          };
        } else if (data.message || data.content || data.text || data.response) {
          // Object with message field
          webhookResponse.botMessage = {
            content: data.message || data.content || data.text || data.response,
            type: 'text',
            metadata: data.metadata,
          };
        } else if (data.botMessage) {
          // Already in the expected format
          webhookResponse.botMessage = data.botMessage;
        } else if (Array.isArray(data) && data.length > 0) {
          // Array response, take first item
          const firstItem = data[0];
          if (typeof firstItem === 'string') {
            webhookResponse.botMessage = {
              content: firstItem,
              type: 'text',
            };
          } else if (firstItem && (firstItem.message || firstItem.content || firstItem.text || firstItem.response)) {
            webhookResponse.botMessage = {
              content: firstItem.message || firstItem.content || firstItem.text || firstItem.response,
              type: 'text',
              metadata: firstItem.metadata,
            };
          } else if (firstItem && firstItem.summary) {
            // Handle N8N response format with summary field
            webhookResponse.botMessage = {
              content: firstItem.summary,
              type: 'text',
              metadata: firstItem,
            };
          } else if (firstItem && typeof firstItem === 'object') {
            // Handle other object formats - try common field names
            const possibleContent = firstItem.summary || firstItem.result || firstItem.output || firstItem.data;
            if (possibleContent && typeof possibleContent === 'string') {
              webhookResponse.botMessage = {
                content: possibleContent,
                type: 'text',
                metadata: firstItem,
              };
            }
          }
        } else if (data.summary) {
          // Direct summary field (not in array)
          webhookResponse.botMessage = {
            content: data.summary,
            type: 'text',
            metadata: data,
          };
        } else if (typeof data === 'object') {
          // Handle other object formats - try common field names
          const possibleContent = data.summary || data.result || data.output || data.data;
          if (possibleContent && typeof possibleContent === 'string') {
            webhookResponse.botMessage = {
              content: possibleContent,
              type: 'text',
              metadata: data,
            };
          }
        }
      }
      
      
      return webhookResponse;
    } catch (error) {
      console.error('Failed to send webhook:', error);
      
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
    // Use provided webhook config or fallback to environment variables
    const baseUrl = webhookConfig?.url ? new URL(webhookConfig.url).origin : this.fallbackURL;
    const secret = webhookConfig?.apiSecret || this.fallbackSecret;
    
    try {
      const response = await axios.get(
        `${baseUrl}/api/messages/${sessionId}`,
        {
          params: { limit },
          headers: {
            ...(secret && { 'X-Webhook-Secret': secret }),
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to fetch message history:', error);
      throw new Error('Failed to fetch message history');
    }
  }

  async checkHealth(webhookConfig?: WebhookConfig): Promise<boolean> {
    try {
      // Use provided webhook config or fallback to environment variables
      const url = webhookConfig?.url || `${this.fallbackURL}/api/webhook/send`;
      
      // For external webhooks (like N8N), just validate the URL format
      // since CORS prevents direct health checks and webhooks are designed for POST requests
      const isExternalWebhook = webhookConfig?.url && !webhookConfig.url.includes('localhost') && !webhookConfig.url.includes('127.0.0.1');
      
      if (isExternalWebhook) {
        try {
          new URL(url);
          return true; // Valid URL format, assume healthy for external webhooks
        } catch {
          return false; // Invalid URL format
        }
      } else {
        // For local webhooks, check the /api/health endpoint
        const envTimeout = process.env.NEXT_PUBLIC_TIMEOUT;
        let timeoutMs = 10000; // Default to 10 seconds for health checks
        if (envTimeout) {
          const parsedTimeout = parseInt(envTimeout);
          if (!isNaN(parsedTimeout) && parsedTimeout >= 1000 && parsedTimeout <= 120000) {
            timeoutMs = Math.max(parsedTimeout / 3, 5000); // Third of main timeout, min 5 seconds
          }
        }
        
        const baseUrl = new URL(url).origin;
        const response = await axios.get(`${baseUrl}/api/health`, {
          timeout: timeoutMs,
        });
        return response.status === 200;
      }
    } catch (error) {
      return false;
    }
  }
}

export const webhookClient = new WebhookClient();