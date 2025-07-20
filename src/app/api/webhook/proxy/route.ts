import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: NextRequest) {
  try {
    // Get the webhook URL and secret from the request body
    const body = await request.json();
    const { webhookUrl, apiSecret, payload } = body;

    if (!webhookUrl) {
      return NextResponse.json(
        { success: false, error: 'Webhook URL is required' },
        { status: 400 }
      );
    }

    // Get timeout from environment variable
    const envTimeout = process.env.TIMEOUT || process.env.NEXT_PUBLIC_TIMEOUT;
    let timeoutMs = 30000; // Default to 30 seconds
    if (envTimeout) {
      const parsedTimeout = parseInt(envTimeout);
      if (!isNaN(parsedTimeout) && parsedTimeout >= 1000 && parsedTimeout <= 120000) {
        timeoutMs = parsedTimeout;
      }
    }


    // Forward the request to the actual webhook
    const response = await axios.post(
      webhookUrl,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Chat-Interface-Proxy/1.0',
          ...(apiSecret && { 'X-Webhook-Secret': apiSecret }),
        },
        timeout: timeoutMs,
        // Don't throw on non-2xx status codes, let us handle them
        validateStatus: () => true,
      }
    );


    // Return the response from the webhook with CORS headers
    return NextResponse.json(
      {
        success: response.status >= 200 && response.status < 300,
        status: response.status,
        statusText: response.statusText,
        data: response.data,
        timestamp: new Date().toISOString(),
      },
      {
        status: 200, // Always return 200 to the client, embed actual status in response
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Webhook-Secret',
        },
      }
    );
  } catch (error) {
    console.error('Webhook proxy error:', error);

    // Handle axios errors
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Webhook request timed out',
            timeout: true,
          },
          { status: 200 } // Return 200 to avoid CORS issues
        );
      }
      
      if (error.response) {
        return NextResponse.json(
          {
            success: false,
            status: error.response.status,
            statusText: error.response.statusText,
            error: `Webhook responded with ${error.response.status}: ${error.response.statusText}`,
            data: error.response.data,
          },
          { status: 200 } // Return 200 to avoid CORS issues
        );
      }
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 200 } // Return 200 to avoid CORS issues
    );
  }
}

// Handle preflight requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Webhook-Secret',
    },
  });
}