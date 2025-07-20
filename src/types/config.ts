export interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  apiSecret?: string;
  isActive: boolean;
  createdAt: string;
  lastUsed?: string;
  metadata?: {
    description?: string;
    tags?: string[];
    color?: string;
  };
}

export interface ChatConfig {
  id: string;
  webhookId: string;
  sessionId: string;
  name: string;
  lastActivity: string;
  messageCount: number;
  isActive: boolean;
}

export interface ConfigStore {
  webhooks: WebhookConfig[];
  chats: ChatConfig[];
  activeWebhookId: string | null;
  activeChatId: string | null;
  
  // Webhook management
  addWebhook: (webhook: Omit<WebhookConfig, 'id' | 'createdAt' | 'isActive'>) => WebhookConfig;
  updateWebhook: (id: string, updates: Partial<WebhookConfig>) => void;
  deleteWebhook: (id: string) => void;
  setActiveWebhook: (id: string) => void;
  
  // Chat management
  addChat: (chat: Omit<ChatConfig, 'id' | 'lastActivity' | 'messageCount'>) => ChatConfig;
  updateChat: (id: string, updates: Partial<ChatConfig>) => void;
  deleteChat: (id: string) => void;
  setActiveChat: (id: string) => void;
  
  // Utility functions
  getActiveWebhook: () => WebhookConfig | null;
  getActiveChat: () => ChatConfig | null;
  getChatsForWebhook: (webhookId: string) => ChatConfig[];
  clearConfig: () => void;
}

export interface ConfigContextType extends ConfigStore {
  isLoading: boolean;
  error: string | null;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}