import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { FirestoreMessage, createTimestamp, convertTimestamp } from './types';
import { incrementMessageCount, decrementMessageCount } from './chats';
import type { Message } from '@/types/chat';

// Collection reference
const getMessagesCollection = (chatId: string) => {
  if (!chatId || chatId.trim() === '') {
    throw new Error('getMessagesCollection: chatId cannot be empty');
  }
  return collection(db, 'messages', chatId, 'messages');
};

// Add message to chat
export const addMessage = async (
  chatId: string,
  messageData: Omit<FirestoreMessage, 'id' | 'timestamp'>
): Promise<FirestoreMessage> => {
  if (!chatId || chatId.trim() === '') {
    throw new Error('chatId cannot be empty');
  }
  
  const messagesRef = getMessagesCollection(chatId);
  
  const newMessage: Omit<FirestoreMessage, 'id'> = {
    ...messageData,
    timestamp: createTimestamp(),
  };
  
  const docRef = await addDoc(messagesRef, newMessage);
  
  // Update chat message count and last activity
  await incrementMessageCount(chatId);
  
  return {
    id: docRef.id,
    ...newMessage,
  };
};

// Get messages for a chat
export const getChatMessages = async (
  chatId: string,
  messageLimit: number = 100
): Promise<FirestoreMessage[]> => {
  const messagesQuery = query(
    getMessagesCollection(chatId),
    orderBy('timestamp', 'desc'),
    limit(messageLimit)
  );
  
  const querySnapshot = await getDocs(messagesQuery);
  return querySnapshot.docs
    .map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as FirestoreMessage))
    .reverse(); // Reverse to show oldest first
};

// Update message status
export const updateMessageStatus = async (
  chatId: string,
  messageId: string,
  status: FirestoreMessage['status']
): Promise<void> => {
  if (!chatId || chatId.trim() === '') {
    throw new Error('chatId cannot be empty');
  }
  if (!messageId || messageId.trim() === '') {
    throw new Error('messageId cannot be empty');
  }
  
  const messageRef = doc(getMessagesCollection(chatId), messageId);
  
  await updateDoc(messageRef, {
    status,
  });
};

// Update message content (for editing)
export const updateMessageContent = async (
  chatId: string,
  messageId: string,
  content: string
): Promise<void> => {
  if (!chatId || chatId.trim() === '') {
    throw new Error('chatId cannot be empty');
  }
  if (!messageId || messageId.trim() === '') {
    throw new Error('messageId cannot be empty');
  }
  
  const messageRef = doc(getMessagesCollection(chatId), messageId);
  
  // Only update if content is not undefined
  if (content !== undefined) {
    await updateDoc(messageRef, {
      content,
    });
  }
};

// Delete message
export const deleteMessage = async (chatId: string, messageId: string): Promise<void> => {
  if (!chatId || chatId.trim() === '') {
    throw new Error('chatId cannot be empty');
  }
  if (!messageId || messageId.trim() === '') {
    throw new Error('messageId cannot be empty');
  }
  
  const messageRef = doc(getMessagesCollection(chatId), messageId);
  await deleteDoc(messageRef);
  
  // Decrement the message count in the chat
  await decrementMessageCount(chatId);
};

// Delete all messages in a chat
export const clearChatMessages = async (chatId: string): Promise<void> => {
  const messagesQuery = query(getMessagesCollection(chatId));
  const querySnapshot = await getDocs(messagesQuery);
  
  const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
  await Promise.all(deletePromises);
};

// Real-time listener for chat messages
export const subscribeToChatMessages = (
  chatId: string,
  callback: (messages: FirestoreMessage[]) => void,
  messageLimit: number = 100
) => {
  const messagesQuery = query(
    getMessagesCollection(chatId),
    orderBy('timestamp', 'desc'),
    limit(messageLimit)
  );
  
  return onSnapshot(messagesQuery, (querySnapshot) => {
    const messages = querySnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as FirestoreMessage))
      .reverse(); // Reverse to show oldest first
    
    callback(messages);
  });
};

// Convert Firestore message to client Message type
export const convertFirestoreMessageToMessage = (
  firestoreMessage: FirestoreMessage
): Message => {
  return {
    id: firestoreMessage.id,
    sessionId: '', // Will be set by the calling context
    type: firestoreMessage.type,
    content: firestoreMessage.content,
    timestamp: convertTimestamp(firestoreMessage.timestamp),
    userId: firestoreMessage.userId,
    status: firestoreMessage.status,
    isBot: firestoreMessage.isBot,
    source: firestoreMessage.source,
    metadata: firestoreMessage.metadata,
    fileData: (firestoreMessage as any).fileData,
  };
};

// Convert client Message to Firestore format
export const convertMessageToFirestore = (
  message: Omit<Message, 'id' | 'timestamp'>
): Omit<FirestoreMessage, 'id' | 'timestamp'> => {
  // Validate required fields
  if (!message.content || typeof message.content !== 'string') {
    throw new Error('Message content is required and must be a string');
  }
  if (!message.type || !['text', 'file', 'image'].includes(message.type)) {
    throw new Error('Message type is required and must be text, file, or image');
  }
  if (!message.userId || typeof message.userId !== 'string') {
    throw new Error('Message userId is required and must be a string');
  }
  
  const firestoreMessage: any = {
    content: message.content,
    type: message.type,
    userId: message.userId,
    status: message.status || 'sending',
    isBot: message.isBot || false,
  };
  
  // Only add source if it's defined and not null
  if (message.source !== undefined && message.source !== null) {
    firestoreMessage.source = message.source;
  }
  
  // Only add metadata if it's defined and not null
  if (message.metadata !== undefined && message.metadata !== null) {
    firestoreMessage.metadata = message.metadata;
  }
  
  // Only add fileData if it's defined and not null
  if (message.fileData !== undefined && message.fileData !== null) {
    firestoreMessage.fileData = message.fileData;
  }
  
  return firestoreMessage;
};