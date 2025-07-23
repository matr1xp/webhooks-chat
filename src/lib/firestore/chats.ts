import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  increment,
} from 'firebase/firestore';
import { db } from '../firebase';
import { FirestoreChat, createTimestamp, convertTimestamp } from './types';

// Collection reference
const CHATS_COLLECTION = 'chats';

// Create new chat
export const createChat = async (
  chatId: string,
  userId: string,
  webhookId: string,
  name: string
): Promise<FirestoreChat> => {
  const chatRef = doc(db, CHATS_COLLECTION, chatId);
  
  const newChat: FirestoreChat = {
    id: chatId,
    userId,
    webhookId,
    name,
    messageCount: 0,
    lastActivity: createTimestamp(),
    createdAt: createTimestamp(),
  };
  
  await setDoc(chatRef, newChat);
  return newChat;
};

// Get chat by ID
export const getChat = async (chatId: string): Promise<FirestoreChat | null> => {
  const chatRef = doc(db, CHATS_COLLECTION, chatId);
  const chatSnap = await getDoc(chatRef);
  
  if (chatSnap.exists()) {
    return chatSnap.data() as FirestoreChat;
  }
  
  return null;
};

// Get all chats for a user
export const getUserChats = async (userId: string): Promise<FirestoreChat[]> => {
  const chatsQuery = query(
    collection(db, CHATS_COLLECTION),
    where('userId', '==', userId),
    orderBy('lastActivity', 'desc')
  );
  
  const querySnapshot = await getDocs(chatsQuery);
  return querySnapshot.docs.map(doc => doc.data() as FirestoreChat);
};

// Get chats for a specific webhook
export const getWebhookChats = async (userId: string, webhookId: string): Promise<FirestoreChat[]> => {
  const chatsQuery = query(
    collection(db, CHATS_COLLECTION),
    where('userId', '==', userId),
    where('webhookId', '==', webhookId),
    orderBy('lastActivity', 'desc')
  );
  
  const querySnapshot = await getDocs(chatsQuery);
  return querySnapshot.docs.map(doc => doc.data() as FirestoreChat);
};

// Update chat
export const updateChat = async (
  chatId: string,
  updates: Partial<Omit<FirestoreChat, 'id' | 'userId' | 'createdAt'>>
): Promise<void> => {
  const chatRef = doc(db, CHATS_COLLECTION, chatId);
  
  // Clean undefined values from updates
  const cleanUpdates: any = {
    lastActivity: createTimestamp(),
  };
  
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      cleanUpdates[key] = value;
    }
  }
  
  await updateDoc(chatRef, cleanUpdates);
};

// Update chat name
export const updateChatName = async (chatId: string, name: string): Promise<void> => {
  const chatRef = doc(db, CHATS_COLLECTION, chatId);
  
  await updateDoc(chatRef, {
    name,
    lastActivity: createTimestamp(),
  });
};

// Increment message count
export const incrementMessageCount = async (chatId: string): Promise<void> => {
  const chatRef = doc(db, CHATS_COLLECTION, chatId);
  
  await updateDoc(chatRef, {
    messageCount: increment(1),
    lastActivity: createTimestamp(),
  });
};

// Delete chat
export const deleteChat = async (chatId: string): Promise<void> => {
  const chatRef = doc(db, CHATS_COLLECTION, chatId);
  await deleteDoc(chatRef);
};

// Clean up empty chats (chats with 0 messages)
export const deleteEmptyChats = async (userId: string, webhookId?: string): Promise<number> => {
  const constraints = [
    where('userId', '==', userId),
    where('messageCount', '==', 0)
  ];
  
  if (webhookId) {
    constraints.push(where('webhookId', '==', webhookId));
  }
  
  const emptyChatsQuery = query(
    collection(db, CHATS_COLLECTION),
    ...constraints
  );
  
  const querySnapshot = await getDocs(emptyChatsQuery);
  const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
  
  await Promise.all(deletePromises);
  
  return querySnapshot.docs.length;
};

// Real-time listener for user's chats
export const subscribeToUserChats = (
  userId: string,
  callback: (chats: FirestoreChat[]) => void
) => {
  const chatsQuery = query(
    collection(db, CHATS_COLLECTION),
    where('userId', '==', userId),
    orderBy('lastActivity', 'desc')
  );
  
  return onSnapshot(chatsQuery, (querySnapshot) => {
    const chats = querySnapshot.docs.map(doc => doc.data() as FirestoreChat);
    callback(chats);
  });
};

// Real-time listener for webhook chats
export const subscribeToWebhookChats = (
  userId: string,
  webhookId: string,
  callback: (chats: FirestoreChat[]) => void
) => {
  const chatsQuery = query(
    collection(db, CHATS_COLLECTION),
    where('userId', '==', userId),
    where('webhookId', '==', webhookId),
    orderBy('lastActivity', 'desc')
  );
  
  return onSnapshot(chatsQuery, (querySnapshot) => {
    const chats = querySnapshot.docs.map(doc => doc.data() as FirestoreChat);
    callback(chats);
  });
};