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
  deleteMessage as deleteFirestoreMessage,
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
  addBotMessage: (content: string, metadata?: Record<string, any>, source?: string) => Promise<Message>;
  updateMessage: (messageId: string, status: Message['status']) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  deleteBotReply: (userMessageId: string) => Promise<void>;
  
  // State
  loading: boolean;
  error: string | null;
}

export const useFirestoreChat = (
  userId: string | null,
  webhookId: string | null,
  getActiveChatId?: (webhookId: string) => string | null,
  setActiveChatId?: (webhookId: string, chatId: string | null) => Promise<void>
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
  const setActiveChat = useCallback(async (chatId: string | null) => {
    let shouldPersist = false;
    
    if (chatId) {
      setActiveChatState(prevActive => {
        // Only update if the chatId is different to prevent unnecessary re-renders
        if (prevActive?.id === chatId) return prevActive;
        
        const chat = chatsRef.current.find(c => c.id === chatId);
        const newChat = chat || null;
        
        // Only persist if we actually changed the active chat
        shouldPersist = newChat !== null && prevActive?.id !== chatId;
        
        return newChat;
      });
    } else {
      setActiveChatState(prevActive => {
        // Only persist if we actually had an active chat before
        shouldPersist = prevActive !== null;
        return prevActive === null ? prevActive : null;
      });
    }

    // Persist the active chat selection if we have the methods and webhook
    // BUT only if we actually changed the active chat to prevent loops
    if (setActiveChatId && webhookId && shouldPersist) {
      try {
        await setActiveChatId(webhookId, chatId);
      } catch (error) {
        // Log error but don't block the UI update
        console.error('Failed to persist active chat selection:', error);
      }
    }
  }, [setActiveChatId, webhookId]);

  // Create new chat
  const createNewChat = useCallback(async (webhookId: string, name?: string): Promise<FirestoreChat> => {
    if (!userId) throw new Error('User ID is required');
    
    try {
      const chatId = uuidv4();
      const chatName = name || `Chat ${new Date().toLocaleString()}`;
      
      const newChat = await createChat(chatId, userId, webhookId, chatName);
      
      // Automatically set the new chat as active
      await setActiveChat(newChat.id);
      
      return newChat;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [userId, setActiveChat]);

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
    metadata?: Record<string, any>,
    source?: string
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
        source,
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

  // Delete message
  const deleteMessage = useCallback(async (messageId: string): Promise<void> => {
    if (!activeChat) throw new Error('Active chat is required');
    if (!activeChat.id || activeChat.id.trim() === '') {
      throw new Error('Active chat ID cannot be empty');
    }
    if (!messageId || messageId.trim() === '') {
      throw new Error('Message ID cannot be empty');
    }
    
    try {
      await deleteFirestoreMessage(activeChat.id, messageId);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [activeChat]);

  // Delete bot reply following a user message
  const deleteBotReply = useCallback(async (userMessageId: string): Promise<void> => {
    if (!activeChat) throw new Error('Active chat is required');
    if (!userMessageId || userMessageId.trim() === '') {
      throw new Error('User message ID cannot be empty');
    }
    
    try {
      // Find the user message
      const userMessage = messages.find(msg => msg.id === userMessageId);
      if (!userMessage) {
        throw new Error('User message not found');
      }
      
      const userTimestamp = new Date(userMessage.timestamp).getTime();
      
      // Find the bot message with the closest timestamp after the user message
      // This ensures we get the actual reply, not just any bot message
      let closestBotMessage = null;
      let closestTimeDiff = Infinity;
      
      for (const msg of messages) {
        if (msg.isBot) {
          const botTimestamp = new Date(msg.timestamp).getTime();
          const timeDiff = botTimestamp - userTimestamp;
          
          // Only consider bot messages that come after the user message
          // and are within a reasonable time window (e.g., 10 minutes)
          if (timeDiff > 0 && timeDiff < 10 * 60 * 1000 && timeDiff < closestTimeDiff) {
            closestBotMessage = msg;
            closestTimeDiff = timeDiff;
          }
        }
      }
      
      if (closestBotMessage) {
        await deleteFirestoreMessage(activeChat.id, closestBotMessage.id);
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [activeChat, messages]);

  // Initialize active chat from persisted state when chats change
  useEffect(() => {
    if (!getActiveChatId || !webhookId || chats.length === 0) return;
    
    // Get the persisted active chat ID for this webhook
    const persistedChatId = getActiveChatId(webhookId);
    if (!persistedChatId) return;
    
    // Check if the persisted chat still exists in the current chats
    const persistedChat = chats.find(chat => chat.id === persistedChatId);
    if (persistedChat) {
      // Only set if it's different from current active chat to avoid unnecessary updates
      setActiveChatState(prevActive => {
        if (prevActive?.id === persistedChatId) {
          return prevActive;
        }
        return persistedChat;
      });
      // NOTE: We don't call setActiveChatId here because the chat is already persisted
      // This prevents the infinite loop during webhook switching
    } else {
      // Chat no longer exists, clear the persisted selection
      if (setActiveChatId) {
        setActiveChatId(webhookId, null).catch(console.error);
      }
    }
  }, [chats, webhookId, getActiveChatId, setActiveChatId]);

  // Subscribe to chats
  // Clear all chat state when user changes
  useEffect(() => {
    const prevUserId = prevUserIdRef.current;
    
    // console.log('👤 User changed:', { prevUserId, userId });
    
    // Clear state if user signs out
    if (!userId) {
      // console.log('🚪 User signed out, clearing chat state');
      setChats([]);
      setActiveChatState(null);
      setMessages([]);
      setLoading(false);
      setMessagesLoading(false);
      setError(null);
      prevUserIdRef.current = null;
      return;
    }
    
    // Clear state if user switches to a different user (not just going from null to user)
    if (prevUserId && prevUserId !== userId) {
      // console.log('🔄 User switched, clearing chat state:', { from: prevUserId, to: userId });
      setChats([]);
      setActiveChatState(null);
      setMessages([]);
      setLoading(true); // Set loading true since we'll load new user's data
      setMessagesLoading(false);
      setError(null);
    } else if (!prevUserId && userId) {
      // User is logging in for the first time this session - don't clear state, just log
      // console.log('👋 User logging in:', userId);
    }
    
    // Update the ref with current userId
    prevUserIdRef.current = userId;
  }, [userId]);

  useEffect(() => {
    if (!userId || !webhookId) {
      // console.log('📝 No user or webhook, clearing chats:', { userId: !!userId, webhookId: !!webhookId });
      setChats([]);
      setLoading(false);
      return;
    }

    // console.log('📝 Subscribing to chats for user/webhook:', { userId, webhookId });
    setLoading(true);
    
    const unsubscribe = subscribeToWebhookChats(userId, webhookId, (firestoreChats) => {
      // console.log('📝 Received', firestoreChats.length, 'chats from Firestore');
      setChats(firestoreChats);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId, webhookId]);

  // Subscribe to messages for active chat
  useEffect(() => {
    if (!activeChat?.id) {
      // Don't immediately clear messages when activeChat becomes null during transitions
      // Only clear after a short delay to avoid flickering during state changes
      // console.log('🗨️ No active chat detected');
      const timeoutId = setTimeout(() => {
        setMessages([]);
        setMessagesLoading(false);
        // console.log('🗨️ Cleared messages after timeout - no active chat');
      }, 100); // 100ms delay to allow for state transitions
      
      return () => clearTimeout(timeoutId);
    }

    // console.log('🗨️ Loading messages for chat:', activeChat.name, activeChat.id);
    setMessagesLoading(true);
    
    // Capture the chatId to prevent closure issues
    const chatId = activeChat.id;

    const unsubscribe = subscribeToChatMessages(chatId, (firestoreMessages) => {
      const convertedMessages = firestoreMessages.map(msg => {
        const message = convertFirestoreMessageToMessage(msg);
        message.sessionId = chatId;
        return message;
      });
      
      // console.log('✅ Loaded', convertedMessages.length, 'messages for chat:', activeChat.name);
      setMessages(convertedMessages);
      setMessagesLoading(false);
    });

    return () => unsubscribe();
  }, [activeChat?.id]);

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
    deleteMessage,
    deleteBotReply,
    
    // State
    loading,
    error,
  };
};