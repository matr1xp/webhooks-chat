import { onRequest } from 'firebase-functions/v2/https';
import { Request, Response } from 'express';
import cors from 'cors';
import axios from 'axios';

// Initialize CORS
const corsHandler = cors({ origin: true });

// Get region from environment variable or default to Europe North  
const deployRegion = process.env.FIREBASE_FUNCTIONS_REGION || 'us-central1';

export const healthCheck = onRequest({
  cors: true,
  region: deployRegion,
}, async (req: Request, res: Response) => {
  return corsHandler(req, res, async () => {
    if (req.method === 'GET') {
      handleGetHealthCheck(req, res);
      return;
    } else if (req.method === 'POST') {
      handlePostHealthCheck(req, res);
      return;
    } else {
      res.status(405).json({
        status: 'error',
        error: 'Method not allowed'
      });
      return;
    }
  });
});

async function handleGetHealthCheck(req: Request, res: Response): Promise<void> {
  try {
    const checks = {
      api: true,
      n8nWebhook: false,
      timestamp: new Date().toISOString(),
    };

    // Check n8n webhook availability
    const webhookUrl = req.query.webhookUrl as string || process.env.N8N_WEBHOOK_URL;
    const apiSecret = req.query.apiSecret as string || process.env.WEBHOOK_SECRET;
    const skipExternalHealthCheck = process.env.SKIP_EXTERNAL_HEALTH_CHECK === 'true';
    
    if (webhookUrl && !skipExternalHealthCheck) {
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'User-Agent': 'Chat-Interface-Health-Functions/1.0',
        };

        if (apiSecret) {
          headers['X-Webhook-Secret'] = apiSecret;
        }

        // Get configurable timeout
        let timeoutMs = 5000;
        if (process.env.TIMEOUT) {
          const parsedTimeout = parseInt(process.env.TIMEOUT);
          if (!isNaN(parsedTimeout) && parsedTimeout >= 1000 && parsedTimeout <= 120000) {
            timeoutMs = Math.min(parsedTimeout / 2, 5000);
          }
        }

        // Skip sending actual requests to webhook in health check mode
        // This prevents interference with production chat workflows
        const skipExternalHealthCheckOverride = process.env.SKIP_EXTERNAL_HEALTH_CHECK === 'true';
        
        if (skipExternalHealthCheckOverride) {
          // Just validate URL format instead of making actual request
          try {
            new URL(webhookUrl);
            checks.n8nWebhook = true;
          } catch {
            checks.n8nWebhook = false;
          }
        } else {
          const response = await axios.post(webhookUrl, 
            { message: "__health_check__" },
            { 
              headers,
              timeout: timeoutMs,
            }
          );
          
          checks.n8nWebhook = response.status >= 200 && response.status < 300;
        }
      } catch (error: any) {
        checks.n8nWebhook = false;
      }
    } else if (webhookUrl && skipExternalHealthCheck) {
      try {
        new URL(webhookUrl);
        checks.n8nWebhook = true;
      } catch {
        checks.n8nWebhook = false;
      }
    }

    const isHealthy = checks.api && checks.n8nWebhook;

    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      checks,
      version: '1.0.0',
    });
    return;
  } catch (error: any) {
    console.error('Health check error:', error.message);
    
    res.status(500).json({
      status: 'error',
      error: 'Health check failed',
      timestamp: new Date().toISOString(),
    });
    return;
  }
}

async function handlePostHealthCheck(req: Request, res: Response): Promise<void> {
  try {
    const { url: webhookUrl, secret: apiSecret } = req.body;

    if (!webhookUrl) {
      res.status(400).json({
        status: 'error',
        message: 'Webhook URL is required'
      });
      return;
    }

    const skipExternalHealthCheck = process.env.SKIP_EXTERNAL_HEALTH_CHECK === 'true';
    
    if (skipExternalHealthCheck) {
      try {
        new URL(webhookUrl);
        res.json({
          status: 'healthy',
          message: 'URL format is valid (external checks disabled)',
        });
        return;
      } catch {
        res.status(400).json({
          status: 'error',
          message: 'Invalid URL format'
        });
        return;
      }
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Chat-Interface-Health-Functions/1.0',
    };

    if (apiSecret) {
      headers['X-Webhook-Secret'] = apiSecret;
    }

    let timeoutMs = 5000;
    if (process.env.TIMEOUT) {
      const parsedTimeout = parseInt(process.env.TIMEOUT);
      if (!isNaN(parsedTimeout) && parsedTimeout >= 1000 && parsedTimeout <= 120000) {
        timeoutMs = Math.min(parsedTimeout / 2, 5000);
      }
    }

    try {
      // Don't send actual health check message to avoid interfering with production
      // Just validate URL format for POST health checks
      const response = await axios.post(webhookUrl, 
        { message: "__health_check__" },
        { 
          headers,
          timeout: timeoutMs,
        }
      );
      
      const isHealthy = response.status >= 200 && response.status < 300;
      
      res.json({
        status: isHealthy ? 'healthy' : 'unhealthy',
        message: isHealthy ? 'Webhook is responding' : 'Webhook returned error status',
        statusCode: response.status,
      });
      return;
      
    } catch (error: any) {
      let message = 'Webhook test failed';
      
      if (error.code === 'ECONNABORTED') {
        message = 'Webhook request timed out';
      } else if (error.response) {
        message = `Webhook returned ${error.response.status}`;
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        message = 'Cannot reach webhook URL';
      }
      
      res.status(503).json({ status: 'error', message });
      return;
    }
    
  } catch (error: any) {
    console.error('Webhook test error:', error.message);
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to test webhook'
    });
    return;
  }
}