import { createSelector } from '@reduxjs/toolkit';
import { RootState } from './index';
import { Message, ChatSession } from '@/types/chat';

// Memoized selectors to prevent unnecessary re-renders
export const selectMessages = createSelector(
  [(state: RootState) => state.chat.currentSessionId, (state: RootState) => state.chat.sessions],
  (currentSessionId, sessions): Message[] => {
    return currentSessionId ? (sessions[currentSessionId] || []) : [];
  }
);

// Memoized selector to prevent unnecessary re-renders
export const selectCurrentSession = createSelector(
  [(state: RootState) => state.chat.currentSessionId, (state: RootState) => state.chat.sessions],
  (currentSessionId, sessions): ChatSession | null => {
    if (!currentSessionId) return null;
    
    const messages = sessions[currentSessionId] || [];
    return {
      id: currentSessionId,
      userId: messages[0]?.userId || '',
      messages,
      createdAt: messages[0]?.timestamp || new Date().toISOString(),
      updatedAt: messages[messages.length - 1]?.timestamp || new Date().toISOString(),
    };
  }
);

export const selectMessagesForSession = (sessionId: string) => 
  createSelector(
    [(state: RootState) => state.chat.sessions[sessionId]],
    (messages): Message[] => messages || []
  );

export const selectChatState = (state: RootState) => state.chat;
export const selectSessions = (state: RootState) => state.chat.sessions;
export const selectCurrentSessionId = (state: RootState) => state.chat.currentSessionId;
export const selectIsLoading = (state: RootState) => state.chat.isLoading;
export const selectError = (state: RootState) => state.chat.error;