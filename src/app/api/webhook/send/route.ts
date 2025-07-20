import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { WebhookPayloadSchema } from '@/lib/validation';
import { WebhookResponse } from '@/types/chat';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();

    // Validate payload
    const validationResult = WebhookPayloadSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid payload format',
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const originalPayload = validationResult.data;

    // Verify webhook secret if provided (for internal auth check)
    const internalSecret = process.env.WEBHOOK_SECRET;
    if (internalSecret) {
      const providedSecret = request.headers.get('X-Webhook-Secret');
      if (providedSecret !== internalSecret) {
        return NextResponse.json(
          {
            success: false,
            error: 'Unauthorized',
          },
          { status: 401 }
        );
      }
    }

    // Create simple payload for n8n webhook - just the message content
    const simplePayload = {
      message: originalPayload.message.content
    };

    // Get n8n webhook URL
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
    if (!n8nWebhookUrl) {
      console.error('N8N_WEBHOOK_URL not configured');
      return NextResponse.json(
        {
          success: false,
          error: 'Webhook URL not configured',
        },
        { status: 500 }
      );
    }

    try {
      // Prepare headers for n8n webhook
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'Chat-Interface/1.0',
      };

      // Add X-Webhook-Secret header if provided
      const webhookSecret = process.env.WEBHOOK_SECRET;
      if (webhookSecret) {
        headers['X-Webhook-Secret'] = webhookSecret;
      }


      // Get configurable timeout (default to 10 seconds, min 1 second, max 120 seconds)
      let timeoutMs = 10000;
      if (process.env.TIMEOUT) {
        const parsedTimeout = parseInt(process.env.TIMEOUT);
        if (!isNaN(parsedTimeout) && parsedTimeout >= 1000 && parsedTimeout <= 120000) {
          timeoutMs = parsedTimeout;
        }
      }

      // Send to n8n webhook with simple payload
      const response = await axios.post(n8nWebhookUrl, simplePayload, {
        headers,
        timeout: timeoutMs,
      });


      // Extract bot message from n8n response
      let botMessage;
      if (response.data) {
        // Handle array responses (e.g., [{ "summary": "text" }])
        if (Array.isArray(response.data) && response.data.length > 0) {
          const firstItem = response.data[0];
          if (firstItem.summary) {
            botMessage = {
              content: firstItem.summary,
              type: firstItem.type || 'text' as const,
              metadata: firstItem.metadata,
            };
          } else if (firstItem.message) {
            botMessage = {
              content: firstItem.message,
              type: firstItem.type || 'text' as const,
              metadata: firstItem.metadata,
            };
          } else if (firstItem.response) {
            botMessage = {
              content: firstItem.response,
              type: firstItem.type || 'text' as const,
              metadata: firstItem.metadata,
            };
          } else if (firstItem.content) {
            botMessage = {
              content: firstItem.content,
              type: firstItem.type || 'text' as const,
              metadata: firstItem.metadata,
            };
          } else if (typeof firstItem === 'string') {
            botMessage = {
              content: firstItem,
              type: 'text' as const,
            };
          }
        }
        // Handle direct string response
        else if (typeof response.data === 'string') {
          botMessage = {
            content: response.data,
            type: 'text' as const,
          };
        } 
        // Handle object responses
        else if (response.data.summary) {
          botMessage = {
            content: response.data.summary,
            type: response.data.type || 'text' as const,
            metadata: response.data.metadata,
          };
        } else if (response.data.message) {
          botMessage = {
            content: response.data.message,
            type: response.data.type || 'text' as const,
            metadata: response.data.metadata,
          };
        } else if (response.data.response) {
          botMessage = {
            content: response.data.response,
            type: response.data.type || 'text' as const,
            metadata: response.data.metadata,
          };
        } else if (response.data.content) {
          botMessage = {
            content: response.data.content,
            type: response.data.type || 'text' as const,
            metadata: response.data.metadata,
          };
        }
      }

      // Return success response with bot message
      const webhookResponse: WebhookResponse = {
        success: true,
        messageId: originalPayload.messageId,
        timestamp: new Date().toISOString(),
        botMessage,
      };

      return NextResponse.json(webhookResponse, { status: 200 });
    } catch (webhookError: any) {
      console.error('n8n webhook error details:', {
        message: webhookError.message,
        status: webhookError.response?.status,
        statusText: webhookError.response?.statusText,
        data: webhookError.response?.data,
        url: n8nWebhookUrl,
      });
      
      let errorMessage = 'Failed to deliver message to n8n workflow';
      
      // Provide specific error messages based on status code
      if (webhookError.response?.status === 403) {
        errorMessage = 'Access denied - check n8n webhook authentication and permissions';
      } else if (webhookError.response?.status === 404) {
        errorMessage = 'Webhook not found - verify the URL and ensure the workflow is active';
      } else if (webhookError.response?.status === 401) {
        errorMessage = 'Unauthorized - check webhook authentication credentials';
      }
      
      // Return error response
      const webhookResponse: WebhookResponse = {
        success: false,
        messageId: originalPayload.messageId,
        timestamp: new Date().toISOString(),
        error: errorMessage,
      };

      return NextResponse.json(webhookResponse, { status: 500 });
    }
  } catch (error: any) {
    console.error('Webhook API error:', error.message);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Handle preflight requests for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Webhook-Secret',
    },
  });
}