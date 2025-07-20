import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: NextRequest) {
  try {
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
    
    if (!n8nWebhookUrl) {
      return NextResponse.json(
        { error: 'N8N_WEBHOOK_URL not configured' },
        { status: 500 }
      );
    }

    // Get test type from query params
    const { searchParams } = new URL(request.url);
    const isHealthCheck = searchParams.get('healthCheck') === 'true';
    
    // Use empty payload for health checks, test message for manual tests
    const testPayload = isHealthCheck ? {} : {
      message: 'This is a test message from the chat interface'
    };


    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'Chat-Interface-Test/1.0',
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
      }, { status: 400 });
    }

  } catch (error: any) {
    return NextResponse.json(
      { error: 'Test endpoint error', details: error.message },
      { status: 500 }
    );
  }
}