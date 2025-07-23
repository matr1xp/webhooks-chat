import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface FileCacheState {
  cache: Record<string, string>; // messageId -> base64 data
}

const initialState: FileCacheState = {
  cache: {},
};

const fileCacheSlice = createSlice({
  name: 'fileCache',
  initialState,
  reducers: {
    setFileData: (state, action: PayloadAction<{ messageId: string; data: string }>) => {
      state.cache[action.payload.messageId] = action.payload.data;
    },
    removeFileData: (state, action: PayloadAction<string>) => {
      delete state.cache[action.payload];
    },
    clearFileCache: (state) => {
      state.cache = {};
    },
    // Cleanup old entries to prevent localStorage from growing too large
    cleanupOldEntries: (state, action: PayloadAction<string[]>) => {
      const activeMessageIds = action.payload;
      const currentKeys = Object.keys(state.cache);
      
      // Remove entries that are no longer associated with active messages
      currentKeys.forEach(messageId => {
        if (!activeMessageIds.includes(messageId)) {
          delete state.cache[messageId];
        }
      });
    },
  },
});

export const { setFileData, removeFileData, clearFileCache, cleanupOldEntries } = fileCacheSlice.actions;
export default fileCacheSlice.reducer;