import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  collection,
  query,
  where,
  orderBy,
  Timestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { FirestorePromptConfig } from './types';
import { createTimestamp } from './types';

// Collection reference
const PROMPTS_COLLECTION = 'prompts';

/**
 * Get prompt configuration for a specific webhook
 */
export const getPromptConfig = async (webhookName: string): Promise<FirestorePromptConfig | null> => {
  try {
    if (!webhookName) {
      throw new Error('Webhook name is required');
    }

    const docRef = doc(db, PROMPTS_COLLECTION, webhookName);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        webhookName: data.webhookName,
        title: data.title,
        suggestions: data.suggestions || [],
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        isActive: data.isActive ?? true,
      } as FirestorePromptConfig;
    }

    return null;
  } catch (error) {
    console.error('Error getting prompt config:', error);
    throw error;
  }
};

/**
 * Subscribe to real-time updates for a prompt configuration
 */
export const subscribeToPromptConfig = (
  webhookName: string,
  callback: (config: FirestorePromptConfig | null) => void
): Unsubscribe => {
  if (!webhookName) {
    callback(null);
    return () => {};
  }

  const docRef = doc(db, PROMPTS_COLLECTION, webhookName);

  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const config: FirestorePromptConfig = {
          id: docSnap.id,
          webhookName: data.webhookName,
          title: data.title,
          suggestions: data.suggestions || [],
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          isActive: data.isActive ?? true,
        };
        callback(config);
      } else {
        callback(null);
      }
    },
    (error) => {
      console.error('Error subscribing to prompt config:', error);
      callback(null);
    }
  );
};

/**
 * Create or update a prompt configuration
 */
export const setPromptConfig = async (
  webhookName: string,
  config: Omit<FirestorePromptConfig, 'id' | 'createdAt' | 'updatedAt'>
): Promise<void> => {
  try {
    if (!webhookName) {
      throw new Error('Webhook name is required');
    }

    const docRef = doc(db, PROMPTS_COLLECTION, webhookName);
    const now = createTimestamp();

    // Check if document exists to determine if this is create or update
    const existingDoc = await getDoc(docRef);
    const isUpdate = existingDoc.exists();

    const promptData = {
      ...config,
      webhookName,
      updatedAt: now,
      ...(isUpdate ? {} : { createdAt: now }),
    };

    await setDoc(docRef, promptData, { merge: true });
  } catch (error) {
    console.error('Error setting prompt config:', error);
    throw error;
  }
};

/**
 * Update specific fields of a prompt configuration
 */
export const updatePromptConfig = async (
  webhookName: string,
  updates: Partial<Omit<FirestorePromptConfig, 'id' | 'webhookName' | 'createdAt' | 'updatedAt'>>
): Promise<void> => {
  try {
    if (!webhookName) {
      throw new Error('Webhook name is required');
    }

    const docRef = doc(db, PROMPTS_COLLECTION, webhookName);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: createTimestamp(),
    });
  } catch (error) {
    console.error('Error updating prompt config:', error);
    throw error;
  }
};

/**
 * Get all active prompt configurations
 */
export const getAllActivePromptConfigs = async (): Promise<FirestorePromptConfig[]> => {
  try {
    const q = query(
      collection(db, PROMPTS_COLLECTION),
      where('isActive', '==', true),
      orderBy('webhookName')
    );

    // Note: This would require a composite index in Firestore
    // For now, we'll use getDoc for individual webhook queries
    // and implement this function later if needed for admin interfaces
    
    throw new Error('getAllActivePromptConfigs requires composite index setup');
  } catch (error) {
    console.error('Error getting all active prompt configs:', error);
    throw error;
  }
};

/**
 * Delete a prompt configuration
 */
export const deletePromptConfig = async (webhookName: string): Promise<void> => {
  try {
    if (!webhookName) {
      throw new Error('Webhook name is required');
    }

    const docRef = doc(db, PROMPTS_COLLECTION, webhookName);
    
    // Instead of deleting, we'll mark as inactive for data retention
    await updateDoc(docRef, {
      isActive: false,
      updatedAt: createTimestamp(),
    });
  } catch (error) {
    console.error('Error deleting prompt config:', error);
    throw error;
  }
};

/**
 * Create default prompt configuration for a webhook
 */
export const createDefaultPromptConfig = async (
  webhookName: string,
  title?: string
): Promise<FirestorePromptConfig> => {
  const defaultConfig: Omit<FirestorePromptConfig, 'id' | 'createdAt' | 'updatedAt'> = {
    webhookName,
    title: title || `I'm an AI powered assistant`,
    suggestions: [
      "What can you help me with?",
      "Tell me about your capabilities",
      "How can I get started?",
      "Show me some examples",
      "Help me with a specific task",
      "What are the best practices?"
    ],
    isActive: true,
  };

  await setPromptConfig(webhookName, defaultConfig);
  
  // Return the created config
  const createdConfig = await getPromptConfig(webhookName);
  if (!createdConfig) {
    throw new Error('Failed to create default prompt configuration');
  }
  
  return createdConfig;
};