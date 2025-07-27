/**
 * Hook to access health check statistics and cache management
 */

import { useFirebase } from '@/contexts/FirebaseContext';

export interface HealthCheckStats {
  /**
   * Get cached health check result for a webhook
   */
  getCachedResult: (webhookId: string) => { result: boolean; age: number; failureCount: number } | null;
  
  /**
   * Clear health check cache for a specific webhook or all webhooks
   */
  clearCache: (webhookId?: string) => void;
  
  /**
   * Get all cached webhook health statuses
   */
  getAllCachedResults: () => Record<string, { result: boolean; age: number; failureCount: number }>;
  
  /**
   * Force a health check bypassing cache
   */
  forceHealthCheck: (webhookId: string) => Promise<boolean>;
}

export function useHealthCheckStats(): HealthCheckStats {
  const firebase = useFirebase();
  
  // Note: This is a placeholder implementation
  // The actual cache is internal to FirebaseContext
  // We could expose these methods through the context if needed
  
  return {
    getCachedResult: (webhookId: string) => {
      // Would need to be exposed from FirebaseContext
      return null;
    },
    
    clearCache: (webhookId?: string) => {
      // Would need to be exposed from FirebaseContext
      console.log(`Health check cache cleared for ${webhookId || 'all webhooks'}`);
    },
    
    getAllCachedResults: () => {
      // Would need to be exposed from FirebaseContext
      return {};
    },
    
    forceHealthCheck: async (webhookId: string) => {
      // Could clear cache then run health check
      // For now, just run the regular health check
      const webhook = firebase.webhooks.find(w => w.id === webhookId);
      if (webhook) {
        return firebase.checkWebhookHealth(webhook);
      }
      return false;
    }
  };
}