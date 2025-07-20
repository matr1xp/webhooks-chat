import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { combineReducers } from '@reduxjs/toolkit';
import chatReducer from './chatSlice';
import configReducer from './configSlice';
import messageQueueReducer from './messageQueueSlice';

const persistConfig = {
  key: 'app-store-v3',
  version: 3,
  storage,
  whitelist: ['chat', 'config', 'messageQueue'], // Persist all slices
};

const rootReducer = combineReducers({
  chat: chatReducer,
  config: configReducer,
  messageQueue: messageQueueReducer,
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