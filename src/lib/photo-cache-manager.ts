'use client';

/**
 * Photo Cache Manager
 * Provides utilities for managing user photo cache
 */

const CACHE_KEY = 'user_photo_cache';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

interface CachedPhoto {
  url: string;
  dataUrl: string;
  timestamp: number;
  userId: string;
}

/**
 * Initialize cache cleanup on app start
 * This should be called once when the app starts
 */
export function initializePhotoCacheCleanup() {
  if (typeof window === 'undefined') return;
  
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return;
    
    const parsedCache = JSON.parse(cached);
    const now = Date.now();
    
    // Filter out expired entries
    const validEntries = parsedCache.filter((photo: CachedPhoto) => {
      return (now - photo.timestamp) < CACHE_EXPIRY;
    });
    
    // Update localStorage if we removed any expired entries
    if (validEntries.length !== parsedCache.length) {
      if (validEntries.length === 0) {
        localStorage.removeItem(CACHE_KEY);
      } else {
        localStorage.setItem(CACHE_KEY, JSON.stringify(validEntries));
      }
      
      console.log(`Photo cache cleanup: Removed ${parsedCache.length - validEntries.length} expired entries`);
    }
  } catch (error) {
    console.warn('Failed to cleanup photo cache:', error);
    // If there's an error, clear the cache to prevent future issues
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch (clearError) {
      console.warn('Failed to clear corrupted photo cache:', clearError);
    }
  }
}

/**
 * Get cache statistics for debugging
 */
export function getPhotoCacheStats() {
  if (typeof window === 'undefined') return null;
  
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) {
      return {
        totalEntries: 0,
        validEntries: 0,
        expiredEntries: 0,
        totalSize: 0,
        cacheExpiry: CACHE_EXPIRY
      };
    }
    
    const parsedCache = JSON.parse(cached);
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;
    let totalSize = 0;
    
    parsedCache.forEach((photo: CachedPhoto) => {
      totalSize += photo.dataUrl.length;
      if ((now - photo.timestamp) < CACHE_EXPIRY) {
        validEntries++;
      } else {
        expiredEntries++;
      }
    });
    
    return {
      totalEntries: parsedCache.length,
      validEntries,
      expiredEntries,
      totalSize,
      totalSizeKB: Math.round(totalSize / 1024),
      cacheExpiry: CACHE_EXPIRY
    };
  } catch (error) {
    console.warn('Failed to get photo cache stats:', error);
    return null;
  }
}

/**
 * Clear all cached photos
 */
export function clearPhotoCache() {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(CACHE_KEY);
    console.log('Photo cache cleared');
  } catch (error) {
    console.warn('Failed to clear photo cache:', error);
  }
}