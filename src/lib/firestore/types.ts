import { Timestamp } from 'firebase/firestore';

// Firestore document interfaces
export interface FirestoreUser {
  id: string;
  profile: {
    name?: string;
    email?: string;
    createdAt: Timestamp;
  };
  preferences: {
    theme: 'light' | 'dark';
    notifications: boolean;
  };
  webhooks: {
    activeWebhookId?: string;
    webhooks: FirestoreWebhook[];
  };
}

export interface FirestoreWebhook {
  id: string;
  name: string;
  url: string;
  secret?: string;
  isActive: boolean;
  createdAt: Timestamp;
}

export interface FirestoreChat {
  id: string;
  userId: string;
  webhookId: string;
  name: string;
  messageCount: number;
  lastActivity: Timestamp;
  createdAt: Timestamp;
}

export interface FirestoreMessage {
  id: string;
  content: string;
  type: 'text' | 'file' | 'image';
  userId: string;
  isBot: boolean;
  status: 'sending' | 'delivered' | 'failed';
  timestamp: Timestamp;
  metadata?: Record<string, any>;
}

export interface FirestoreMessageQueue {
  id: string;
  userId: string;
  chatId: string;
  message: FirestoreMessage;
  retryCount: number;
  nextRetryAt: Timestamp;
  createdAt: Timestamp;
}

// Conversion utilities for client-side types
export const convertTimestamp = (timestamp: Timestamp | any): string => {
  // Handle Firestore Timestamp objects
  if (timestamp && typeof timestamp.toDate === 'function') {
    return timestamp.toDate().toISOString();
  }
  
  // Handle JavaScript Date objects
  if (timestamp instanceof Date) {
    return timestamp.toISOString();
  }
  
  // Handle string timestamps
  if (typeof timestamp === 'string') {
    return new Date(timestamp).toISOString();
  }
  
  // Fallback to current date
  return new Date().toISOString();
};

export const createTimestamp = (date?: Date): Timestamp => {
  return Timestamp.fromDate(date || new Date());
};