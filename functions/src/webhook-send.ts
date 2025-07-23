import { onRequest } from 'firebase-functions/v2/https';
import { Request, Response } from 'express';
import axios from 'axios';

// Types
interface WebhookPayload {
  sessionId: string;
  messageId: string;
  timestamp: string;
  user: {
    id: string;
    name?: string;
  };
  message: {
    type: 'text' | 'file' | 'image';
    content: string;
    file?: {
      name: string;
      size: number;
      type: string;
      data: string; // Base64 encoded file data
    };
  };
  context?: {
    source: 'web' | 'mobile';
  };
  // Optional webhook configuration for user-specific webhooks
  webhookUrl?: string;
  webhookSecret?: string;
}

interface WebhookResponse {
  success: boolean;
  messageId: string;
  timestamp: string;
  botMessage?: {
    content: string;
    type: 'text';
    metadata?: any;
  };
  error?: string;
}

// Validation function (simplified version of Zod validation)
function validateWebhookPayload(body: any): WebhookPayload | null {
  if (
    !body ||
    typeof body.sessionId !== 'string' ||
    typeof body.messageId !== 'string' ||
    typeof body.timestamp !== 'string' ||
    !body.user ||
    typeof body.user.id !== 'string' ||
    !body.message ||
    typeof body.message.content !== 'string' ||
    !['text', 'file', 'image'].includes(body.message.type)
  ) {
    return null;
  }
  
  // Optional file data validation
  if (body.message.file) {
    if (
      typeof body.message.file.name !== 'string' ||
      typeof body.message.file.size !== 'number' ||
      typeof body.message.file.type !== 'string' ||
      typeof body.message.file.data !== 'string'
    ) {
      return null;
    }
  }
  
  // Optional webhook configuration validation
  if (body.webhookUrl && typeof body.webhookUrl !== 'string') {
    return null;
  }
  if (body.webhookSecret && typeof body.webhookSecret !== 'string') {
    return null;
  }
  
  return body as WebhookPayload;
}

export const webhookSend = onRequest({
  cors: true,
}, async (req: Request, res: Response) => {
  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      res.status(405).json({
        success: false,
        error: 'Method not allowed'
      });
      return;
    }

    // Validate payload
    const originalPayload = validateWebhookPayload(req.body);
    if (!originalPayload) {
      res.status(400).json({
        success: false,
        error: 'Invalid payload format'
      });
      return;
    }

    // Verify webhook secret if provided
    // Priority: payload webhookSecret > environment WEBHOOK_SECRET
    const expectedSecret = originalPayload.webhookSecret || process.env.WEBHOOK_SECRET;
    if (expectedSecret) {
      const providedSecret = req.headers['x-webhook-secret'] as string;
      if (providedSecret !== expectedSecret) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
        return;
      }
    }

    // Create payload for n8n webhook with proper message structure
    const n8nPayload = {
      sessionId: originalPayload.sessionId,
      messageId: originalPayload.messageId,
      timestamp: originalPayload.timestamp,
      user: originalPayload.user,
      message: originalPayload.message,
      context: originalPayload.context
    };

    // Get n8n webhook URL from payload or environment
    // Priority: payload webhookUrl > environment N8N_WEBHOOK_URL
    const n8nWebhookUrl = originalPayload.webhookUrl || process.env.N8N_WEBHOOK_URL;
    
    console.log('Sending message to n8n webhook:', {
      messageContent: originalPayload.message.content,
      webhookUrl: n8nWebhookUrl ? 'configured' : 'not configured',
      source: originalPayload.webhookUrl ? 'user configuration' : 'environment variable'
    });
    if (!n8nWebhookUrl) {
      console.error('No webhook URL provided in payload and N8N_WEBHOOK_URL not configured in environment');
      res.status(500).json({
        success: false,
        error: 'Webhook URL not configured'
      });
      return;
    }


    try {
      // Prepare headers for n8n webhook
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'Chat-Interface-Functions/1.0',
      };

      // Add webhook secret if provided from payload or environment
      // Priority: payload webhookSecret > environment WEBHOOK_SECRET
      const webhookSecret = originalPayload.webhookSecret || process.env.WEBHOOK_SECRET;
      if (webhookSecret) {
        headers['X-Webhook-Secret'] = webhookSecret;
      }

      // Get configurable timeout
      let timeoutMs = 10000;
      if (process.env.TIMEOUT) {
        const parsedTimeout = parseInt(process.env.TIMEOUT);
        if (!isNaN(parsedTimeout) && parsedTimeout >= 1000 && parsedTimeout <= 120000) {
          timeoutMs = parsedTimeout;
        }
      }

      // Send to n8n webhook
      const response = await axios.post(n8nWebhookUrl, n8nPayload, {
        headers,
        timeout: timeoutMs,
      });

      // Extract bot message from n8n response
      let botMessage;
      
      const extractStringValue = (obj: any): string | null => {
        if (typeof obj === 'string') {
          return obj;
        }
        
        if (typeof obj === 'object' && obj !== null) {
          for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'string' && value.trim().length > 0) {
              console.log(`Extracted bot response from key "${key}"`);
              return value;
            }
          }
        }
        
        return null;
      };

      if (response.data) {
        let extractedContent: string | null = null;
        
        // Handle array responses
        if (Array.isArray(response.data) && response.data.length > 0) {
          extractedContent = extractStringValue(response.data[0]);
        }
        // Handle direct responses
        else {
          extractedContent = extractStringValue(response.data);
        }
        
        if (extractedContent) {
          botMessage = {
            content: extractedContent,
            type: 'text' as const,
            metadata: { originalResponse: response.data },
          };
        }
      }

      // Return success response
      const webhookResponse: WebhookResponse = {
        success: true,
        messageId: originalPayload.messageId,
        timestamp: new Date().toISOString(),
        botMessage,
      };

      res.status(200).json(webhookResponse);
    } catch (webhookError: any) {
      console.error('n8n webhook error details:', {
        message: webhookError.message,
        status: webhookError.response?.status,
        statusText: webhookError.response?.statusText,
        data: webhookError.response?.data,
        url: n8nWebhookUrl,
      });
      
      let errorMessage = 'Failed to deliver message to n8n workflow';
      
      if (webhookError.response?.status === 403) {
        errorMessage = 'Access denied - check n8n webhook authentication and permissions';
      } else if (webhookError.response?.status === 404) {
        errorMessage = 'Webhook not found - verify the URL and ensure the workflow is active';
      } else if (webhookError.response?.status === 401) {
        errorMessage = 'Unauthorized - check webhook authentication credentials';
      }
      
      const webhookResponse: WebhookResponse = {
        success: false,
        messageId: originalPayload.messageId,
        timestamp: new Date().toISOString(),
        error: errorMessage,
      };

      res.status(500).json(webhookResponse);
      return;
    }
  } catch (error: any) {
    console.error('Webhook function error:', error.message);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString(),
    });
    return;
  }
});