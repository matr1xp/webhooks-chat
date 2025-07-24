"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testWebhook = void 0;
const https_1 = require("firebase-functions/v2/https");
const cors_1 = __importDefault(require("cors"));
const axios_1 = __importDefault(require("axios"));
// Initialize CORS
const corsHandler = (0, cors_1.default)({ origin: true });
exports.testWebhook = (0, https_1.onRequest)({
    cors: true,
}, async (req, res) => {
    return corsHandler(req, res, async () => {
        var _a, _b, _c, _d;
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
            }
            catch (error) {
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
                const headers = {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Chat-Interface-Test-Functions/1.0',
                };
                // Add webhook secret logic
                if (customSecret) {
                    headers['X-Webhook-Secret'] = customSecret;
                }
                else if (!customUrl && process.env.WEBHOOK_SECRET) {
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
                const response = await axios_1.default.post(n8nWebhookUrl, testPayload, {
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
            }
            catch (error) {
                console.error('Webhook test failed:', ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
                res.status(400).json({
                    success: false,
                    error: error.message,
                    status: (_b = error.response) === null || _b === void 0 ? void 0 : _b.status,
                    statusText: (_c = error.response) === null || _c === void 0 ? void 0 : _c.statusText,
                    data: (_d = error.response) === null || _d === void 0 ? void 0 : _d.data,
                    url: n8nWebhookUrl,
                    isCustomUrl: !!customUrl,
                });
                return;
            }
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: 'Test endpoint error',
                details: error.message
            });
            return;
        }
    });
});
//# sourceMappingURL=test-webhook.js.map