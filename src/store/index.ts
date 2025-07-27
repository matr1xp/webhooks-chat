import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { combineReducers } from '@reduxjs/toolkit';
import chatReducer from './chatSlice';
import configReducer from './configSlice';
import messageQueueReducer from './messageQueueSlice';
import fileCacheReducer from './fileCacheSlice';

// Create a robust storage engine that handles localStorage unavailability
const createStorage = () => {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    // Server-side: return noop storage
    return {
      getItem: () => Promise.resolve(null),
      setItem: () => Promise.resolve(),
      removeItem: () => Promise.resolve(),
    };
  }

  // Check if localStorage is available and accessible
  try {
    const testKey = '__redux-persist-test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    
    // If we get here, localStorage is working
    return storage;
  } catch (error) {
    console.warn('localStorage not available, falling back to noop storage:', error);
    
    // Fallback to noop storage
    return {
      getItem: () => Promise.resolve(null),
      setItem: () => Promise.resolve(),
      removeItem: () => Promise.resolve(),
    };
  }
};

const persistConfig = {
  key: 'app-store-v3',
  version: 3,
  storage: createStorage(),
  whitelist: ['chat', 'config', 'messageQueue', 'fileCache'], // Persist all slices
};

const rootReducer = combineReducers({
  chat: chatReducer,
  config: configReducer,
  messageQueue: messageQueueReducer,
  fileCache: fileCacheReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;