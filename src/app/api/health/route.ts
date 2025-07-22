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
    // Use webhook config from query params if provided, otherwise fall back to env vars
    const url = new URL(request.url);
    const webhookUrl = url.searchParams.get('webhookUrl') || process.env.N8N_WEBHOOK_URL;
    const apiSecret = url.searchParams.get('apiSecret') || process.env.WEBHOOK_SECRET;
    const skipExternalHealthCheck = process.env.SKIP_EXTERNAL_HEALTH_CHECK === 'true';
    
    
    if (webhookUrl && !skipExternalHealthCheck) {
      try {
        // Prepare headers for health check (same as test-webhook)
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'User-Agent': 'Chat-Interface-Health/1.0',
        };

        // Add X-Webhook-Secret header if provided
        if (apiSecret) {
          headers['X-Webhook-Secret'] = apiSecret;
        }

        // Get configurable timeout (same logic as test-webhook)
        let timeoutMs = 5000; // Default 5 seconds for health checks
        if (process.env.TIMEOUT) {
          const parsedTimeout = parseInt(process.env.TIMEOUT);
          if (!isNaN(parsedTimeout) && parsedTimeout >= 1000 && parsedTimeout <= 120000) {
            timeoutMs = Math.min(parsedTimeout / 2, 5000); // Half of main timeout, max 5 seconds
          }
        }

        // Use same approach as test-webhook - simple POST request
        const response = await axios.post(webhookUrl, 
          { message: "__health_check__" }, // Same payload as test-webhook
          { 
            headers,
            timeout: timeoutMs,
            // Don't use validateStatus - let axios handle normal HTTP responses
          }
        );
        
        // Simple success check - any 2xx response means healthy (same as test-webhook)
        checks.n8nWebhook = response.status >= 200 && response.status < 300;
      } catch (error: any) {
        
        // Simple failure handling - any error means unhealthy (same as test-webhook)
        checks.n8nWebhook = false;
      }
    } else if (webhookUrl && skipExternalHealthCheck) {
      // If external health checks are disabled, just validate URL format
      try {
        new URL(webhookUrl);
        checks.n8nWebhook = true; // Assume healthy if URL is valid
      } catch {
        checks.n8nWebhook = false; // Invalid URL format
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

// Test specific webhook (POST request)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url: webhookUrl, secret: apiSecret } = body;

    if (!webhookUrl) {
      return NextResponse.json(
        { status: 'error', message: 'Webhook URL is required' },
        { status: 400 }
      );
    }

    const skipExternalHealthCheck = process.env.SKIP_EXTERNAL_HEALTH_CHECK === 'true';
    
    if (skipExternalHealthCheck) {
      // Just validate URL format if external checks are disabled
      try {
        new URL(webhookUrl);
        return NextResponse.json({
          status: 'healthy',
          message: 'URL format is valid (external checks disabled)',
        });
      } catch {
        return NextResponse.json(
          { status: 'error', message: 'Invalid URL format' },
          { status: 400 }
        );
      }
    }

    // Prepare headers for webhook test
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Chat-Interface-Health/1.0',
    };

    // Add X-Webhook-Secret header if provided
    if (apiSecret) {
      headers['X-Webhook-Secret'] = apiSecret;
    }

    // Get configurable timeout
    let timeoutMs = 5000; // Default 5 seconds for health checks
    if (process.env.TIMEOUT) {
      const parsedTimeout = parseInt(process.env.TIMEOUT);
      if (!isNaN(parsedTimeout) && parsedTimeout >= 1000 && parsedTimeout <= 120000) {
        timeoutMs = Math.min(parsedTimeout / 2, 5000); // Half of main timeout, max 5 seconds
      }
    }

    try {
      // Test the webhook with a health check message
      const response = await axios.post(webhookUrl, 
        { message: "__health_check__" },
        { 
          headers,
          timeout: timeoutMs,
        }
      );
      
      // Check if response is successful
      const isHealthy = response.status >= 200 && response.status < 300;
      
      return NextResponse.json({
        status: isHealthy ? 'healthy' : 'unhealthy',
        message: isHealthy ? 'Webhook is responding' : 'Webhook returned error status',
        statusCode: response.status,
      });
      
    } catch (error: any) {
      let message = 'Webhook test failed';
      
      if (error.code === 'ECONNABORTED') {
        message = 'Webhook request timed out';
      } else if (error.response) {
        message = `Webhook returned ${error.response.status}`;
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        message = 'Cannot reach webhook URL';
      }
      
      return NextResponse.json(
        { status: 'error', message },
        { status: 503 }
      );
    }
    
  } catch (error: any) {
    console.error('Webhook test error:', error.message);
    
    return NextResponse.json(
      { status: 'error', message: 'Failed to test webhook' },
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}