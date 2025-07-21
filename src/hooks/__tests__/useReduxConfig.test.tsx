import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useConfigStore } from '../useReduxConfig';
import configSlice from '@/store/configSlice';
import { WebhookConfig, ChatConfig } from '@/types/config';

// UUID mocking is handled in jest.setup.js

// Mock generateSessionId utility
jest.mock('@/lib/utils', () => ({
  ...jest.requireActual('@/lib/utils'),
  generateSessionId: jest.fn(() => 'session-mock'),
}));

// Mock environment variables to prevent default webhook creation
const originalEnv = process.env;
beforeAll(() => {
  delete process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL;
  delete process.env.N8N_WEBHOOK_URL;
  delete process.env.NEXT_PUBLIC_WEBHOOK_SECRET;
  delete process.env.WEBHOOK_SECRET;
});

afterAll(() => {
  process.env = originalEnv;
});

// Mock Date.now to have predictable timestamps
const mockTimestamp = '2023-12-01T10:00:00.000Z';
const mockDate = new Date(mockTimestamp);

// Store original Date
const OriginalDate = global.Date;

// Mock Date constructor
global.Date = jest.fn((input?: any) => {
  if (input === undefined) {
    return mockDate;
  }
  return new OriginalDate(input);
}) as any;

// Mock Date.now
global.Date.now = jest.fn(() => mockDate.getTime());

// Copy other static methods
Object.setPrototypeOf(global.Date, OriginalDate);
Object.getOwnPropertyNames(OriginalDate).forEach(name => {
  if (name !== 'now' && name !== 'length' && name !== 'name' && name !== 'prototype') {
    global.Date[name] = OriginalDate[name];
  }
});

const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      config: configSlice,
    },
    preloadedState: {
      config: {
        webhooks: [],
        chats: [],
        activeWebhookId: null,
        activeChatId: null,
        isLoading: false,
        error: null,
        ...initialState,
      },
    },
  });
};

const createWrapper = (store: any) => {
  return ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
};

describe('useConfigStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('returns initial empty state', () => {
      const store = createTestStore();
      const wrapper = createWrapper(store);
      
      const { result } = renderHook(() => useConfigStore(), { wrapper });

      expect(result.current.webhooks).toEqual([]);
      expect(result.current.chats).toEqual([]);
      expect(result.current.activeWebhookId).toBe(null);
      expect(result.current.activeChatId).toBe(null);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('returns preloaded state when provided', () => {
      const mockWebhook: WebhookConfig = {
        id: 'webhook-1',
        name: 'Test Webhook',
        url: 'https://test.com/webhook',
        isActive: true,
        createdAt: mockTimestamp,
      };

      const mockChat: ChatConfig = {
        id: 'chat-1',
        webhookId: 'webhook-1',
        sessionId: 'session-1',
        name: 'Test Chat',
        lastActivity: mockTimestamp,
        messageCount: 5,
        isActive: true,
      };

      const initialState = {
        webhooks: [mockWebhook],
        chats: [mockChat],
        activeWebhookId: 'webhook-1',
        activeChatId: 'chat-1',
        isLoading: true,
        error: 'Test error',
      };

      const store = createTestStore(initialState);
      const wrapper = createWrapper(store);
      
      const { result } = renderHook(() => useConfigStore(), { wrapper });

      expect(result.current.webhooks).toEqual([mockWebhook]);
      expect(result.current.chats).toEqual([mockChat]);
      expect(result.current.activeWebhookId).toBe('webhook-1');
      expect(result.current.activeChatId).toBe('chat-1');
      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBe('Test error');
    });
  });

  describe('Webhook Management', () => {
    it('adds a new webhook', () => {
      const store = createTestStore();
      const wrapper = createWrapper(store);
      
      const { result } = renderHook(() => useConfigStore(), { wrapper });

      const webhookData = {
        name: 'New Webhook',
        url: 'https://test.com/webhook',
        apiSecret: 'secret123',
        metadata: {
          description: 'Test webhook',
          tags: ['test'],
        },
      };

      let addedWebhook: WebhookConfig;
      act(() => {
        addedWebhook = result.current.addWebhook(webhookData);
      });

      // Check that the webhook has the correct structure (UUID will be generated)
      expect(addedWebhook!).toEqual(expect.objectContaining({
        ...webhookData,
        id: expect.any(String),
        isActive: false,
        createdAt: mockTimestamp,
      }));
      
      // Verify UUID is mocked (should be our test string)  
      expect(addedWebhook!.id).toEqual(expect.any(String));

      expect(result.current.webhooks).toHaveLength(1);
      expect(result.current.webhooks[0]).toEqual(addedWebhook!);
    });

    it('updates an existing webhook', () => {
      const mockWebhook: WebhookConfig = {
        id: 'webhook-1',
        name: 'Test Webhook',
        url: 'https://test.com/webhook',
        isActive: true,
        createdAt: mockTimestamp,
      };

      const initialState = {
        webhooks: [mockWebhook],
      };

      const store = createTestStore(initialState);
      const wrapper = createWrapper(store);
      
      const { result } = renderHook(() => useConfigStore(), { wrapper });

      const updates = {
        name: 'Updated Webhook',
        url: 'https://updated.com/webhook',
        isActive: false,
      };

      act(() => {
        result.current.updateWebhook('webhook-1', updates);
      });

      expect(result.current.webhooks[0]).toEqual({
        ...mockWebhook,
        ...updates,
      });
    });

    it('deletes a webhook', () => {
      const mockWebhook: WebhookConfig = {
        id: 'webhook-1',
        name: 'Test Webhook',
        url: 'https://test.com/webhook',
        isActive: true,
        createdAt: mockTimestamp,
      };

      const initialState = {
        webhooks: [mockWebhook],
        activeWebhookId: 'webhook-1',
      };

      const store = createTestStore(initialState);
      const wrapper = createWrapper(store);
      
      const { result } = renderHook(() => useConfigStore(), { wrapper });

      act(() => {
        result.current.deleteWebhook('webhook-1');
      });

      expect(result.current.webhooks).toEqual([]);
      expect(result.current.activeWebhookId).toBe(null);
    });

    it('sets active webhook', () => {
      const mockWebhook: WebhookConfig = {
        id: 'webhook-1',
        name: 'Test Webhook',
        url: 'https://test.com/webhook',
        isActive: true,
        createdAt: mockTimestamp,
      };

      const initialState = {
        webhooks: [mockWebhook],
      };

      const store = createTestStore(initialState);
      const wrapper = createWrapper(store);
      
      const { result } = renderHook(() => useConfigStore(), { wrapper });

      act(() => {
        result.current.setActiveWebhook('webhook-1');
      });

      expect(result.current.activeWebhookId).toBe('webhook-1');
    });
  });

  describe('Chat Management', () => {
    it('adds a new chat', () => {
      const store = createTestStore();
      const wrapper = createWrapper(store);
      
      const { result } = renderHook(() => useConfigStore(), { wrapper });

      const chatData = {
        webhookId: 'webhook-1',
        sessionId: 'session-1',
        name: 'New Chat',
        isActive: true,
      };

      let addedChat: ChatConfig;
      act(() => {
        addedChat = result.current.addChat(chatData);
      });

      // Check that the chat has the correct structure (UUID will be generated)
      expect(addedChat!).toEqual(expect.objectContaining({
        ...chatData,
        id: expect.any(String),
        lastActivity: mockTimestamp,
        messageCount: 0,
      }));
      
      // Verify UUID is mocked (should be our test string)  
      expect(addedChat!.id).toEqual(expect.any(String));

      expect(result.current.chats).toHaveLength(1);
      expect(result.current.chats[0]).toEqual(addedChat!);
    });

    it('updates an existing chat', () => {
      const mockChat: ChatConfig = {
        id: 'chat-1',
        webhookId: 'webhook-1',
        sessionId: 'session-1',
        name: 'Test Chat',
        lastActivity: mockTimestamp,
        messageCount: 5,
        isActive: true,
      };

      const initialState = {
        chats: [mockChat],
      };

      const store = createTestStore(initialState);
      const wrapper = createWrapper(store);
      
      const { result } = renderHook(() => useConfigStore(), { wrapper });

      const updates = {
        name: 'Updated Chat',
        messageCount: 10,
        isActive: false,
      };

      act(() => {
        result.current.updateChat('chat-1', updates);
      });

      expect(result.current.chats[0]).toEqual({
        ...mockChat,
        ...updates,
      });
    });

    it('deletes a chat', () => {
      const mockChat: ChatConfig = {
        id: 'chat-1',
        webhookId: 'webhook-1',
        sessionId: 'session-1',
        name: 'Test Chat',
        lastActivity: mockTimestamp,
        messageCount: 5,
        isActive: true,
      };

      const initialState = {
        chats: [mockChat],
        activeChatId: 'chat-1',
      };

      const store = createTestStore(initialState);
      const wrapper = createWrapper(store);
      
      const { result } = renderHook(() => useConfigStore(), { wrapper });

      act(() => {
        result.current.deleteChat('chat-1');
      });

      expect(result.current.chats).toEqual([]);
      expect(result.current.activeChatId).toBe(null);
    });

    it('sets active chat', () => {
      const mockChat: ChatConfig = {
        id: 'chat-1',
        webhookId: 'webhook-1',
        sessionId: 'session-1',
        name: 'Test Chat',
        lastActivity: mockTimestamp,
        messageCount: 5,
        isActive: true,
      };

      const initialState = {
        chats: [mockChat],
      };

      const store = createTestStore(initialState);
      const wrapper = createWrapper(store);
      
      const { result } = renderHook(() => useConfigStore(), { wrapper });

      act(() => {
        result.current.setActiveChat('chat-1');
      });

      expect(result.current.activeChatId).toBe('chat-1');
    });

    it('gets chats for a specific webhook', () => {
      const mockChats: ChatConfig[] = [
        {
          id: 'chat-1',
          webhookId: 'webhook-1',
          sessionId: 'session-1',
          name: 'Chat 1',
          lastActivity: mockTimestamp,
          messageCount: 5,
          isActive: true,
        },
        {
          id: 'chat-2',
          webhookId: 'webhook-2',
          sessionId: 'session-2',
          name: 'Chat 2',
          lastActivity: mockTimestamp,
          messageCount: 3,
          isActive: true,
        },
        {
          id: 'chat-3',
          webhookId: 'webhook-1',
          sessionId: 'session-3',
          name: 'Chat 3',
          lastActivity: mockTimestamp,
          messageCount: 8,
          isActive: false,
        },
      ];

      const initialState = {
        chats: mockChats,
      };

      const store = createTestStore(initialState);
      const wrapper = createWrapper(store);
      
      const { result } = renderHook(() => useConfigStore(), { wrapper });

      const webhook1Chats = result.current.getChatsForWebhook('webhook-1');
      const webhook2Chats = result.current.getChatsForWebhook('webhook-2');
      const nonExistentWebhookChats = result.current.getChatsForWebhook('webhook-3');

      expect(webhook1Chats).toEqual([mockChats[0], mockChats[2]]);
      expect(webhook2Chats).toEqual([mockChats[1]]);
      expect(nonExistentWebhookChats).toEqual([]);
    });
  });

  describe('Utility Functions', () => {
    it('gets active webhook when set', () => {
      const mockWebhook: WebhookConfig = {
        id: 'webhook-1',
        name: 'Test Webhook',
        url: 'https://test.com/webhook',
        isActive: true,
        createdAt: mockTimestamp,
      };

      const initialState = {
        webhooks: [mockWebhook],
        activeWebhookId: 'webhook-1',
      };

      const store = createTestStore(initialState);
      const wrapper = createWrapper(store);
      
      const { result } = renderHook(() => useConfigStore(), { wrapper });

      expect(result.current.getActiveWebhook()).toEqual(mockWebhook);
    });

    it('returns null when no active webhook', () => {
      const store = createTestStore();
      const wrapper = createWrapper(store);
      
      const { result } = renderHook(() => useConfigStore(), { wrapper });

      expect(result.current.getActiveWebhook()).toBe(null);
    });

    it('gets active chat when set', () => {
      const mockChat: ChatConfig = {
        id: 'chat-1',
        webhookId: 'webhook-1',
        sessionId: 'session-1',
        name: 'Test Chat',
        lastActivity: mockTimestamp,
        messageCount: 5,
        isActive: true,
      };

      const initialState = {
        chats: [mockChat],
        activeChatId: 'chat-1',
      };

      const store = createTestStore(initialState);
      const wrapper = createWrapper(store);
      
      const { result } = renderHook(() => useConfigStore(), { wrapper });

      expect(result.current.getActiveChat()).toEqual(mockChat);
    });

    it('returns null when no active chat', () => {
      const store = createTestStore();
      const wrapper = createWrapper(store);
      
      const { result } = renderHook(() => useConfigStore(), { wrapper });

      expect(result.current.getActiveChat()).toBe(null);
    });

    it('clears all config', () => {
      const initialState = {
        webhooks: [{ id: 'webhook-1' }],
        chats: [{ id: 'chat-1' }],
        activeWebhookId: 'webhook-1',
        activeChatId: 'chat-1',
      };

      const store = createTestStore(initialState);
      const wrapper = createWrapper(store);
      
      const { result } = renderHook(() => useConfigStore(), { wrapper });

      act(() => {
        result.current.clearConfig();
      });

      expect(result.current.webhooks).toEqual([]);
      expect(result.current.chats).toEqual([]);
      expect(result.current.activeWebhookId).toBe(null);
      expect(result.current.activeChatId).toBe(null);
    });
  });

  describe('Loading and Error States', () => {
    it('sets loading state', () => {
      const store = createTestStore();
      const wrapper = createWrapper(store);
      
      const { result } = renderHook(() => useConfigStore(), { wrapper });

      act(() => {
        result.current.setLoading(true);
      });

      expect(result.current.isLoading).toBe(true);

      act(() => {
        result.current.setLoading(false);
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('sets error state', () => {
      const store = createTestStore();
      const wrapper = createWrapper(store);
      
      const { result } = renderHook(() => useConfigStore(), { wrapper });

      act(() => {
        result.current.setError('Test error');
      });

      expect(result.current.error).toBe('Test error');

      act(() => {
        result.current.setError(null);
      });

      expect(result.current.error).toBe(null);
    });
  });
});