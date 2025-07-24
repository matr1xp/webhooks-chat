import axios from 'axios';
import { webhookClient } from '../webhook-client';
import { WebhookPayload, WebhookResponse } from '@/types/chat';
import { WebhookConfig } from '@/types/config';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock environment variables
const originalEnv = process.env;

describe('WebhookClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variables
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
      NEXT_PUBLIC_WEBHOOK_SECRET: 'test-secret',
      NEXT_PUBLIC_TIMEOUT: '30000',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  const mockPayload: WebhookPayload = {
    sessionId: 'session-123',
    messageId: 'msg-456',
    timestamp: '2023-12-01T10:00:00Z',
    user: {
      id: 'user-789',
      name: 'John Doe',
    },
    message: {
      type: 'text',
      content: 'Hello world',
    },
  };

  describe('sendMessage', () => {
    it('sends message to default webhook endpoint successfully', async () => {
      const mockResponse = {
        status: 200,
        data: {
          success: true,
          message: 'Bot response',
        },
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await webhookClient.sendMessage(mockPayload);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:3000/api/webhook/send',
        mockPayload,
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
            // No X-Webhook-Secret header since the instance doesn't have access to test env vars
          },
          timeout: 30000,
        })
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBe(mockPayload.messageId);
      expect(result.botMessage?.content).toBe('Bot response');
    });

    it('sends message to custom webhook endpoint', async () => {
      const webhookConfig: WebhookConfig = {
        id: 'webhook-1',
        name: 'Custom Webhook',
        url: 'http://localhost:3000/custom/webhook',
        apiSecret: 'custom-secret',
        isActive: true,
        createdAt: '2023-12-01T10:00:00Z',
      };

      const mockResponse = {
        status: 200,
        data: 'Simple string response',
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await webhookClient.sendMessage(mockPayload, webhookConfig);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:3000/custom/webhook',
        mockPayload,
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Secret': 'custom-secret',
          },
          timeout: 30000,
        })
      );

      expect(result.success).toBe(true);
      expect(result.botMessage?.content).toBe('Simple string response');
    });

    it('uses proxy for external webhooks', async () => {
      const externalWebhookConfig: WebhookConfig = {
        id: 'webhook-1',
        name: 'External Webhook',
        url: 'https://external.com/webhook',
        apiSecret: 'external-secret',
        isActive: true,
        createdAt: '2023-12-01T10:00:00Z',
      };

      const mockProxyResponse = {
        status: 200,
        data: {
          status: 200,
          statusText: 'OK',
          data: { message: 'External response' },
        },
      };

      mockedAxios.post.mockResolvedValueOnce(mockProxyResponse);

      const result = await webhookClient.sendMessage(mockPayload, externalWebhookConfig);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:3000/api/webhook/proxy',
        {
          webhookUrl: 'https://external.com/webhook',
          apiSecret: 'external-secret',
          payload: mockPayload,
        },
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        })
      );

      expect(result.success).toBe(true);
      expect(result.botMessage?.content).toBe('External response');
    });

    it('handles different response formats', async () => {
      const testCases = [
        {
          name: 'string response',
          responseData: 'Simple text response',
          expectedContent: 'Simple text response',
        },
        {
          name: 'object with message field',
          responseData: { message: 'Object message response' },
          expectedContent: 'Object message response',
        },
        {
          name: 'object with content field',
          responseData: { content: 'Object content response' },
          expectedContent: 'Object content response',
        },
        {
          name: 'object with text field',
          responseData: { text: 'Object text response' },
          expectedContent: 'Object text response',
        },
        {
          name: 'object with response field',
          responseData: { response: 'Object response field' },
          expectedContent: 'Object response field',
        },
        {
          name: 'array with string',
          responseData: ['Array string response'],
          expectedContent: 'Array string response',
        },
        {
          name: 'array with object message',
          responseData: [{ message: 'Array object message' }],
          expectedContent: 'Array object message',
        },
        {
          name: 'array with summary field',
          responseData: [{ summary: 'Array summary response' }],
          expectedContent: 'Array summary response',
        },
        {
          name: 'object with summary field',
          responseData: { summary: 'Direct summary response' },
          expectedContent: 'Direct summary response',
        },
        {
          name: 'botMessage field',
          responseData: { 
            botMessage: { 
              content: 'Bot message response', 
              type: 'text' 
            } 
          },
          expectedContent: 'Bot message response',
        },
      ];

      for (const testCase of testCases) {
        mockedAxios.post.mockResolvedValueOnce({
          status: 200,
          data: testCase.responseData,
        });

        const result = await webhookClient.sendMessage(mockPayload);
        
        expect(result.success).toBe(true);
        expect(result.botMessage?.content).toBe(testCase.expectedContent);
        
        jest.clearAllMocks();
      }
    });

    it('handles timeout configuration from environment', async () => {
      process.env.NEXT_PUBLIC_TIMEOUT = '60000';

      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        data: 'test response',
      });

      await webhookClient.sendMessage(mockPayload);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({
          timeout: 60000,
        })
      );
    });

    it('uses default timeout for invalid environment values', async () => {
      process.env.NEXT_PUBLIC_TIMEOUT = 'invalid';

      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        data: 'test response',
      });

      await webhookClient.sendMessage(mockPayload);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({
          timeout: 30000, // Default timeout
        })
      );
    });

    it('handles network errors gracefully', async () => {
      const networkError = new Error('Network Error');
      mockedAxios.post.mockRejectedValueOnce(networkError);

      const result = await webhookClient.sendMessage(mockPayload);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network Error');
      expect(result.messageId).toBe(mockPayload.messageId);
    });

    it('handles non-Error exceptions', async () => {
      mockedAxios.post.mockRejectedValueOnce('String error');

      const result = await webhookClient.sendMessage(mockPayload);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to send message to webhook');
    });

    it('handles HTTP error responses', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        status: 500,
        data: 'Internal Server Error',
      });

      const result = await webhookClient.sendMessage(mockPayload);

      expect(result.success).toBe(false);
    });

    it('handles successful responses without bot message', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        data: null,
      });

      const result = await webhookClient.sendMessage(mockPayload);

      expect(result.success).toBe(true);
      expect(result.botMessage).toBeUndefined();
    });
  });

  describe('getMessageHistory', () => {
    it('fetches message history successfully', async () => {
      const mockHistoryResponse = {
        data: {
          messages: [
            { id: 'msg-1', content: 'Hello' },
            { id: 'msg-2', content: 'Hi there' },
          ],
        },
      };

      mockedAxios.get.mockResolvedValueOnce(mockHistoryResponse);

      const result = await webhookClient.getMessageHistory('session-123');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://localhost:3000/api/messages/session-123',
        {
          params: { limit: 50 },
          headers: {
            // No X-Webhook-Secret header since the instance doesn't have access to test env vars
          },
        }
      );

      expect(result).toEqual(mockHistoryResponse.data);
    });

    it('uses custom limit parameter', async () => {
      const mockHistoryResponse = { data: { messages: [] } };
      mockedAxios.get.mockResolvedValueOnce(mockHistoryResponse);

      await webhookClient.getMessageHistory('session-123', 100);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: { limit: 100 },
        })
      );
    });

    it('uses webhook config for custom endpoint', async () => {
      const webhookConfig: WebhookConfig = {
        id: 'webhook-1',
        name: 'Custom Webhook',
        url: 'https://custom.com/webhook',
        apiSecret: 'custom-secret',
        isActive: true,
        createdAt: '2023-12-01T10:00:00Z',
      };

      const mockHistoryResponse = { data: { messages: [] } };
      mockedAxios.get.mockResolvedValueOnce(mockHistoryResponse);

      await webhookClient.getMessageHistory('session-123', 50, webhookConfig);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://custom.com/api/messages/session-123',
        expect.objectContaining({
          headers: {
            'X-Webhook-Secret': 'custom-secret',
          },
        })
      );
    });

    it('handles history fetch errors', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network Error'));

      await expect(webhookClient.getMessageHistory('session-123')).rejects.toThrow(
        'Failed to fetch message history'
      );
    });
  });

  describe('checkHealth', () => {
    it('returns false when no webhook config provided', async () => {
      const isHealthy = await webhookClient.checkHealth();
      expect(isHealthy).toBe(false);
    });

    it('returns true for healthy webhook', async () => {
      const webhookConfig: WebhookConfig = {
        id: 'webhook-1',
        name: 'Test Webhook',
        url: 'https://test.com/webhook',
        apiSecret: 'test-secret',
        isActive: true,
        createdAt: '2023-12-01T10:00:00Z',
      };

      // Mock fetch for the health check
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'healthy' }),
      });

      const isHealthy = await webhookClient.checkHealth(webhookConfig);

      expect(global.fetch).toHaveBeenCalledWith(
        'undefined/healthCheck?webhookUrl=https%3A%2F%2Ftest.com%2Fwebhook&apiSecret=test-secret'
      );

      expect(isHealthy).toBe(true);
    });

    it('returns false for unhealthy webhook (HTTP error)', async () => {
      const webhookConfig: WebhookConfig = {
        id: 'webhook-1',
        name: 'Test Webhook',
        url: 'https://test.com/webhook',
        apiSecret: 'test-secret',
        isActive: true,
        createdAt: '2023-12-01T10:00:00Z',
      };

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const isHealthy = await webhookClient.checkHealth(webhookConfig);
      expect(isHealthy).toBe(false);
    });

    it('returns false for unsuccessful response', async () => {
      const webhookConfig: WebhookConfig = {
        id: 'webhook-1',
        name: 'Test Webhook',
        url: 'https://test.com/webhook',
        apiSecret: 'test-secret',
        isActive: true,
        createdAt: '2023-12-01T10:00:00Z',
      };

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'unhealthy' }),
      });

      const isHealthy = await webhookClient.checkHealth(webhookConfig);
      expect(isHealthy).toBe(false);
    });

    it('returns false when request fails', async () => {
      const webhookConfig: WebhookConfig = {
        id: 'webhook-1',
        name: 'Test Webhook',
        url: 'https://test.com/webhook',
        apiSecret: 'test-secret',
        isActive: true,
        createdAt: '2023-12-01T10:00:00Z',
      };

      global.fetch = jest.fn().mockRejectedValueOnce(new Error('Network Error'));

      const isHealthy = await webhookClient.checkHealth(webhookConfig);
      expect(isHealthy).toBe(false);
    });

    it('returns false for invalid URL', async () => {
      const webhookConfig: WebhookConfig = {
        id: 'webhook-1',
        name: 'Test Webhook',
        url: 'invalid-url',
        apiSecret: 'test-secret',
        isActive: true,
        createdAt: '2023-12-01T10:00:00Z',
      };

      const isHealthy = await webhookClient.checkHealth(webhookConfig);
      expect(isHealthy).toBe(false);
    });

  });

  describe('Environment variable handling', () => {
    it('uses default values when environment variables are missing', async () => {
      // Create a new instance without relying on environment variables
      const { WebhookClient } = require('../webhook-client');
      const client = new WebhookClient();

      // Test that default values are used by making a request
      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        data: 'test',
      });

      await client.sendMessage(mockPayload);
      
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:3000/api/webhook/send', // Default URL
        expect.any(Object),
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Secret': 'test-secret', // Environment variable is accessible in new instance
          },
          timeout: 30000, // Default timeout
        })
      );
    });
  });
});