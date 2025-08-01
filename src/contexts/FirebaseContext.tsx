'use client';

import React, { createContext, useContext, ReactNode, useCallback, useRef } from 'react';
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
  signInWithApple: () => Promise<void>;
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
  addBotMessage: (content: string, metadata?: Record<string, any>, source?: string) => Promise<Message>;
  updateMessage: (messageId: string, status: Message['status']) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  deleteBotReply: (userMessageId: string) => Promise<void>;
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
    signInWithApple,
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
    deleteMessage,
    deleteBotReply,
    setActiveChat,
    createNewChat,
    updateChat,
    deleteChat,
    cleanupEmptyChats,
    loading: chatLoading,
    error: chatError,
  } = useFirestoreChat(user?.uid || null, activeWebhook?.id || null, getActiveChatId, setActiveChatId);

  // Rate limiting and caching for health checks
  const healthCheckCache = useRef<Map<string, { result: boolean; timestamp: number; failureCount: number }>>(new Map());
  const pendingHealthChecks = useRef<Map<string, Promise<boolean>>>(new Map());

  // Health check function with rate limiting and caching - stable reference, no activeWebhook dependency to prevent re-render loops
  const checkWebhookHealth = useCallback(async (webhook?: FirestoreWebhook): Promise<boolean> => {
    // Use the passed webhook parameter, or fall back to current activeWebhook at call time
    const targetWebhook = webhook || activeWebhook;
    if (!targetWebhook) {
      return false;
    }

    const webhookId = targetWebhook.id;
    const now = Date.now();
    
    // Check if there's already a pending health check for this webhook
    const pendingCheck = pendingHealthChecks.current.get(webhookId);
    if (pendingCheck) {
      return pendingCheck;
    }

    // Check cache first
    const cached = healthCheckCache.current.get(webhookId);
    if (cached) {
      const timeSinceCheck = now - cached.timestamp;
      
      // Cache rules:
      // - Successful checks: cache for 30 seconds
      // - Failed checks: use exponential backoff (min 5s, max 60s)
      const cacheValidTime = cached.result 
        ? 30 * 1000 // 30 seconds for successful checks
        : Math.min(5000 * Math.pow(2, cached.failureCount), 60000); // Exponential backoff for failures
      
      if (timeSinceCheck < cacheValidTime) {
        return cached.result;
      }
    }

    // Create the health check promise
    const healthCheckPromise = (async (): Promise<boolean> => {
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
        
        const result = await webhookClient.checkHealth(webhookConfig);
        
        // Update cache with result
        const failureCount = cached?.result === false ? (cached.failureCount + 1) : 0;
        healthCheckCache.current.set(webhookId, {
          result,
          timestamp: now,
          failureCount: result ? 0 : failureCount
        });
        
        return result;
      } catch (error) {
        // Update cache with failure
        const failureCount = cached?.result === false ? (cached.failureCount + 1) : 1;
        healthCheckCache.current.set(webhookId, {
          result: false,
          timestamp: now,
          failureCount
        });
        return false;
      } finally {
        // Remove from pending checks
        pendingHealthChecks.current.delete(webhookId);
      }
    })();

    // Store the pending promise
    pendingHealthChecks.current.set(webhookId, healthCheckPromise);
    
    return healthCheckPromise;
  }, []); // No dependencies - stable function reference

  const value: FirebaseContextType = {
    // Authentication
    user,
    userProfile,
    authLoading,
    authError,
    signInWithGoogle,
    signInWithApple,
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
    deleteMessage,
    deleteBotReply,
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