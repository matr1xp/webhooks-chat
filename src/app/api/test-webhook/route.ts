import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: NextRequest) {
  try {
    // Parse request body to check for custom webhook URL and secret
    const body = await request.json().catch(() => ({}));
    const customUrl = body.url;
    const customSecret = body.secret;
    const isHealthCheck = body.healthCheck === true;
    
    // Use custom URL if provided, otherwise fall back to environment variable
    const n8nWebhookUrl = customUrl || process.env.N8N_WEBHOOK_URL;
    
    if (!n8nWebhookUrl) {
      return NextResponse.json(
        { error: 'No webhook URL provided and N8N_WEBHOOK_URL not configured' },
        { status: 400 }
      );
    }

    // Use minimal payload for health checks, test message for manual tests
    const testPayload = isHealthCheck ? {
      message: '__health_check__'
    } : {
      message: 'This is a test message from the chat interface'
    };


    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'Chat-Interface-Test/1.0',
      };

      // Add X-Webhook-Secret header only if explicitly provided for this webhook
      // Don't fall back to environment variable as each webhook may have different auth requirements
      if (customSecret) {
        headers['X-Webhook-Secret'] = customSecret;
      } else if (!customUrl && process.env.WEBHOOK_SECRET) {
        // Only use environment secret if testing the environment webhook URL
        headers['X-Webhook-Secret'] = process.env.WEBHOOK_SECRET;
      }

      // Get configurable timeout (shorter for health checks, default to 5 seconds for health checks, 10 seconds for tests)
      let timeoutMs = isHealthCheck ? 5000 : 10000;
      if (process.env.TIMEOUT) {
        const parsedTimeout = parseInt(process.env.TIMEOUT);
        if (!isNaN(parsedTimeout) && parsedTimeout >= 1000 && parsedTimeout <= 120000) {
          timeoutMs = isHealthCheck ? Math.min(parsedTimeout / 2, 5000) : parsedTimeout;
        }
      }

      const response = await axios.post(n8nWebhookUrl, testPayload, {
        headers,
        timeout: timeoutMs,
      });

      return NextResponse.json({
        success: true,
        status: response.status,
        statusText: response.statusText,
        data: response.data,
        message: 'Webhook test successful!',
      });

    } catch (error: any) {
      console.error('Webhook test failed:', error.response?.data || error.message);
      
      return NextResponse.json({
        success: false,
        error: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: n8nWebhookUrl,
        isCustomUrl: !!customUrl,
      }, { status: 400 });
    }

  } catch (error: any) {
    return NextResponse.json(
      { error: 'Test endpoint error', details: error.message },
      { status: 500 }
    );
  }
}