'use client';

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { WebhookPayload } from '@/types/chat';

export interface QueuedMessage {
  id: string;
  payload: WebhookPayload;
  attempts: number;
  maxAttempts: number;
  nextRetry: number;
  lastError?: string;
}

interface MessageQueueStore {
  queue: QueuedMessage[];
  isProcessing: boolean;
  addToQueue: (payload: WebhookPayload, maxAttempts?: number) => void;
  removeFromQueue: (id: string) => void;
  updateQueueItem: (id: string, updates: Partial<QueuedMessage>) => void;
  processQueue: () => Promise<void>;
  clearQueue: () => void;
  getFailedMessages: () => QueuedMessage[];
  retryFailedMessage: (id: string) => void;
}

const RETRY_DELAYS = [1000, 2000, 5000, 10000, 30000]; // Exponential backoff

export const useMessageQueue = create<MessageQueueStore>()(
  devtools(
    persist(
      (set, get) => ({
        queue: [],
        isProcessing: false,

        addToQueue: (payload, maxAttempts = 5) => {
          // Prevent duplicate messages from being queued
          const { queue } = get();
          const existingItem = queue.find(item => item.id === payload.messageId);
          
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

          set((state) => ({
            queue: [...state.queue, queuedMessage],
          }));
        },

        removeFromQueue: (id) => {
          set((state) => ({
            queue: state.queue.filter((item) => item.id !== id),
          }));
        },

        updateQueueItem: (id, updates) => {
          set((state) => ({
            queue: state.queue.map((item) =>
              item.id === id ? { ...item, ...updates } : item
            ),
          }));
        },

        processQueue: async () => {
          const { queue, isProcessing } = get();
          
          if (isProcessing || queue.length === 0) return;

          set({ isProcessing: true });

          try {
            const now = Date.now();
            const itemsToProcess = queue.filter(
              (item) => item.nextRetry <= now && item.attempts < item.maxAttempts
            );

            // Process only ONE message at a time to prevent webhook overload
            if (itemsToProcess.length > 0) {
              const item = itemsToProcess[0]; // Take the first ready item only
              
              try {
                // Import here to avoid circular dependency
                const { webhookClient } = await import('@/lib/webhook-client');
                
                
                const response = await webhookClient.sendMessage(item.payload);
                
                if (response.success) {
                  // Remove successful message from queue
                  get().removeFromQueue(item.id);
                } else {
                  // Update with failure info
                  const nextAttempt = item.attempts + 1;
                  const delay = RETRY_DELAYS[Math.min(nextAttempt - 1, RETRY_DELAYS.length - 1)];
                  
                  get().updateQueueItem(item.id, {
                    attempts: nextAttempt,
                    nextRetry: now + delay,
                    lastError: response.error || 'Unknown error',
                  });
                }
              } catch (error: any) {
                // Update with network error
                const nextAttempt = item.attempts + 1;
                const delay = RETRY_DELAYS[Math.min(nextAttempt - 1, RETRY_DELAYS.length - 1)];
                
                get().updateQueueItem(item.id, {
                  attempts: nextAttempt,
                  nextRetry: now + delay,
                  lastError: error.message || 'Network error',
                });
              }
            }
          } finally {
            set({ isProcessing: false });
          }
        },

        clearQueue: () => {
          set({ queue: [] });
        },

        getFailedMessages: () => {
          return get().queue.filter((item) => item.attempts >= item.maxAttempts);
        },

        retryFailedMessage: (id) => {
          get().updateQueueItem(id, {
            attempts: 0,
            nextRetry: Date.now(),
            lastError: undefined,
          });
        },
      }),
      {
        name: 'message-queue-storage',
        partialize: (state) => ({ queue: state.queue }),
      }
    ),
    {
      name: 'message-queue-store',
    }
  )
);