import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { FirestoreUser, createTimestamp, convertTimestamp } from './types';
import type { User } from '@/types/chat';

// Collection reference
const USERS_COLLECTION = 'users';

// Create or update user profile
export const createUserProfile = async (userId: string, userData: Partial<FirestoreUser['profile']>): Promise<void> => {
  const userRef = doc(db, USERS_COLLECTION, userId);
  
  // Check if user already exists to avoid overwriting existing data
  const userSnap = await getDoc(userRef);
  
  if (userSnap.exists()) {
    return;
  }
  
  // Build profile data without undefined values
  const profileData: any = {
    name: userData.name || 'Anonymous User',
    createdAt: createTimestamp(),
  };
  
  // Only add email if it's provided and not undefined
  if (userData.email) {
    profileData.email = userData.email;
  }
  
  const defaultUser: any = {
    id: userId,
    profile: profileData,
    preferences: {
      theme: 'light',
      notifications: true,
    },
    webhooks: {
      webhooks: [],
    },
  };
  
  // Only add activeWebhookId if we have one (avoid undefined)
  // This will be set later when a webhook is selected

  await setDoc(userRef, defaultUser, { merge: true });
};

// Get user profile
export const getUserProfile = async (userId: string): Promise<FirestoreUser | null> => {
  const userRef = doc(db, USERS_COLLECTION, userId);
  const userSnap = await getDoc(userRef);
  
  if (userSnap.exists()) {
    return userSnap.data() as FirestoreUser;
  }
  
  return null;
};

// Update user preferences
export const updateUserPreferences = async (
  userId: string,
  preferences: Partial<FirestoreUser['preferences']>
): Promise<void> => {
  const userRef = doc(db, USERS_COLLECTION, userId);
  
  // Clean undefined values from preferences
  const cleanPreferences: any = {};
  for (const [key, value] of Object.entries(preferences)) {
    if (value !== undefined) {
      cleanPreferences[key] = value;
    }
  }
  
  await updateDoc(userRef, {
    'preferences': cleanPreferences,
  });
};

// Update user webhooks
export const updateUserWebhooks = async (
  userId: string,
  webhooks: FirestoreUser['webhooks']
): Promise<void> => {
  
  if (!userId || userId.trim() === '') {
    throw new Error('userId cannot be empty');
  }
  
  const userRef = doc(db, USERS_COLLECTION, userId);
  
  // Clean undefined values from webhooks object
  const cleanWebhooks: any = {
    webhooks: webhooks.webhooks || [], // Ensure webhooks is never undefined
  };
  
  // Safety check: Don't allow empty webhooks array if activeWebhookId is set
  if (webhooks.activeWebhookId && (!webhooks.webhooks || webhooks.webhooks.length === 0)) {
    throw new Error('Cannot clear webhooks array when active webhook is set');
  }
  
  // Only add activeWebhookId if it's defined and not null
  if (webhooks.activeWebhookId !== undefined && webhooks.activeWebhookId !== null) {
    cleanWebhooks.activeWebhookId = webhooks.activeWebhookId;
  }
  
  try {
    await updateDoc(userRef, {
      'webhooks': cleanWebhooks,
    });
  } catch (error) {
    throw error;
  }
};

// Real-time listener for user data
export const subscribeToUser = (
  userId: string,
  callback: (user: FirestoreUser | null) => void
) => {
  const userRef = doc(db, USERS_COLLECTION, userId);
  
  return onSnapshot(userRef, (doc) => {
    if (doc.exists()) {
      callback(doc.data() as FirestoreUser);
    } else {
      callback(null);
    }
  });
};

// Convert Firestore user to client User type
export const convertFirestoreUserToUser = (firestoreUser: FirestoreUser): User => {
  return {
    id: firestoreUser.id,
    name: firestoreUser.profile.name,
  };
};