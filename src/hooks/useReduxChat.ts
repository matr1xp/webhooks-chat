'use client';

import { useSelector, useDispatch } from 'react-redux';
import { AppDispatch, RootState } from '@/store';
import {
  setCurrentSession,
  addMessage as addMessageAction,
  updateMessageStatus as updateMessageStatusAction,
  clearMessages as clearMessagesAction,
  clearAllSessions as clearAllSessionsAction,
  setLoading,
  setError,
} from '@/store/chatSlice';
import {
  selectMessages,
  selectCurrentSession,
  selectMessagesForSession,
  selectCurrentSessionId,
  selectIsLoading,
  selectError,
  selectSessions,
} from '@/store/selectors';
import { Message } from '@/types/chat';

// Hook to provide the same interface as the Zustand store
export const useChatStore = () => {
  const dispatch = useDispatch<AppDispatch>();
  
  // Selectors
  const messages = useSelector(selectMessages);
  const currentSession = useSelector(selectCurrentSession);
  const currentSessionId = useSelector(selectCurrentSessionId);
  const isLoading = useSelector(selectIsLoading);
  const error = useSelector(selectError);
  const sessions = useSelector(selectSessions);

  // Actions
  const setCurrentSessionHandler = (sessionId: string) => {
    dispatch(setCurrentSession(sessionId));
  };

  const getMessagesForSession = (sessionId: string): Message[] => {
    return sessions[sessionId] || [];
  };

  const addMessage = async (messageData: Omit<Message, 'id' | 'timestamp' | 'status'>): Promise<Message> => {
    // Create the message with ID and timestamp to return
    const message: Message = {
      ...messageData,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      status: 'sending',
    };

    dispatch(addMessageAction(messageData));
    return message;
  };

  const updateMessageStatus = (messageId: string, status: Message['status']) => {
    dispatch(updateMessageStatusAction({ messageId, status }));
  };

  const clearMessages = (sessionId?: string) => {
    dispatch(clearMessagesAction(sessionId));
  };

  const clearAllSessions = () => {
    dispatch(clearAllSessionsAction());
  };

  const setLoadingHandler = (loading: boolean) => {
    dispatch(setLoading(loading));
  };

  const setErrorHandler = (errorMessage: string | null) => {
    dispatch(setError(errorMessage));
  };

  return {
    // State
    messages,
    currentSession,
    currentSessionId,
    isLoading,
    error,
    sessions,
    
    // Actions
    setCurrentSession: setCurrentSessionHandler,
    getMessagesForSession,
    addMessage,
    updateMessageStatus,
    clearMessages,
    clearAllSessions,
    setLoading: setLoadingHandler,
    setError: setErrorHandler,
  };
};