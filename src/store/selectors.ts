import { RootState } from './index';
import { Message, ChatSession } from '@/types/chat';

// Computed selectors to match the Zustand implementation
export const selectMessages = (state: RootState): Message[] => {
  return state.chat.currentSessionId ? (state.chat.sessions[state.chat.currentSessionId] || []) : [];
};

export const selectCurrentSession = (state: RootState): ChatSession | null => {
  if (!state.chat.currentSessionId) return null;
  
  const messages = state.chat.sessions[state.chat.currentSessionId] || [];
  return {
    id: state.chat.currentSessionId,
    userId: messages[0]?.userId || '',
    messages,
    createdAt: messages[0]?.timestamp || new Date().toISOString(),
    updatedAt: messages[messages.length - 1]?.timestamp || new Date().toISOString(),
  };
};

export const selectMessagesForSession = (sessionId: string) => (state: RootState): Message[] => {
  return state.chat.sessions[sessionId] || [];
};

export const selectChatState = (state: RootState) => state.chat;
export const selectSessions = (state: RootState) => state.chat.sessions;
export const selectCurrentSessionId = (state: RootState) => state.chat.currentSessionId;
export const selectIsLoading = (state: RootState) => state.chat.isLoading;
export const selectError = (state: RootState) => state.chat.error;