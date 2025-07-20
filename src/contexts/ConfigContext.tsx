'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { WebhookConfig, ChatConfig, ConfigStore } from '@/types/config';
import { v4 as uuidv4 } from 'uuid';
import { generateSessionId } from '@/lib/utils';

// Zustand store for configuration management
const useConfigStore = create<ConfigStore>()(
  devtools(
    persist(
      (set, get) => ({
        webhooks: [],
        chats: [],
        activeWebhookId: null,
        activeChatId: null,

        // Webhook management
        addWebhook: (webhookData) => {
          const webhook: WebhookConfig = {
            ...webhookData,
            id: uuidv4(),
            createdAt: new Date().toISOString(),
            isActive: false,
          };

          set((state) => ({
            webhooks: [...state.webhooks, webhook],
          }));

          return webhook;
        },

        updateWebhook: (id, updates) => {
          set((state) => ({
            webhooks: state.webhooks.map((webhook) =>
              webhook.id === id 
                ? { ...webhook, ...updates, lastUsed: new Date().toISOString() }
                : webhook
            ),
          }));
        },

        deleteWebhook: (id) => {
          set((state) => {
            // Also delete all chats associated with this webhook
            const remainingChats = state.chats.filter(chat => chat.webhookId !== id);
            const remainingWebhooks = state.webhooks.filter(webhook => webhook.id !== id);
            
            return {
              webhooks: remainingWebhooks,
              chats: remainingChats,
              activeWebhookId: state.activeWebhookId === id ? null : state.activeWebhookId,
              activeChatId: state.chats.some(chat => chat.webhookId === id && chat.id === state.activeChatId) 
                ? null 
                : state.activeChatId,
            };
          });
        },

        setActiveWebhook: (id) => {
          set((state) => {
            // Update active status for all webhooks
            const updatedWebhooks = state.webhooks.map(webhook => ({
              ...webhook,
              isActive: webhook.id === id,
              lastUsed: webhook.id === id ? new Date().toISOString() : webhook.lastUsed,
            }));

            return {
              webhooks: updatedWebhooks,
              activeWebhookId: id,
            };
          });
        },

        // Chat management
        addChat: (chatData) => {
          const chat: ChatConfig = {
            ...chatData,
            id: uuidv4(),
            lastActivity: new Date().toISOString(),
            messageCount: 0,
          };

          set((state) => ({
            chats: [...state.chats, chat],
          }));

          return chat;
        },

        updateChat: (id, updates) => {
          set((state) => ({
            chats: state.chats.map((chat) =>
              chat.id === id 
                ? { ...chat, ...updates, lastActivity: new Date().toISOString() }
                : chat
            ),
          }));
        },

        deleteChat: (id) => {
          set((state) => ({
            chats: state.chats.filter(chat => chat.id !== id),
            activeChatId: state.activeChatId === id ? null : state.activeChatId,
          }));
        },

        setActiveChat: (id) => {
          set((state) => {
            // Update active status for all chats
            const updatedChats = state.chats.map(chat => ({
              ...chat,
              isActive: chat.id === id,
            }));

            return {
              chats: updatedChats,
              activeChatId: id,
            };
          });
        },

        // Utility functions
        getActiveWebhook: () => {
          const state = get();
          return state.webhooks.find(webhook => webhook.id === state.activeWebhookId) || null;
        },

        getActiveChat: () => {
          const state = get();
          return state.chats.find(chat => chat.id === state.activeChatId) || null;
        },

        getChatsForWebhook: (webhookId) => {
          const state = get();
          return state.chats.filter(chat => chat.webhookId === webhookId);
        },

        clearConfig: () => {
          set({
            webhooks: [],
            chats: [],
            activeWebhookId: null,
            activeChatId: null,
          });
        },
      }),
      {
        name: 'chat-config-store',
        version: 1,
      }
    ),
    {
      name: 'config-store',
    }
  )
);

// React Context for configuration
interface ConfigContextType {
  store: ConfigStore;
  isLoading: boolean;
  error: string | null;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Convenience methods
  createDefaultWebhook: () => WebhookConfig;
  createNewChat: (webhookId: string, name?: string) => ChatConfig;
  initializeDefaultConfig: () => void;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (context === undefined) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
};

interface ConfigProviderProps {
  children: React.ReactNode;
}

export const ConfigProvider: React.FC<ConfigProviderProps> = ({ children }) => {
  const store = useConfigStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Initialize default configuration on first load
  useEffect(() => {
    if (!mounted) return;
    
    // If no webhooks exist, create a default one using environment variables
    if (store.webhooks.length === 0) {
      initializeDefaultConfig();
    }
  }, [mounted, store.webhooks.length]);

  // Handle mounting to prevent hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);

  const createDefaultWebhook = (): WebhookConfig => {
    // Use N8N_WEBHOOK_URL if available, otherwise fallback to local API
    const n8nWebhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL;
    const defaultUrl = n8nWebhookUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/webhook/send`;
    const defaultSecret = process.env.NEXT_PUBLIC_WEBHOOK_SECRET;
    
    return store.addWebhook({
      name: n8nWebhookUrl ? 'N8N Webhook' : 'Default Webhook',
      url: defaultUrl,
      apiSecret: defaultSecret,
      metadata: {
        description: n8nWebhookUrl 
          ? 'N8N webhook configuration from environment variables'
          : 'Default webhook configuration loaded from environment variables',
        color: '#3b82f6',
      },
    });
  };

  const createNewChat = (webhookId: string, name?: string): ChatConfig => {
    const webhook = store.webhooks.find(w => w.id === webhookId);
    const chatName = name || `Chat ${store.getChatsForWebhook(webhookId).length + 1}`;
    
    return store.addChat({
      webhookId,
      sessionId: generateSessionId(),
      name: chatName,
      isActive: false,
    });
  };

  const initializeDefaultConfig = () => {
    if (store.webhooks.length === 0) {
      const defaultWebhook = createDefaultWebhook();
      store.setActiveWebhook(defaultWebhook.id);
      
      // Create first chat for the default webhook
      const defaultChat = createNewChat(defaultWebhook.id, 'General Chat');
      store.setActiveChat(defaultChat.id);
    }
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return null;
  }

  const value: ConfigContextType = {
    store,
    isLoading,
    error,
    setLoading: setIsLoading,
    setError,
    createDefaultWebhook,
    createNewChat,
    initializeDefaultConfig,
  };

  return (
    <ConfigContext.Provider value={value}>
      {children}
    </ConfigContext.Provider>
  );
};