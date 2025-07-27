import React, { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  updateUserWebhooks,
  updateUserPreferences,
  subscribeToUser,
} from '../firestore/users';
import type { FirestoreUser, FirestoreWebhook } from '../firestore/types';
import { createTimestamp } from '../firestore/types';

interface UseFirestoreConfigReturn {
  // User preferences
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => Promise<void>;
  
  // Webhooks
  webhooks: FirestoreWebhook[];
  activeWebhook: FirestoreWebhook | null;
  setActiveWebhook: (webhookId: string) => Promise<void>;
  addWebhook: (name: string, url: string, secret?: string) => Promise<FirestoreWebhook>;
  updateWebhook: (webhookId: string, updates: Partial<Omit<FirestoreWebhook, 'id' | 'createdAt'>>) => Promise<void>;
  deleteWebhook: (webhookId: string) => Promise<void>;
  
  // Active chat persistence
  getActiveChatId: (webhookId: string) => string | null;
  setActiveChatId: (webhookId: string, chatId: string | null) => Promise<void>;
  
  // State
  loading: boolean;
  error: string | null;
}

export const useFirestoreConfig = (userId: string | null): UseFirestoreConfigReturn => {
  const [userProfile, setUserProfile] = useState<FirestoreUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Track auto-assignment to prevent infinite loops
  const autoAssignmentRef = useRef<Set<string>>(new Set());

  // Get current values
  const theme = userProfile?.preferences.theme || 'light';
  const webhooks = userProfile?.webhooks.webhooks || [];
  const activeWebhook = webhooks.find(w => w.id === userProfile?.webhooks.activeWebhookId) || null;

  // Auto-set first webhook as active if none is set but webhooks exist
  React.useEffect(() => {
    if (!userId || !userProfile || webhooks.length === 0 || userProfile.webhooks.activeWebhookId) {
      return;
    }
    
    // Create a unique key for this auto-assignment attempt
    const assignmentKey = `${userId}-${webhooks[0]?.id}`;
    
    // Skip if we've already tried to auto-assign for this user/webhook combination
    if (autoAssignmentRef.current.has(assignmentKey)) {
      return;
    }
    
    // Mark this assignment as attempted to prevent loops
    autoAssignmentRef.current.add(assignmentKey);
    
    const autoSetActive = async () => {
      try {
        // Get the most current user profile to avoid stale state
        const { getUserProfile } = await import('../firestore/users');
        const currentProfile = await getUserProfile(userId);
        
        if (!currentProfile) {
          throw new Error('User profile not found');
        }
        
        // Double-check that we still need to set an active webhook
        if (!currentProfile.webhooks.activeWebhookId && webhooks.length > 0) {
          await updateUserWebhooks(userId, {
            ...currentProfile.webhooks,
            activeWebhookId: webhooks[0].id,
          });
        }
      } catch (err: any) {
        // Remove from attempted set if it failed, so we can retry later
        autoAssignmentRef.current.delete(assignmentKey);
      }
    };
    
    autoSetActive();
  }, [userId, webhooks.length, userProfile?.webhooks.activeWebhookId]); // Removed userProfile from dependencies

  // Set theme
  const setTheme = useCallback(async (newTheme: 'light' | 'dark'): Promise<void> => {
    if (!userId || !userProfile) return;
    
    try {
      await updateUserPreferences(userId, {
        ...userProfile.preferences,
        theme: newTheme,
      });
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [userId, userProfile]);

  // Set active webhook
  const setActiveWebhook = useCallback(async (webhookId: string): Promise<void> => {
    if (!userId) throw new Error('User ID required');
    
    try {
      // Get the most current user profile to avoid stale state
      const { getUserProfile } = await import('../firestore/users');
      const currentProfile = await getUserProfile(userId);
      
      if (!currentProfile) {
        throw new Error('User profile not found');
      }
      
      await updateUserWebhooks(userId, {
        ...currentProfile.webhooks,
        activeWebhookId: webhookId,
      });
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [userId]);

  // Add webhook
  const addWebhook = useCallback(async (
    name: string,
    url: string,
    secret?: string
  ): Promise<FirestoreWebhook> => {
    if (!userId) throw new Error('User ID required');
    
    // Wait for user profile to be loaded if it's not available yet
    let currentProfile = userProfile;
    if (!currentProfile) {
      
      // Wait up to 5 seconds for profile to load, checking every 500ms
      for (let i = 0; i < 10 && !currentProfile; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        currentProfile = userProfile;
      }
      
      // If still no profile, try to get it directly from Firestore
      if (!currentProfile) {
        const { getUserProfile } = await import('../firestore/users');
        currentProfile = await getUserProfile(userId);
        
        if (!currentProfile) {
          throw new Error('User profile could not be loaded. Please try refreshing the page.');
        }
      }
    }
    
    try {
      const webhookData: any = {
        id: uuidv4(),
        name,
        url,
        isActive: true,
        createdAt: createTimestamp(),
      };
      
      // Only add secret if provided (avoid undefined)
      if (secret) {
        webhookData.secret = secret;
      }
      
      const newWebhook: FirestoreWebhook = webhookData;
      const updatedWebhooks = [...currentProfile.webhooks.webhooks, newWebhook];
      
      const webhookConfig: any = {
        webhooks: updatedWebhooks,
      };
      
      // Set as active if it's the first webhook or no active webhook
      if (!currentProfile.webhooks.activeWebhookId) {
        webhookConfig.activeWebhookId = newWebhook.id;
      } else {
        webhookConfig.activeWebhookId = currentProfile.webhooks.activeWebhookId;
      }
      
      await updateUserWebhooks(userId, webhookConfig);

      return newWebhook;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [userId, userProfile]);

  // Update webhook
  const updateWebhook = useCallback(async (
    webhookId: string,
    updates: Partial<Omit<FirestoreWebhook, 'id' | 'createdAt'>>
  ): Promise<void> => {
    if (!userId || !userProfile) return;
    
    try {
      // Clean undefined values from updates
      const cleanUpdates: any = {};
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) {
          cleanUpdates[key] = value;
        }
      }
      
      const updatedWebhooks = userProfile.webhooks.webhooks.map(webhook =>
        webhook.id === webhookId
          ? { ...webhook, ...cleanUpdates }
          : webhook
      );

      await updateUserWebhooks(userId, {
        ...userProfile.webhooks,
        webhooks: updatedWebhooks,
      });
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [userId, userProfile]);

  // Delete webhook
  const deleteWebhook = useCallback(async (webhookId: string): Promise<void> => {
    if (!userId || !userProfile) return;
    
    try {
      const updatedWebhooks = userProfile.webhooks.webhooks.filter(w => w.id !== webhookId);
      
      // If deleting the active webhook, set a new one or clear it
      const newActiveWebhookId = userProfile.webhooks.activeWebhookId === webhookId
        ? (updatedWebhooks[0]?.id || null)
        : userProfile.webhooks.activeWebhookId;

      // Clean up active chat ID for the deleted webhook
      const updatedActiveChatIds = { ...userProfile.webhooks.activeChatIds };
      if (updatedActiveChatIds && webhookId in updatedActiveChatIds) {
        delete updatedActiveChatIds[webhookId];
      }

      const webhookConfig: any = {
        webhooks: updatedWebhooks,
        activeChatIds: updatedActiveChatIds,
      };
      
      // Only add activeWebhookId if it's not null/undefined
      if (newActiveWebhookId) {
        webhookConfig.activeWebhookId = newActiveWebhookId;
      }

      await updateUserWebhooks(userId, webhookConfig);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [userId, userProfile]);

  // Get active chat ID for a webhook
  const getActiveChatId = useCallback((webhookId: string): string | null => {
    if (!userProfile?.webhooks.activeChatIds) return null;
    return userProfile.webhooks.activeChatIds[webhookId] || null;
  }, [userProfile]);

  // Set active chat ID for a webhook
  const setActiveChatId = useCallback(async (webhookId: string, chatId: string | null): Promise<void> => {
    if (!userId || !userProfile) return;
    
    try {
      // Get current active chat IDs or initialize empty object
      const currentActiveChatIds = userProfile.webhooks.activeChatIds || {};
      
      // Update the mapping
      const updatedActiveChatIds = { ...currentActiveChatIds };
      if (chatId) {
        updatedActiveChatIds[webhookId] = chatId;
      } else {
        // Remove the mapping if chatId is null
        delete updatedActiveChatIds[webhookId];
      }

      await updateUserWebhooks(userId, {
        ...userProfile.webhooks,
        activeChatIds: updatedActiveChatIds,
      });
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [userId, userProfile]);

  // Subscribe to user profile
  useEffect(() => {
    if (!userId) {
      setUserProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubscribe = subscribeToUser(userId, (profile) => {
      setUserProfile(profile);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  return {
    // User preferences
    theme,
    setTheme,
    
    // Webhooks
    webhooks,
    activeWebhook,
    setActiveWebhook,
    addWebhook,
    updateWebhook,
    deleteWebhook,
    
    // Active chat persistence
    getActiveChatId,
    setActiveChatId,
    
    // State
    loading,
    error,
  };
};