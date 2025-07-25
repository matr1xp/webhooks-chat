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
        const isHtmlContent = (str: string): boolean => {
          // More robust HTML detection to avoid false positives on JSON strings
          const trimmed = str.trim();
          
          // First check if it's likely JSON (starts with { or [)
          if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
            return false;
          }
          
          // Check for actual HTML structure patterns, not just tag names
          const htmlStructureRegex = /<(html|head|body|!DOCTYPE)[^>]*>/i;
          const htmlTagRegex = /<([a-zA-Z][a-zA-Z0-9]*)\s*[^>]*>([\s\S]*?)<\/\1>/;
          
          // Look for actual HTML structure or properly formed tags
          return htmlStructureRegex.test(trimmed) || htmlTagRegex.test(trimmed);
        };

        const sanitizeString = (str: string): string => {
          // Remove HTML tags and decode HTML entities
          return str
            .replace(/<[^>]*>/g, '') // Remove HTML tags
            .replace(/&lt;/g, '<')   // Decode HTML entities
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#x27;/g, "'")
            .trim();
        };

        if (typeof obj === 'string') {
          const trimmedStr = obj.trim();
          if (trimmedStr.length === 0) {
            return null;
          }
          
          // Try to parse as JSON first - if successful, extract the content
          if (trimmedStr.startsWith('{') || trimmedStr.startsWith('[')) {
            try {
              const parsed = JSON.parse(trimmedStr);
              // If it's a JSON object with a message/content field, extract it
              if (typeof parsed === 'object' && parsed !== null) {
                const possibleKeys = ['message', 'content', 'text', 'response', 'data', 'result'];
                for (const key of possibleKeys) {
                  if (parsed[key] && typeof parsed[key] === 'string') {
                    console.log(`Extracted content from JSON field "${key}"`);
                    return parsed[key].trim();
                  }
                }
              }
              // If JSON array, try first element
              if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
                console.log('Extracted content from JSON array');
                return parsed[0].trim();
              }
            } catch (e) {
              // Not valid JSON, continue with regular processing
            }
          }
          
          // If it's HTML content, try to extract text content
          if (isHtmlContent(trimmedStr)) {
            const sanitized = sanitizeString(trimmedStr);
            // Only return if there's meaningful text content after sanitization
            if (sanitized.length > 0 && !isHtmlContent(sanitized)) {
              console.log('Extracted text from HTML content');
              return sanitized;
            } else {
              console.log('Rejecting HTML content with no meaningful text');
              return null;
            }
          }
          
          return trimmedStr;
        }
        
        if (typeof obj === 'object' && obj !== null) {
          for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'string' && value.trim().length > 0) {
              const trimmedValue = value.trim();
              
              // If it's HTML content, try to extract text content
              if (isHtmlContent(trimmedValue)) {
                const sanitized = sanitizeString(trimmedValue);
                // Only return if there's meaningful text content after sanitization
                if (sanitized.length > 0 && !isHtmlContent(sanitized)) {
                  console.log(`Extracted text from HTML content in key "${key}"`);
                  return sanitized;
                }
                // Skip this value if it's HTML without meaningful text
                continue;
              }
              
              console.log(`Extracted bot response from key "${key}"`);
              return trimmedValue;
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