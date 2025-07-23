'use client';

import React, { useState } from 'react';
import { useFirebase } from '@/contexts/FirebaseContext';
import { Message } from '@/types/chat';

/**
 * Firebase-powered chat hook that provides the same interface as useReduxChat
 * This hook serves as a drop-in replacement for useChatStore from useReduxChat
 */
export const useFirebaseChat = () => {
  const {
    // Auth
    user,
    signInWithGoogle,
    isSignedIn,
    
    // Chat state
    chats,
    activeChat,
    messages,
    chatLoading,
    messagesLoading,
    chatError,
    
    // Chat actions
    setActiveChat,
    createNewChat,
    updateChat,
    deleteChat,
    addMessage,
    addBotMessage,
    updateMessage,
    
    // Config
    activeWebhook,
    webhooks,
  } = useFirebase();

  // Local loading state for manual control from ChatContainer
  const [manualLoading, setManualLoading] = useState(false);

  // Ensure user is signed in
  const ensureAuthenticated = async () => {
    if (!isSignedIn) {
      await signInWithGoogle();
    }
  };

  // Create current session data to match Redux interface
  const currentSession = activeChat ? {
    id: activeChat.id,
    userId: activeChat.userId,
    messages,
    createdAt: activeChat.createdAt.toDate().toISOString(),
    updatedAt: activeChat.lastActivity.toDate().toISOString(),
  } : null;

  // Build sessions object to match Redux interface
  const sessions = activeChat ? {
    [activeChat.id]: messages
  } : {};

  // Firebase-powered actions that match Redux interface
  const setCurrentSession = async (sessionId: string | null) => {
    await ensureAuthenticated();
    setActiveChat(sessionId);
  };

  const getMessagesForSession = (sessionId: string): Message[] => {
    if (sessionId === activeChat?.id) {
      return messages;
    }
    return [];
  };

  const addMessageHandler = async (messageData: Omit<Message, 'id' | 'timestamp' | 'status'>): Promise<Message> => {
    await ensureAuthenticated();
    
    // Pass the full messageData object to Firebase context
    const firebaseMessage = await addMessage(messageData);
    
    return firebaseMessage;
  };

  const updateMessageStatus = async (messageId: string, status: Message['status']) => {
    await ensureAuthenticated();
    await updateMessage(messageId, status);
  };

  const clearMessages = async (sessionId?: string) => {
    // For now, we don't implement clearing individual sessions
    // This could be implemented with Firebase batch operations if needed
  };

  const clearAllSessions = async () => {
    // For now, we don't implement clearing all sessions
    // This could be implemented with Firebase batch operations if needed
  };

  const setLoading = (loading: boolean) => {
    setManualLoading(loading);
  };

  const setError = (error: string | null) => {
    // Errors are managed by Firebase hooks automatically
    // This is kept for interface compatibility
  };

  // Note: Removed automatic chat creation to prevent unwanted empty chats
  // Chat creation now happens only when user explicitly clicks "New Chat" or "Start First Chat"

  return {
    // State - matching Redux interface
    messages,
    currentSession,
    currentSessionId: activeChat?.id || null,
    isLoading: manualLoading || messagesLoading || chatLoading,
    error: chatError,
    sessions,
    
    // Actions - matching Redux interface
    setCurrentSession,
    getMessagesForSession,
    addMessage: addMessageHandler,
    updateMessageStatus,
    clearMessages,
    clearAllSessions,
    setLoading,
    setError,
    
    // Additional Firebase-specific helpers
    ensureAuthenticated,
    user,
    activeWebhook,
    chats,
  };
};