'use client';

import { useEffect } from 'react';
import { initializePhotoCacheCleanup } from '@/lib/photo-cache-manager';

/**
 * Client-side component to initialize photo cache cleanup
 * This runs once when the app starts and cleans up expired cached photos
 */
export function PhotoCacheInitializer() {
  useEffect(() => {
    // Initialize cache cleanup on app start
    initializePhotoCacheCleanup();
    
    // Set up periodic cleanup (every hour)
    const cleanupInterval = setInterval(() => {
      initializePhotoCacheCleanup();
    }, 60 * 60 * 1000); // 1 hour

    return () => {
      clearInterval(cleanupInterval);
    };
  }, []);

  return null; // This component doesn't render anything
}