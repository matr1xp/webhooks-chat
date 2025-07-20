import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: NextRequest) {
  try {
    const checks = {
      api: true,
      n8nWebhook: false,
      timestamp: new Date().toISOString(),
    };

    // Check n8n webhook availability
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
    if (n8nWebhookUrl) {
      try {
        // Prepare headers for health check
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        // Add X-Webhook-Secret header if provided
        const webhookSecret = process.env.WEBHOOK_SECRET;
        if (webhookSecret) {
          headers['X-Webhook-Secret'] = webhookSecret;
        }

        // Get configurable timeout (default to 5 seconds for health check, half of main timeout)
        let timeoutMs = 5000;
        if (process.env.TIMEOUT) {
          const parsedTimeout = parseInt(process.env.TIMEOUT);
          if (!isNaN(parsedTimeout) && parsedTimeout >= 1000 && parsedTimeout <= 120000) {
            timeoutMs = Math.max(parsedTimeout / 2, 1000); // Half of main timeout, min 1 second
          }
        }

        // Use HEAD request for health check - no body payload, minimal impact
        const response = await axios.head(n8nWebhookUrl, { 
          headers: {
            ...(process.env.WEBHOOK_SECRET && { 'X-Webhook-Secret': process.env.WEBHOOK_SECRET })
          },
          timeout: timeoutMs,
          validateStatus: (status) => status < 500 // Accept 2xx, 3xx, 4xx as "reachable"
        });
        checks.n8nWebhook = true;
      } catch (error: any) {
        // If it's a network error (connection refused, timeout), mark as down
        // If it's a 4xx error (like 404), the server is reachable but webhook might be inactive
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
          checks.n8nWebhook = false;
        } else {
          // Server responded (even with error), so it's reachable
          checks.n8nWebhook = true;
        }
      }
    }

    const isHealthy = checks.api && checks.n8nWebhook;

    return NextResponse.json(
      {
        status: isHealthy ? 'healthy' : 'unhealthy',
        checks,
        version: '1.0.0',
      },
      { status: isHealthy ? 200 : 503 }
    );
  } catch (error: any) {
    console.error('Health check error:', error.message);
    
    return NextResponse.json(
      {
        status: 'error',
        error: 'Health check failed',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Handle preflight requests for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}