import { RootState } from './index';
import { WebhookConfig, ChatConfig } from '@/types/config';

// Config selectors
export const selectWebhooks = (state: RootState): WebhookConfig[] => state.config.webhooks;
export const selectChats = (state: RootState): ChatConfig[] => state.config.chats;
export const selectActiveWebhookId = (state: RootState): string | null => state.config.activeWebhookId;
export const selectActiveChatId = (state: RootState): string | null => state.config.activeChatId;
export const selectConfigLoading = (state: RootState): boolean => state.config.isLoading;
export const selectConfigError = (state: RootState): string | null => state.config.error;

// Computed selectors
export const selectActiveWebhook = (state: RootState): WebhookConfig | null => {
  const activeId = state.config.activeWebhookId;
  return activeId ? state.config.webhooks.find(w => w.id === activeId) || null : null;
};

export const selectActiveChat = (state: RootState): ChatConfig | null => {
  const activeId = state.config.activeChatId;
  return activeId ? state.config.chats.find(c => c.id === activeId) || null : null;
};

export const selectChatsForWebhook = (webhookId: string) => (state: RootState): ChatConfig[] => {
  return state.config.chats.filter(chat => chat.webhookId === webhookId);
};

export const selectConfigState = (state: RootState) => state.config;