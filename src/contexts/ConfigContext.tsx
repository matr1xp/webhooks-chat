'use client';

import React, { createContext, useContext } from 'react';
import { useConfigStore } from '@/hooks/useReduxConfig';
import { ConfigContextType } from '@/types/config';

// Create context
const ConfigContext = createContext<ConfigContextType | null>(null);

// Provider component
export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const configStore = useConfigStore();

  return (
    <ConfigContext.Provider value={configStore}>
      {children}
    </ConfigContext.Provider>
  );
}

// Hook to use config context
export function useConfig() {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  
  // Helper functions
  const createNewChat = (webhookId: string) => {
    return context.addChat({
      webhookId,
      sessionId: crypto.randomUUID(),
      name: `Chat ${new Date().toLocaleTimeString()}`,
      isActive: true,
    });
  };

  const createDefaultWebhook = () => {
    return context.addWebhook({
      name: 'Default Webhook',
      url: process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || 'https://your-n8n-instance.com/webhook/chat',
      apiSecret: process.env.NEXT_PUBLIC_WEBHOOK_SECRET,
    });
  };
  
  // Return the store wrapped in a 'store' property to maintain compatibility
  return {
    store: context,
    createNewChat,
    createDefaultWebhook,
  };
}