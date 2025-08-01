import { Request, Response } from 'express';

import axios from 'axios';
import { onRequest } from 'firebase-functions/v2/https';

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
    destination?: string; // Target AI service/model for this message
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
    source?: string;
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
  
  // Optional destination field validation
  if (body.message.destination && typeof body.message.destination !== 'string') {
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

// Get region from environment variable or default to Europe North
const deployRegion = process.env.FUNCTIONS_REGION || 'us-central1';

export const webhookSend = onRequest({
  cors: true,
  region: deployRegion,
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
      
      const extractContent = (obj: any): { content: string | null; source: string | null } => {
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

        const extractFromObject = (obj: any): { content: string | null; source: string | null } => {
          let content: string | null = null;
          let source: string | null = null;
          
          // First, check for direct source field
          if (obj.source && typeof obj.source === 'string') {
            source = obj.source.trim();
          }
          
          // Then, look for content in common fields
          const contentKeys = ['output', 'message', 'content', 'text', 'response', 'data', 'result'];
          for (const key of contentKeys) {
            if (obj[key] && typeof obj[key] === 'string' && obj[key].trim().length > 0) {
              const trimmedValue = obj[key].trim();
              
              // If it's HTML content, try to extract text content
              if (isHtmlContent(trimmedValue)) {
                const sanitized = sanitizeString(trimmedValue);
                if (sanitized.length > 0 && !isHtmlContent(sanitized)) {
                  console.log(`Extracted text from HTML content in key "${key}"`);
                  content = sanitized;
                  break;
                }
                continue;
              }
              
              console.log(`Extracted bot response from key "${key}"`);
              content = trimmedValue;
              break;
            }
          }
          
          return { content, source };
        };

        if (typeof obj === 'string') {
          const trimmedStr = obj.trim();
          if (trimmedStr.length === 0) {
            return { content: null, source: null };
          }
          
          // Try to parse as JSON first - if successful, extract the content and source
          if (trimmedStr.startsWith('{') || trimmedStr.startsWith('[')) {
            try {
              const parsed = JSON.parse(trimmedStr);
              
              // If it's a JSON array, try first element
              if (Array.isArray(parsed) && parsed.length > 0) {
                if (typeof parsed[0] === 'object' && parsed[0] !== null) {
                  console.log('Extracted from JSON array object');
                  return extractFromObject(parsed[0]);
                } else if (typeof parsed[0] === 'string') {
                  console.log('Extracted content from JSON array string');
                  return { content: parsed[0].trim(), source: null };
                }
              }
              
              // If it's a JSON object, extract content and source
              if (typeof parsed === 'object' && parsed !== null) {
                console.log('Extracted from JSON object');
                return extractFromObject(parsed);
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
              return { content: sanitized, source: null };
            } else {
              console.log('Rejecting HTML content with no meaningful text');
              return { content: null, source: null };
            }
          }
          
          return { content: trimmedStr, source: null };
        }
        
        if (typeof obj === 'object' && obj !== null) {
          return extractFromObject(obj);
        }
        
        return { content: null, source: null };
      };

      if (response.data) {
        console.log("(webhook-send.ts) n8n response.data");
        console.log(response.data);
        let extracted: { content: string | null; source: string | null } = { content: null, source: null };
        
        // Handle array responses
        if (Array.isArray(response.data) && response.data.length > 0) {
          extracted = extractContent(response.data[0]);
        }
        // Handle direct responses
        else {
          extracted = extractContent(response.data);
        }
        
        if (extracted.content) {
          botMessage = {
            content: extracted.content,
            type: 'text' as const,
            source: extracted.source || undefined,
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