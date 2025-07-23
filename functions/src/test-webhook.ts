import { onRequest } from 'firebase-functions/v2/https';
import { Request, Response } from 'express';
import cors from 'cors';
import axios from 'axios';

// Initialize CORS
const corsHandler = cors({ origin: true });

export const testWebhook = onRequest({
  cors: true,
}, async (req: Request, res: Response) => {
  return corsHandler(req, res, async () => {
    if (req.method !== 'POST') {
      res.status(405).json({
        success: false,
        error: 'Method not allowed'
      });
      return;
    }

    try {
      const { url: customUrl, secret: customSecret, healthCheck } = req.body || {};
      const isHealthCheck = healthCheck === true;
      
      // Use custom URL if provided, otherwise fall back to environment variable
      let n8nWebhookUrl = customUrl || process.env.N8N_WEBHOOK_URL;
      
      if (!n8nWebhookUrl) {
        res.status(400).json({
          success: false,
          error: 'No webhook URL provided and N8N_WEBHOOK_URL not configured'
        });
        return;
      }

      // Validate URL to prevent SSRF attacks
      try {
        const parsedUrl = new URL(n8nWebhookUrl);
        
        // Verify protocol is http or https
        if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
          res.status(400).json({
            success: false,
            error: 'Invalid URL protocol. Only http and https are allowed.'
          });
          return;
        }

        // If using custom URL, validate domain
        if (customUrl) {
          const allowedDomains = ['n8n.ml1.app']; // add your allowed domains here
          if (!allowedDomains.includes(parsedUrl.hostname)) {
            res.status(400).json({
              success: false,
              error: 'Domain not allowed for custom URLs'
            });
            return;
          }
        }

        // Use the validated URL
        n8nWebhookUrl = parsedUrl.href;
      } catch (error) {
        res.status(400).json({
          success: false,
          error: 'Invalid URL format'
        });
        return;
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
          'User-Agent': 'Chat-Interface-Test-Functions/1.0',
        };

        // Add webhook secret logic
        if (customSecret) {
          headers['X-Webhook-Secret'] = customSecret;
        } else if (!customUrl && process.env.WEBHOOK_SECRET) {
          headers['X-Webhook-Secret'] = process.env.WEBHOOK_SECRET;
        }

        // Get configurable timeout
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

        res.json({
          success: true,
          status: response.status,
          statusText: response.statusText,
          data: response.data,
          message: 'Webhook test successful!',
        });
        return;

      } catch (error: any) {
        console.error('Webhook test failed:', error.response?.data || error.message);
        
        res.status(400).json({
          success: false,
          error: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          url: n8nWebhookUrl,
          isCustomUrl: !!customUrl,
        });
        return;
      }

    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Test endpoint error',
        details: error.message
      });
      return;
    }
  });
});