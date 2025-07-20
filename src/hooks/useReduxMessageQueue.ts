'use client';

import { useSelector, useDispatch } from 'react-redux';
import { AppDispatch } from '@/store';
import {
  addToQueue as addToQueueAction,
  removeFromQueue as removeFromQueueAction,
  updateQueueItem as updateQueueItemAction,
  clearQueue as clearQueueAction,
  retryFailedMessage as retryFailedMessageAction,
  setProcessing,
  QueuedMessage,
} from '@/store/messageQueueSlice';
import {
  selectQueue,
  selectIsProcessing,
  selectFailedMessages,
  selectPendingMessages,
} from '@/store/messageQueueSelectors';
import { WebhookPayload } from '@/types/chat';

// Hook to provide the same interface as the Zustand message queue store
export const useMessageQueue = () => {
  const dispatch = useDispatch<AppDispatch>();
  
  // Selectors
  const queue = useSelector(selectQueue);
  const isProcessing = useSelector(selectIsProcessing);
  const failedMessages = useSelector(selectFailedMessages);
  const pendingMessages = useSelector(selectPendingMessages);

  // Actions
  const addToQueue = (payload: WebhookPayload, maxAttempts = 5) => {
    dispatch(addToQueueAction({ payload, maxAttempts }));
  };

  const removeFromQueue = (id: string) => {
    dispatch(removeFromQueueAction(id));
  };

  const updateQueueItem = (id: string, updates: Partial<QueuedMessage>) => {
    dispatch(updateQueueItemAction({ id, updates }));
  };

  const clearQueue = () => {
    dispatch(clearQueueAction());
  };

  const retryFailedMessage = (id: string) => {
    dispatch(retryFailedMessageAction(id));
  };

  const getFailedMessages = (): QueuedMessage[] => {
    return failedMessages;
  };

  // Placeholder for processQueue - would need to be implemented with webhook client
  const processQueue = async (): Promise<void> => {
    dispatch(setProcessing(true));
    try {
      // This would contain the actual queue processing logic
      // For now, it's a placeholder since we don't have access to webhook client here
      console.log('Processing queue with', pendingMessages.length, 'pending messages');
    } finally {
      dispatch(setProcessing(false));
    }
  };

  return {
    // State
    queue,
    isProcessing,
    
    // Actions
    addToQueue,
    removeFromQueue,
    updateQueueItem,
    processQueue,
    clearQueue,
    getFailedMessages,
    retryFailedMessage,
  };
};