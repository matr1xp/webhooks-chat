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
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          canvas.width = img.width;
          canvas.height = img.height;
          
          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          resolve(dataUrl);
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      
      img.src = url;
    });
  }, []);

  // Get cached photo or fetch and cache if not available
  const getCachedPhoto = useCallback(async (userId: string, photoURL: string): Promise<string> => {
    // Check if we have a valid cached version
    const cached = cachedPhotos.get(userId);
    const now = Date.now();
    
    if (cached && 
        cached.url === photoURL && 
        (now - cached.timestamp) < CACHE_EXPIRY) {
      return cached.dataUrl;
    }

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
      console.warn('Failed to cache photo, using original URL:', error);
      return photoURL; // Fallback to original URL
    }
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