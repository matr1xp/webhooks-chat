'use client';

import React, { createContext, useContext, ReactNode, useCallback } from 'react';
import { useFirestoreAuth } from '@/lib/hooks/useFirestoreAuth';
import { useFirestoreConfig } from '@/lib/hooks/useFirestoreConfig';
import { useFirestoreChat } from '@/lib/hooks/useFirestoreChat';
import { webhookClient } from '@/lib/webhook-client';
import type { FirestoreUser, FirestoreWebhook, FirestoreChat } from '@/lib/firestore/types';
import { convertTimestamp } from '@/lib/firestore/types';
import type { Message } from '@/types/chat';

interface FirebaseContextType {
  // Authentication
  user: any; // Firebase User
  userProfile: FirestoreUser | null;
  authLoading: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signInAnonymous: () => Promise<void>;
  signOut: () => Promise<void>;
  isSignedIn: boolean;
  
  // Configuration
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => Promise<void>;
  webhooks: FirestoreWebhook[];
  activeWebhook: FirestoreWebhook | null;
  setActiveWebhook: (webhookId: string) => Promise<void>;
  addWebhook: (name: string, url: string, secret?: string) => Promise<FirestoreWebhook>;
  updateWebhook: (webhookId: string, updates: Partial<Omit<FirestoreWebhook, 'id' | 'createdAt'>>) => Promise<void>;
  deleteWebhook: (webhookId: string) => Promise<void>;
  checkWebhookHealth: (webhook?: FirestoreWebhook) => Promise<boolean>;
  configLoading: boolean;
  configError: string | null;
  
  // Chat
  chats: FirestoreChat[];
  activeChat: FirestoreChat | null;
  messages: Message[];
  chatLoading: boolean;
  messagesLoading: boolean;
  chatError: string | null;
  setActiveChat: (chatId: string | null) => void;
  createNewChat: (webhookId: string, name?: string) => Promise<FirestoreChat>;
  updateChat: (chatId: string, name: string) => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
  cleanupEmptyChats: (webhookId?: string) => Promise<number>;
  addMessage: (messageData: Omit<Message, 'id' | 'timestamp' | 'status'>) => Promise<Message>;
  addBotMessage: (content: string, metadata?: Record<string, any>) => Promise<Message>;
  updateMessage: (messageId: string, status: Message['status']) => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

interface FirebaseProviderProps {
  children: ReactNode;
}

export function FirebaseProvider({ children }: FirebaseProviderProps) {
  // Authentication
  const {
    user,
    userProfile,
    loading: authLoading,
    error: authError,
    signInWithGoogle,
    signInAnonymous,
    signOut,
    isSignedIn,
  } = useFirestoreAuth();

  // Configuration
  const {
    theme,
    setTheme,
    webhooks,
    activeWebhook,
    setActiveWebhook,
    addWebhook,
    updateWebhook,
    deleteWebhook,
    getActiveChatId,
    setActiveChatId,
    loading: configLoading,
    error: configError,
  } = useFirestoreConfig(user?.uid || null);

  // Chat
  const {
    chats,
    activeChat,
    messages,
    messagesLoading,
    addMessage,
    addBotMessage,
    updateMessage,
    setActiveChat,
    createNewChat,
    updateChat,
    deleteChat,
    cleanupEmptyChats,
    loading: chatLoading,
    error: chatError,
  } = useFirestoreChat(user?.uid || null, activeWebhook?.id || null, getActiveChatId, setActiveChatId);

  // Health check function
  const checkWebhookHealth = useCallback(async (webhook?: FirestoreWebhook): Promise<boolean> => {
    const targetWebhook = webhook || activeWebhook;
    if (!targetWebhook) {
      return false;
    }

    try {
      // Convert FirestoreWebhook to WebhookConfig format
      const webhookConfig = {
        id: targetWebhook.id,
        name: targetWebhook.name,
        url: targetWebhook.url,
        apiSecret: targetWebhook.secret,
        isActive: targetWebhook.isActive,
        createdAt: convertTimestamp(targetWebhook.createdAt),
      };
      return await webhookClient.checkHealth(webhookConfig);
    } catch (error) {
      return false;
    }
  }, [activeWebhook]);

  const value: FirebaseContextType = {
    // Authentication
    user,
    userProfile,
    authLoading,
    authError,
    signInWithGoogle,
    signInAnonymous,
    signOut,
    isSignedIn,
    
    // Configuration
    theme,
    setTheme,
    webhooks,
    activeWebhook,
    setActiveWebhook,
    addWebhook,
    updateWebhook,
    deleteWebhook,
    checkWebhookHealth,
    configLoading,
    configError,
    
    // Chat
    chats,
    activeChat,
    messages,
    chatLoading,
    messagesLoading,
    chatError,
    setActiveChat,
    createNewChat,
    updateChat,
    deleteChat,
    cleanupEmptyChats,
    addMessage,
    addBotMessage,
    updateMessage,
  };

  return (
    <FirebaseContext.Provider value={value}>
      {children}
    </FirebaseContext.Provider>
  );
}

export function useFirebase(): FirebaseContextType {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
}

// Compatibility hook for existing Redux-based components
export function useFirebaseChat() {
  const {
    activeChat,
    messages,
    messagesLoading,
    chatError,
    setActiveChat,
    addMessage,
    updateMessage,
  } = useFirebase();

  return {
    // Convert to format expected by existing components
    sessions: { [activeChat?.id || '']: messages },
    currentSessionId: activeChat?.id || null,
    isLoading: messagesLoading,
    error: chatError,
    messages,
    currentSession: activeChat ? {
      id: activeChat.id,
      userId: activeChat.userId,
      messages,
      createdAt: activeChat.createdAt.toDate().toISOString(),
      updatedAt: activeChat.lastActivity.toDate().toISOString(),
    } : null,
    
    // Methods
    setCurrentSession: setActiveChat,
    addMessage: async (messageData: any) => {
      return addMessage(messageData);
    },
    updateMessageStatus: updateMessage,
    clearMessages: () => {}, // Will implement if needed
    clearAllSessions: () => {}, // Will implement if needed
    setLoading: () => {}, // Managed by hooks
    setError: () => {}, // Managed by hooks
  };
}