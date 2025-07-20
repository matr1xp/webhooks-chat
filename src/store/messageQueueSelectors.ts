import { RootState } from './index';
import { QueuedMessage } from './messageQueueSlice';

export const selectQueue = (state: RootState): QueuedMessage[] => state.messageQueue.queue;
export const selectIsProcessing = (state: RootState): boolean => state.messageQueue.isProcessing;

export const selectFailedMessages = (state: RootState): QueuedMessage[] => {
  return state.messageQueue.queue.filter(item => item.attempts >= item.maxAttempts);
};

export const selectPendingMessages = (state: RootState): QueuedMessage[] => {
  return state.messageQueue.queue.filter(item => item.attempts < item.maxAttempts);
};

export const selectMessageQueueState = (state: RootState) => state.messageQueue;