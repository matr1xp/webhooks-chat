import { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  createChat,
  updateChatName,
  deleteChat as deleteFirestoreChat,
  deleteEmptyChats,
  subscribeToWebhookChats,
} from '../firestore/chats';
import {
  addMessage as addFirestoreMessage,
  updateMessageStatus,
  subscribeToChatMessages,
  convertFirestoreMessageToMessage,
  convertMessageToFirestore,
} from '../firestore/messages';
import type { FirestoreChat, FirestoreMessage } from '../firestore/types';
import type { Message } from '@/types/chat';

interface UseFirestoreChatReturn {
  // Chat management
  chats: FirestoreChat[];
  activeChat: FirestoreChat | null;
  setActiveChat: (chatId: string | null) => void;
  createNewChat: (webhookId: string, name?: string) => Promise<FirestoreChat>;
  updateChat: (chatId: string, name: string) => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
  cleanupEmptyChats: (webhookId?: string) => Promise<number>;
  
  // Messages
  messages: Message[];
  messagesLoading: boolean;
  addMessage: (messageData: Omit<Message, 'id' | 'timestamp' | 'status'>) => Promise<Message>;
  addBotMessage: (content: string, metadata?: Record<string, any>) => Promise<Message>;
  updateMessage: (messageId: string, status: Message['status']) => Promise<void>;
  
  // State
  loading: boolean;
  error: string | null;
}

export const useFirestoreChat = (
  userId: string | null,
  webhookId: string | null
): UseFirestoreChatReturn => {
  const [chats, setChats] = useState<FirestoreChat[]>([]);
  const [activeChat, setActiveChatState] = useState<FirestoreChat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use a ref to store current chats for stable reference
  const chatsRef = useRef<FirestoreChat[]>([]);
  chatsRef.current = chats;

  // Track previous userId to detect user changes
  const prevUserIdRef = useRef<string | null>(null);

  // Set active chat
  const setActiveChat = useCallback((chatId: string | null) => {
    if (chatId) {
      setActiveChatState(prevActive => {
        // Only update if the chatId is different to prevent unnecessary re-renders
        if (prevActive?.id === chatId) return prevActive;
        
        const chat = chatsRef.current.find(c => c.id === chatId);
        return chat || null;
      });
    } else {
      setActiveChatState(prevActive => prevActive === null ? prevActive : null);
    }
  }, []); // No dependencies to prevent unnecessary recreations

  // Create new chat
  const createNewChat = useCallback(async (webhookId: string, name?: string): Promise<FirestoreChat> => {
    if (!userId) throw new Error('User ID is required');
    
    try {
      const chatId = uuidv4();
      const chatName = name || `Chat ${new Date().toLocaleString()}`;
      
      const newChat = await createChat(chatId, userId, webhookId, chatName);
      return newChat;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [userId]);

  // Update chat name
  const updateChat = useCallback(async (chatId: string, name: string): Promise<void> => {
    try {
      await updateChatName(chatId, name);
      
      // Update local state immediately for better UX
      setChats(prevChats => 
        prevChats.map(chat => 
          chat.id === chatId ? { ...chat, name } : chat
        )
      );
      
      // Update activeChat if it's the one being renamed
      setActiveChatState(prevActiveChat => 
        prevActiveChat?.id === chatId 
          ? { ...prevActiveChat, name }
          : prevActiveChat
      );
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  // Delete chat
  const deleteChat = useCallback(async (chatId: string): Promise<void> => {
    try {
      await deleteFirestoreChat(chatId);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  // Cleanup empty chats
  const cleanupEmptyChats = useCallback(async (webhookId?: string): Promise<number> => {
    if (!userId) throw new Error('User ID is required');
    
    try {
      const deletedCount = await deleteEmptyChats(userId, webhookId);
      return deletedCount;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [userId]);

  // Add message
  const addMessage = useCallback(async (
    messageData: Omit<Message, 'id' | 'timestamp' | 'status'>
  ): Promise<Message> => {
    if (!userId || !activeChat) throw new Error('User ID and active chat are required');
    if (!activeChat.id || activeChat.id.trim() === '') throw new Error('Active chat ID cannot be empty');
    
    try {
      // Explicitly construct the message data to avoid spreading issues
      const fullMessageData = {
        sessionId: activeChat.id,
        content: messageData.content,
        type: messageData.type,
        userId: messageData.userId,
        status: 'sending' as const,
        isBot: messageData.isBot || false
      };
      
      // Add optional fields explicitly
      if (messageData.fileData) {
        (fullMessageData as any).fileData = messageData.fileData;
      }
      if (messageData.metadata) {
        (fullMessageData as any).metadata = messageData.metadata;
      }
      
      const firestoreMessageData = convertMessageToFirestore(fullMessageData);

      const firestoreMessage = await addFirestoreMessage(activeChat.id, firestoreMessageData);
      const message = convertFirestoreMessageToMessage(firestoreMessage);
      message.sessionId = activeChat.id;
      
      return message;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [userId, activeChat]);

  // Add bot message
  const addBotMessage = useCallback(async (
    content: string,
    metadata?: Record<string, any>
  ): Promise<Message> => {
    if (!userId || !activeChat) throw new Error('User ID and active chat are required');
    if (!activeChat.id || activeChat.id.trim() === '') throw new Error('Active chat ID cannot be empty');
    
    try {
      const messageData = convertMessageToFirestore({
        sessionId: activeChat.id,
        content,
        type: 'text',
        userId: 'bot',
        status: 'delivered',
        isBot: true,
        metadata,
      });

      const firestoreMessage = await addFirestoreMessage(activeChat.id, messageData);
      const message = convertFirestoreMessageToMessage(firestoreMessage);
      message.sessionId = activeChat.id;
      
      return message;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [userId, activeChat]);

  // Update message status
  const updateMessage = useCallback(async (
    messageId: string,
    status: Message['status']
  ): Promise<void> => {
    if (!activeChat) return;
    if (!activeChat.id || activeChat.id.trim() === '') {
      return;
    }
    if (!messageId || messageId.trim() === '') {
      return;
    }
    
    try {
      await updateMessageStatus(activeChat.id, messageId, status);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [activeChat]);

  // Subscribe to chats
  // Clear all chat state when user changes
  useEffect(() => {
    const prevUserId = prevUserIdRef.current;
    
    // Clear state if user signs out
    if (!userId) {
      setChats([]);
      setActiveChatState(null);
      setMessages([]);
      setLoading(false);
      setMessagesLoading(false);
      setError(null);
      prevUserIdRef.current = null;
      return;
    }
    
    // Clear state if user switches to a different user
    if (prevUserId && prevUserId !== userId) {
      setChats([]);
      setActiveChatState(null);
      setMessages([]);
      setLoading(true); // Set loading true since we'll load new user's data
      setMessagesLoading(false);
      setError(null);
    }
    
    // Update the ref with current userId
    prevUserIdRef.current = userId;
  }, [userId]);

  useEffect(() => {
    if (!userId || !webhookId) {
      setChats([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    
    const unsubscribe = subscribeToWebhookChats(userId, webhookId, (firestoreChats) => {
      setChats(firestoreChats);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId, webhookId]);

  // Subscribe to messages for active chat
  useEffect(() => {
    if (!activeChat) {
      setMessages([]);
      return;
    }

    setMessagesLoading(true);

    const unsubscribe = subscribeToChatMessages(activeChat.id, (firestoreMessages) => {
      const convertedMessages = firestoreMessages.map(msg => {
        const message = convertFirestoreMessageToMessage(msg);
        message.sessionId = activeChat.id;
        return message;
      });
      
      setMessages(convertedMessages);
      setMessagesLoading(false);
    });

    return () => unsubscribe();
  }, [activeChat]);

  return {
    // Chat management
    chats,
    activeChat,
    setActiveChat,
    createNewChat,
    updateChat,
    deleteChat,
    cleanupEmptyChats,
    
    // Messages
    messages,
    messagesLoading,
    addMessage,
    addBotMessage,
    updateMessage,
    
    // State
    loading,
    error,
  };
};