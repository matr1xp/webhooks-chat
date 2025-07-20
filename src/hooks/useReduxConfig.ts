'use client';

import { useSelector, useDispatch } from 'react-redux';
import { AppDispatch, RootState } from '@/store';
import {
  addWebhook as addWebhookAction,
  updateWebhook as updateWebhookAction,
  deleteWebhook as deleteWebhookAction,
  setActiveWebhook as setActiveWebhookAction,
  addChat as addChatAction,
  updateChat as updateChatAction,
  deleteChat as deleteChatAction,
  setActiveChat as setActiveChatAction,
  clearConfig as clearConfigAction,
  setLoading,
  setError,
} from '@/store/configSlice';
import {
  selectWebhooks,
  selectChats,
  selectActiveWebhookId,
  selectActiveChatId,
  selectActiveWebhook,
  selectActiveChat,
  selectChatsForWebhook,
  selectConfigLoading,
  selectConfigError,
} from '@/store/configSelectors';
import { WebhookConfig, ChatConfig } from '@/types/config';

// Hook to provide the same interface as the Zustand config store
export const useConfigStore = () => {
  const dispatch = useDispatch<AppDispatch>();
  
  // Selectors
  const webhooks = useSelector(selectWebhooks);
  const chats = useSelector(selectChats);
  const activeWebhookId = useSelector(selectActiveWebhookId);
  const activeChatId = useSelector(selectActiveChatId);
  const activeWebhook = useSelector(selectActiveWebhook);
  const activeChat = useSelector(selectActiveChat);
  const isLoading = useSelector(selectConfigLoading);
  const error = useSelector(selectConfigError);

  // Actions
  const addWebhook = (webhookData: Omit<WebhookConfig, 'id' | 'createdAt' | 'isActive'>): WebhookConfig => {
    // Dispatch the action and get the generated webhook from the action payload
    const action = addWebhookAction(webhookData);
    dispatch(action);
    
    // Return the webhook that was generated in the prepare function
    return action.payload;
  };

  const updateWebhook = (id: string, updates: Partial<WebhookConfig>) => {
    dispatch(updateWebhookAction({ id, updates }));
  };

  const deleteWebhook = (id: string) => {
    dispatch(deleteWebhookAction(id));
  };

  const setActiveWebhook = (id: string) => {
    dispatch(setActiveWebhookAction(id));
  };

  const addChat = (chatData: Omit<ChatConfig, 'id' | 'lastActivity' | 'messageCount'>): ChatConfig => {
    // Dispatch the action and get the generated chat from the action payload
    const action = addChatAction(chatData);
    dispatch(action);
    
    // Return the chat that was generated in the prepare function
    return action.payload;
  };

  const updateChat = (id: string, updates: Partial<ChatConfig>) => {
    dispatch(updateChatAction({ id, updates }));
  };

  const deleteChat = (id: string) => {
    dispatch(deleteChatAction(id));
  };

  const setActiveChat = (id: string) => {
    dispatch(setActiveChatAction(id));
  };

  const getChatsForWebhook = (webhookId: string): ChatConfig[] => {
    return chats.filter(chat => chat.webhookId === webhookId);
  };

  const clearConfig = () => {
    dispatch(clearConfigAction());
  };

  const setLoadingHandler = (loading: boolean) => {
    dispatch(setLoading(loading));
  };

  const setErrorHandler = (errorMessage: string | null) => {
    dispatch(setError(errorMessage));
  };

  const getActiveWebhook = (): WebhookConfig | null => {
    return activeWebhook;
  };

  const getActiveChat = (): ChatConfig | null => {
    return activeChat;
  };

  return {
    // State
    webhooks,
    chats,
    activeWebhookId,
    activeChatId,
    isLoading,
    error,
    
    // Actions
    addWebhook,
    updateWebhook,
    deleteWebhook,
    setActiveWebhook,
    addChat,
    updateChat,
    deleteChat,
    setActiveChat,
    getChatsForWebhook,
    clearConfig,
    setLoading: setLoadingHandler,
    setError: setErrorHandler,
    
    // Utility functions
    getActiveWebhook,
    getActiveChat,
  };
};