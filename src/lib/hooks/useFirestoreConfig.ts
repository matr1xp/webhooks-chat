import React, { useState, useEffect, useCallback } from 'react';
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
  
  // State
  loading: boolean;
  error: string | null;
}

export const useFirestoreConfig = (userId: string | null): UseFirestoreConfigReturn => {
  const [userProfile, setUserProfile] = useState<FirestoreUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get current values
  const theme = userProfile?.preferences.theme || 'light';
  const webhooks = userProfile?.webhooks.webhooks || [];
  const activeWebhook = webhooks.find(w => w.id === userProfile?.webhooks.activeWebhookId) || null;

  // Auto-set first webhook as active if none is set but webhooks exist
  React.useEffect(() => {
    if (userId && userProfile && webhooks.length > 0 && !userProfile.webhooks.activeWebhookId) {
      console.log('🔧 Auto-setting first webhook as active:', webhooks[0].name);
      // Use the setActiveWebhook function defined below
      const autoSetActive = async () => {
        try {
          // Get the most current user profile to avoid stale state
          const { getUserProfile } = await import('../firestore/users');
          const currentProfile = await getUserProfile(userId);
          
          if (!currentProfile) {
            throw new Error('User profile not found');
          }
          
          await updateUserWebhooks(userId, {
            ...currentProfile.webhooks,
            activeWebhookId: webhooks[0].id,
          });
        } catch (err: any) {
          console.error('Failed to auto-set active webhook:', err);
        }
      };
      autoSetActive();
    }
  }, [userId, userProfile, webhooks.length, userProfile?.webhooks.activeWebhookId]);

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
    
    const callId = Math.random().toString(36).substr(2, 9);
    console.log(`[${callId}] addWebhook called:`, { userId, userProfile: !!userProfile, name, url });
    
    // Wait for user profile to be loaded if it's not available yet
    let currentProfile = userProfile;
    if (!currentProfile) {
      console.log('User profile not loaded, waiting...');
      
      // Wait up to 5 seconds for profile to load, checking every 500ms
      for (let i = 0; i < 10 && !currentProfile; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        currentProfile = userProfile;
        console.log(`Wait attempt ${i + 1}: userProfile available = ${!!currentProfile}`);
      }
      
      // If still no profile, try to get it directly from Firestore
      if (!currentProfile) {
        console.log('Still no user profile, fetching directly from Firestore...');
        const { getUserProfile } = await import('../firestore/users');
        currentProfile = await getUserProfile(userId);
        console.log('Direct fetch result:', !!currentProfile);
        
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
      
      console.log(`[${callId}] Updating user webhooks with:`, webhookConfig);
      await updateUserWebhooks(userId, webhookConfig);
      console.log(`[${callId}] Webhook update completed`);

      return newWebhook;
    } catch (err: any) {
      console.error('Error in addWebhook:', err);
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

      const webhookConfig: any = {
        webhooks: updatedWebhooks,
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

  // Subscribe to user profile
  useEffect(() => {
    console.log('👀 useFirestoreConfig subscription effect:', { userId, hasUserId: !!userId });
    
    if (!userId) {
      console.log('❌ No userId, clearing profile');
      setUserProfile(null);
      setLoading(false);
      return;
    }

    console.log('🔄 Starting Firestore subscription for user:', userId);
    setLoading(true);

    const unsubscribe = subscribeToUser(userId, (profile) => {
      console.log('📊 User profile updated from Firestore:', {
        userId,
        profileExists: !!profile,
        webhooksCount: profile?.webhooks?.webhooks?.length || 0,
        webhooksList: profile?.webhooks?.webhooks?.map(w => ({ id: w.id, name: w.name })) || [],
        activeWebhookId: profile?.webhooks?.activeWebhookId,
        timestamp: new Date().toISOString()
      });
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
    
    // State
    loading,
    error,
  };
};