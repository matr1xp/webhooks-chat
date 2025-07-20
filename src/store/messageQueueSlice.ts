import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { WebhookPayload } from '@/types/chat';

export interface QueuedMessage {
  id: string;
  payload: WebhookPayload;
  attempts: number;
  maxAttempts: number;
  nextRetry: number;
  lastError?: string;
}

interface MessageQueueState {
  queue: QueuedMessage[];
  isProcessing: boolean;
}

const initialState: MessageQueueState = {
  queue: [],
  isProcessing: false,
};

const RETRY_DELAYS = [1000, 2000, 5000, 10000, 30000]; // Exponential backoff

// Async thunk for processing queue (placeholder - actual implementation would need webhook client)
export const processQueue = createAsyncThunk(
  'messageQueue/processQueue',
  async (_, { getState, dispatch }) => {
    // This would contain the actual queue processing logic
    // For now, it's a placeholder since we don't have the webhook client here
    return;
  }
);

const messageQueueSlice = createSlice({
  name: 'messageQueue',
  initialState,
  reducers: {
    addToQueue: (state, action: PayloadAction<{ payload: WebhookPayload; maxAttempts?: number }>) => {
      const { payload, maxAttempts = 5 } = action.payload;
      
      // Prevent duplicate messages from being queued
      const existingItem = state.queue.find(item => item.id === payload.messageId);
      if (existingItem) {
        return;
      }

      const queuedMessage: QueuedMessage = {
        id: payload.messageId,
        payload,
        attempts: 0,
        maxAttempts,
        nextRetry: Date.now(),
      };

      state.queue.push(queuedMessage);
    },

    removeFromQueue: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      state.queue = state.queue.filter(item => item.id !== id);
    },

    updateQueueItem: (state, action: PayloadAction<{ id: string; updates: Partial<QueuedMessage> }>) => {
      const { id, updates } = action.payload;
      const itemIndex = state.queue.findIndex(item => item.id === id);
      if (itemIndex !== -1) {
        state.queue[itemIndex] = { ...state.queue[itemIndex], ...updates };
      }
    },

    clearQueue: (state) => {
      state.queue = [];
      state.isProcessing = false;
    },

    retryFailedMessage: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      const item = state.queue.find(item => item.id === id);
      if (item && item.attempts < item.maxAttempts) {
        item.attempts = 0;
        item.nextRetry = Date.now();
        item.lastError = undefined;
      }
    },

    setProcessing: (state, action: PayloadAction<boolean>) => {
      state.isProcessing = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(processQueue.pending, (state) => {
        state.isProcessing = true;
      })
      .addCase(processQueue.fulfilled, (state) => {
        state.isProcessing = false;
      })
      .addCase(processQueue.rejected, (state) => {
        state.isProcessing = false;
      });
  },
});

export const {
  addToQueue,
  removeFromQueue,
  updateQueueItem,
  clearQueue,
  retryFailedMessage,
  setProcessing,
} = messageQueueSlice.actions;

export default messageQueueSlice.reducer;