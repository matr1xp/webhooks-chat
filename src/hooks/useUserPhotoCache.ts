'use client';

import { useState, useEffect, useCallback } from 'react';

interface CachedPhoto {
  url: string;
  dataUrl: string;
  timestamp: number;
  userId: string;
}

const CACHE_KEY = 'user_photo_cache';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Global pending requests map to prevent duplicate fetches
const pendingRequests = new Map<string, Promise<string>>();

/**
 * Custom hook to cache user profile photos in localStorage
 * Helps avoid 429 rate limiting errors when fetching photoURL repeatedly
 */
export function useUserPhotoCache() {
  const [cachedPhotos, setCachedPhotos] = useState<Map<string, CachedPhoto>>(new Map());

  // Load cached photos from localStorage on mount
  useEffect(() => {
    const loadCachedPhotos = () => {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsedCache = JSON.parse(cached);
          const photoMap = new Map<string, CachedPhoto>();
          
          // Convert array back to Map and filter expired entries
          const now = Date.now();
          parsedCache.forEach((photo: CachedPhoto) => {
            if (now - photo.timestamp < CACHE_EXPIRY) {
              photoMap.set(photo.userId, photo);
            }
          });
          
          setCachedPhotos(photoMap);
        }
      } catch (error) {
        console.warn('Failed to load photo cache from localStorage:', error);
      }
    };

    loadCachedPhotos();
  }, []);

  // Save cached photos to localStorage
  const saveCacheToStorage = useCallback((cache: Map<string, CachedPhoto>) => {
    try {
      const cacheArray = Array.from(cache.values());
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheArray));
    } catch (error) {
      console.warn('Failed to save photo cache to localStorage:', error);
    }
  }, []);

  // Convert image URL to data URL for caching
  const convertToDataUrl = useCallback(async (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      // Set timeout to prevent hanging requests
      const timeout = setTimeout(() => {
        reject(new Error('Image loading timeout'));
      }, 10000); // 10 second timeout
      
      img.onload = () => {
        clearTimeout(timeout);
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          // Resize image to reasonable size to reduce storage
          const maxSize = 200;
          const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
          const newWidth = img.width * scale;
          const newHeight = img.height * scale;

          canvas.width = newWidth;
          canvas.height = newHeight;
          
          ctx.drawImage(img, 0, 0, newWidth, newHeight);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve(dataUrl);
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('Failed to load image'));
      };
      
      // Add retry logic for Google Photos URLs with optimized parameters
      if (url.includes('googleusercontent.com')) {
        // For Google Photos, properly clean all size parameters and add our own
        let cleanUrl = url;
        
        // Remove all existing size parameters (=sXXX, =sXXX-c, =wXXX, =hXXX, etc.)
        cleanUrl = cleanUrl.replace(/=[swh]\d+(-[a-z])?/g, '');
        
        // Remove any trailing query parameters that might interfere
        if (cleanUrl.includes('?')) {
          cleanUrl = cleanUrl.split('?')[0];
        }
        
        // Add optimized size parameter to reduce load and avoid rate limits
        img.src = `${cleanUrl}=s200-c`;
      } else {
        img.src = url;
      }
    });
  }, []);

  // Get cached photo or fetch and cache if not available
  const getCachedPhoto = useCallback(async (userId: string, photoURL: string): Promise<string> => {
    const now = Date.now();
    
    // First check React state cache
    let cached = cachedPhotos.get(userId);
    
    // If not in React state, check localStorage directly (fallback for race conditions)
    if (!cached) {
      try {
        const localCache = localStorage.getItem(CACHE_KEY);
        if (localCache) {
          const parsedCache = JSON.parse(localCache);
          const userPhoto = parsedCache.find((photo: CachedPhoto) => photo.userId === userId);
          if (userPhoto && (now - userPhoto.timestamp) < CACHE_EXPIRY) {
            cached = userPhoto;
          }
        }
      } catch (error) {
        console.warn('Failed to check localStorage cache:', error);
      }
    }
    
    if (cached) {
      const age = now - cached.timestamp;
      const isUrlMatch = cached.url === photoURL;
      const isNotExpired = age < CACHE_EXPIRY;
      
      if (isUrlMatch && isNotExpired) {
        return cached.dataUrl;
      }
    }

    // Check if there's already a pending request for this photo
    const requestKey = `${userId}:${photoURL}`;
    const existingRequest = pendingRequests.get(requestKey);
    if (existingRequest) {
      return existingRequest;
    }

    // Create and store the promise for deduplication
    const fetchPromise = (async (): Promise<string> => {
      try {
        // Convert to data URL and cache it
        const dataUrl = await convertToDataUrl(photoURL);
        
        const cachedPhoto: CachedPhoto = {
          url: photoURL,
          dataUrl,
          timestamp: now,
          userId
        };

        // Update cache
        const newCache = new Map(cachedPhotos);
        newCache.set(userId, cachedPhoto);
        setCachedPhotos(newCache);
        
        // Save to localStorage
        saveCacheToStorage(newCache);
        
        return dataUrl;
      } catch (error) {
        console.warn(`[PhotoCache] Failed to cache photo for user ${userId}:`, error);
        throw error; // Don't fallback to original URL to prevent 429 errors
      } finally {
        // Clean up pending request
        pendingRequests.delete(requestKey);
      }
    })();

    // Store the promise to prevent duplicate requests
    pendingRequests.set(requestKey, fetchPromise);
    
    return fetchPromise;
  }, [cachedPhotos, convertToDataUrl, saveCacheToStorage]);

  // Clear expired entries from cache
  const clearExpiredCache = useCallback(() => {
    const now = Date.now();
    const newCache = new Map<string, CachedPhoto>();
    
    cachedPhotos.forEach((photo, userId) => {
      if ((now - photo.timestamp) < CACHE_EXPIRY) {
        newCache.set(userId, photo);
      }
    });
    
    if (newCache.size !== cachedPhotos.size) {
      setCachedPhotos(newCache);
      saveCacheToStorage(newCache);
    }
  }, [cachedPhotos, saveCacheToStorage]);

  // Clear all cached photos
  const clearAllCache = useCallback(() => {
    setCachedPhotos(new Map());
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch (error) {
      console.warn('Failed to clear photo cache from localStorage:', error);
    }
  }, []);

  // Get cache statistics
  const getCacheStats = useCallback(() => {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;
    
    cachedPhotos.forEach((photo) => {
      if ((now - photo.timestamp) < CACHE_EXPIRY) {
        validEntries++;
      } else {
        expiredEntries++;
      }
    });
    
    return {
      totalEntries: cachedPhotos.size,
      validEntries,
      expiredEntries,
      cacheExpiry: CACHE_EXPIRY
    };
  }, [cachedPhotos]);

  return {
    getCachedPhoto,
    clearExpiredCache,
    clearAllCache,
    getCacheStats
  };
}