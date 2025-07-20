import { NextRequest, NextResponse } from 'next/server';

// In a real application, you would fetch from a database
// For this demo, we'll return an empty array since messages are handled client-side
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    // Verify webhook secret if provided
    const webhookSecret = process.env.WEBHOOK_SECRET;
    if (webhookSecret) {
      const providedSecret = request.headers.get('X-Webhook-Secret');
      if (providedSecret !== webhookSecret) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    // In a real implementation, you would:
    // 1. Connect to your database
    // 2. Query messages for the given sessionId
    // 3. Apply pagination with the limit
    // 4. Return the messages
    
    // For this demo, return empty array
    const messages: any[] = [];

    return NextResponse.json({
      sessionId,
      messages,
      total: messages.length,
      limit,
    });
  } catch (error: any) {
    console.error('Messages API error:', error.message);
    
    return NextResponse.json(
      { error: 'Internal server error' },
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
      'Access-Control-Allow-Headers': 'Content-Type, X-Webhook-Secret',
    },
  });
}