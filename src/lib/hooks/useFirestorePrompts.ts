import { getPromptConfig, subscribeToPromptConfig } from '../firestore/prompts';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { FirestorePromptConfig } from '../firestore/types';

// Default fallback suggestions
const DEFAULT_SUGGESTIONS = [
  "I would like to know about ChatGPT",
  "I need to research about latest AI developments",
  "Plan an 5-day itinerary to Paris",
  "Create a cover letter for this job ad"  
];

const DEFAULT_TITLE = "I'm an AI powered booking expert and I have a few questions for you";

interface CacheEntry {
  config: FirestorePromptConfig;
  timestamp: number;
  webhookName: string;
}

interface UseFirestorePromptsReturn {
  promptConfig: {
    title: string;
    suggestions: Array<{ title: string; highlighted: boolean }>;
  };
  loading: boolean;
  error: string | null;
  retry: () => void;
  isUsingFallback: boolean;
}

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, CacheEntry>();

export const useFirestorePrompts = (webhookName?: string | null): UseFirestorePromptsReturn => {
  const [promptConfig, setPromptConfig] = useState<FirestorePromptConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUsingFallback, setIsUsingFallback] = useState(false);
  
  // Track the current webhook to handle changes
  const currentWebhookRef = useRef<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Check cache for valid entry
  const getCachedConfig = useCallback((name: string): FirestorePromptConfig | null => {
    const cached = cache.get(name);
    if (!cached) return null;
    
    const now = Date.now();
    const isExpired = now - cached.timestamp > CACHE_DURATION;
    
    if (isExpired) {
      cache.delete(name);
      return null;
    }
    
    return cached.config;
  }, []);

  // Cache a configuration
  const setCachedConfig = useCallback((name: string, config: FirestorePromptConfig) => {
    cache.set(name, {
      config,
      timestamp: Date.now(),
      webhookName: name,
    });
  }, []);

  // Create fallback configuration
  const createFallbackConfig = useCallback((name?: string): FirestorePromptConfig => {
    return {
      id: name || 'fallback',
      webhookName: name || 'Default',
      title: DEFAULT_TITLE,
      suggestions: DEFAULT_SUGGESTIONS,
      createdAt: new Date() as any, // Mock timestamp
      updatedAt: new Date() as any, // Mock timestamp
      isActive: true,
    };
  }, []);

  // Load prompt configuration
  const loadPromptConfig = useCallback(async (name: string, useCache = true) => {
    try {
      setError(null);
      
      // Check cache first if enabled
      if (useCache) {
        const cached = getCachedConfig(name);
        if (cached) {
          setPromptConfig(cached);
          setIsUsingFallback(false);
          return;
        }
      }
      
      setLoading(true);
      
      // Try to fetch from Firestore
      const config = await getPromptConfig(name);
      
      if (config && config.isActive) {
        setPromptConfig(config);
        setCachedConfig(name, config);
        setIsUsingFallback(false);
      } else {
        // Use fallback if no config found or inactive
        const fallbackConfig = createFallbackConfig(name);
        setPromptConfig(fallbackConfig);
        setIsUsingFallback(true);
      }
    } catch (err: any) {
      console.error('Error loading prompt config:', err);
      setError(err.message || 'Failed to load prompts');
      
      // Use fallback on error
      const fallbackConfig = createFallbackConfig(name);
      setPromptConfig(fallbackConfig);
      setIsUsingFallback(true);
    } finally {
      setLoading(false);
    }
  }, [getCachedConfig, setCachedConfig, createFallbackConfig]);

  // Subscribe to real-time updates
  const subscribeToUpdates = useCallback((name: string) => {
    // Clean up existing subscription
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    // Subscribe to real-time updates
    const unsubscribe = subscribeToPromptConfig(name, (config) => {
      if (config && config.isActive) {
        setPromptConfig(config);
        setCachedConfig(name, config);
        setIsUsingFallback(false);
        setError(null);
      } else if (!config) {
        // Document doesn't exist, use fallback
        const fallbackConfig = createFallbackConfig(name);
        setPromptConfig(fallbackConfig);
        setIsUsingFallback(true);
      }
      // If config exists but is inactive, keep current config
    });

    unsubscribeRef.current = unsubscribe;
  }, [setCachedConfig, createFallbackConfig]);

  // Retry function
  const retry = useCallback(() => {
    if (currentWebhookRef.current) {
      loadPromptConfig(currentWebhookRef.current, false); // Skip cache on retry
    }
  }, [loadPromptConfig]);

  // Main effect - handle webhook changes
  useEffect(() => {
    // Handle webhook name changes
    if (webhookName && webhookName !== currentWebhookRef.current) {
      currentWebhookRef.current = webhookName;
      
      // Load initial data
      loadPromptConfig(webhookName);
      
      // Subscribe to real-time updates
      subscribeToUpdates(webhookName);
    } else if (!webhookName && currentWebhookRef.current) {
      // No webhook selected, use fallback
      currentWebhookRef.current = null;
      setPromptConfig(createFallbackConfig());
      setIsUsingFallback(true);
      setLoading(false);
      setError(null);
      
      // Clean up subscription
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    }
  }, [webhookName, loadPromptConfig, subscribeToUpdates, createFallbackConfig]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  // Transform config for component usage
  const transformedConfig = {
    title: promptConfig?.title || DEFAULT_TITLE,
    suggestions: (promptConfig?.suggestions || DEFAULT_SUGGESTIONS).map((suggestion) => ({
      title: suggestion,
      highlighted: false, // Could be enhanced later for specific highlighting logic
    })),
  };

  return {
    promptConfig: transformedConfig,
    loading,
    error,
    retry,
    isUsingFallback,
  };
};