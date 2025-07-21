import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { WebhookConfig, ChatConfig } from '@/types/config';
import { v4 as uuidv4 } from 'uuid';
import { generateSessionId } from '@/lib/utils';

// Create default webhook from environment variables if available
function createDefaultWebhook(): WebhookConfig | null {
  // Check both client-side and server-side environment variables
  const webhookUrl = 
    process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || 
    (typeof window === 'undefined' ? process.env.N8N_WEBHOOK_URL : null);
  
  const webhookSecret = 
    process.env.NEXT_PUBLIC_WEBHOOK_SECRET || 
    (typeof window === 'undefined' ? process.env.WEBHOOK_SECRET : null);
  
  if (webhookUrl) {
    return {
      id: uuidv4(),
      name: 'Default Webhook',
      url: webhookUrl,
      apiSecret: webhookSecret,
      isActive: true,
      createdAt: new Date().toISOString(),
      metadata: {
        description: 'Auto-created from environment variables',
        tags: ['default'],
      }
    };
  }
  
  return null;
}

interface ConfigState {
  webhooks: WebhookConfig[];
  chats: ChatConfig[];
  activeWebhookId: string | null;
  activeChatId: string | null;
  isLoading: boolean;
  error: string | null;
}

// Create initial state with default webhook if available
const defaultWebhook = createDefaultWebhook();
const initialState: ConfigState = {
  webhooks: defaultWebhook ? [defaultWebhook] : [],
  chats: [],
  activeWebhookId: defaultWebhook?.id || null,
  activeChatId: null,
  isLoading: false,
  error: null,
};

const configSlice = createSlice({
  name: 'config',
  initialState,
  reducers: {
    // Webhook management
    addWebhook: {
      reducer: (state, action: PayloadAction<WebhookConfig>) => {
        state.webhooks.push(action.payload);
      },
      prepare: (webhookData: Omit<WebhookConfig, 'id' | 'createdAt' | 'isActive'>) => {
        const webhook: WebhookConfig = {
          ...webhookData,
          id: uuidv4(),
          createdAt: new Date().toISOString(),
          isActive: false,
        };
        return { payload: webhook };
      },
    },

    updateWebhook: (state, action: PayloadAction<{ id: string; updates: Partial<WebhookConfig> }>) => {
      const { id, updates } = action.payload;
      const webhookIndex = state.webhooks.findIndex(webhook => webhook.id === id);
      if (webhookIndex !== -1) {
        state.webhooks[webhookIndex] = { ...state.webhooks[webhookIndex], ...updates };
      }
    },

    deleteWebhook: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      // Remove webhook
      state.webhooks = state.webhooks.filter(webhook => webhook.id !== id);
      // Remove associated chats
      state.chats = state.chats.filter(chat => chat.webhookId !== id);
      // Clear active selections if they match deleted webhook
      if (state.activeWebhookId === id) {
        state.activeWebhookId = null;
        state.activeChatId = null;
      }
    },

    setActiveWebhook: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      // Set all webhooks inactive
      state.webhooks.forEach(webhook => webhook.isActive = false);
      // Set target webhook active
      const webhook = state.webhooks.find(w => w.id === id);
      if (webhook) {
        webhook.isActive = true;
        state.activeWebhookId = id;
      }
    },

    // Chat management
    addChat: {
      reducer: (state, action: PayloadAction<ChatConfig>) => {
        state.chats.push(action.payload);
      },
      prepare: (chatData: Omit<ChatConfig, 'id' | 'lastActivity' | 'messageCount'>) => {
        const chat: ChatConfig = {
          ...chatData,
          id: uuidv4(),
          sessionId: chatData.sessionId || generateSessionId(),
          lastActivity: new Date().toISOString(),
          messageCount: 0,
        };
        return { payload: chat };
      },
    },

    updateChat: (state, action: PayloadAction<{ id: string; updates: Partial<ChatConfig> }>) => {
      const { id, updates } = action.payload;
      const chatIndex = state.chats.findIndex(chat => chat.id === id);
      if (chatIndex !== -1) {
        state.chats[chatIndex] = { ...state.chats[chatIndex], ...updates };
      }
    },

    deleteChat: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      state.chats = state.chats.filter(chat => chat.id !== id);
      if (state.activeChatId === id) {
        state.activeChatId = null;
      }
    },

    setActiveChat: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      // Set all chats inactive
      state.chats.forEach(chat => chat.isActive = false);
      // Set target chat active
      const chat = state.chats.find(c => c.id === id);
      if (chat) {
        chat.isActive = true;
        state.activeChatId = id;
      }
    },

    clearConfig: (state) => {
      state.webhooks = [];
      state.chats = [];
      state.activeWebhookId = null;
      state.activeChatId = null;
    },

    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },

    initializeFromEnv: (state) => {
      // Only initialize if no webhooks exist
      if (state.webhooks.length === 0) {
        const defaultWebhook = createDefaultWebhook();
        if (defaultWebhook) {
          state.webhooks.push(defaultWebhook);
          state.activeWebhookId = defaultWebhook.id;
        }
      }
    },
  },
});

export const {
  addWebhook,
  updateWebhook,
  deleteWebhook,
  setActiveWebhook,
  addChat,
  updateChat,
  deleteChat,
  setActiveChat,
  clearConfig,
  setLoading,
  setError,
  initializeFromEnv,
} = configSlice.actions;

export default configSlice.reducer;