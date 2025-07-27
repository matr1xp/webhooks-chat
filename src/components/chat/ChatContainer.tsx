'use client';

import { useEffect, useState, useMemo } from 'react';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useTheme } from '@/contexts/ThemeContext';
import { useConfig } from '@/contexts/ConfigContext';
import { useChatStore } from '@/hooks/useReduxChat';
import { useFirebaseChat } from '@/hooks/useFirebaseChat';
import { useFirebase } from '@/contexts/FirebaseContext';
import { webhookClient } from '@/lib/webhook-client';
import { WebhookPayload } from '@/types/chat';
import { generateSessionId, generateUserId, sanitizeInput } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { AlertCircle, Wifi, WifiOff, RefreshCw, Menu } from 'lucide-react';
import { useFileCache } from '@/hooks/useFileCache';

interface ChatContainerProps {
  className?: string;
  onMobileSidebarOpen?: () => void;
}

export function ChatContainer({ className, onMobileSidebarOpen }: ChatContainerProps) {
  const { theme } = useTheme();
  const { store } = useConfig();
  
  // Feature flag: Switch between Firebase and Redux
  const USE_FIREBASE = true; // Set to false to use Redux instead
  
  const reduxChat = useChatStore();
  const firebaseChat = useFirebaseChat();
  const firebase = useFirebase();
  
  // Use Firebase or Redux based on feature flag
  const {
    messages,
    isLoading,
    error,
    addMessage,
    updateMessageStatus,
    setLoading,
    setError,
    setCurrentSession,
    getMessagesForSession,
  } = USE_FIREBASE ? firebaseChat : reduxChat;


  const [userId] = useState(() => generateUserId());
  
  // Redux file cache for persistent Base64 data storage
  const { cache: fileDataCache, setFileCacheData, cleanupCache } = useFileCache();

  // Get active webhook and chat - use Firebase or Redux based on feature flag
  const rawActiveWebhook = USE_FIREBASE ? firebase.activeWebhook : store?.getActiveWebhook();
  
  // Convert Firebase webhook format to WebhookConfig format for webhook client
  const activeWebhook = rawActiveWebhook ? (USE_FIREBASE ? {
    id: rawActiveWebhook.id,
    name: rawActiveWebhook.name,
    url: rawActiveWebhook.url,
    apiSecret: (rawActiveWebhook as any).secret, // Convert 'secret' to 'apiSecret'
    isActive: rawActiveWebhook.isActive,
    createdAt: (rawActiveWebhook as any).createdAt?.toDate ? 
      (rawActiveWebhook as any).createdAt.toDate().toISOString() : 
      (rawActiveWebhook as any).createdAt, // Convert Timestamp to string
  } : rawActiveWebhook) : null;
  
  const activeChat = USE_FIREBASE ? firebase.activeChat : store?.getActiveChat();

  // Set current session when active chat changes
  useEffect(() => {
    if (USE_FIREBASE) {
      // Firebase chat uses id as session and accepts null
      if (activeChat?.id) {
        setCurrentSession(activeChat.id);
      } else {
        (setCurrentSession as any)(null);
      }
    } else {
      // Redux chat uses sessionId and requires a string
      const reduxChat = activeChat as any;
      if (reduxChat?.sessionId) {
        setCurrentSession(reduxChat.sessionId);
      }
      // For Redux, don't call setCurrentSession with null as it doesn't accept it
    }
  }, [USE_FIREBASE, activeChat?.id, setCurrentSession]);

  // Update message count when messages change (Redux only - Firebase handles this automatically)
  useEffect(() => {
    if (!USE_FIREBASE && activeChat) {
      const reduxChat = activeChat as any;
      if (reduxChat?.sessionId) {
        const currentMessageCount = messages.length;
        const storedMessageCount = reduxChat.messageCount;
        
        // Only update if the count is different to avoid unnecessary updates
        if (currentMessageCount !== storedMessageCount) {
          store.updateChat(activeChat.id, {
            messageCount: currentMessageCount,
            lastActivity: new Date().toISOString(),
          });
        }
      }
    }
  }, [USE_FIREBASE, messages.length, activeChat?.id, store]);

  // Cleanup old file cache entries when messages change
  useEffect(() => {
    if (messages.length > 0) {
      const activeMessageIds = messages.map(msg => msg.id);
      cleanupCache(activeMessageIds);
    }
  }, [messages, cleanupCache]);


  const handleSendMessage = async (
    content: string, 
    type: 'text' | 'file' | 'image' = 'text',
    fileData?: { name: string; size: number; type: string; data: string }
  ) => {
    // Check if we have an active webhook and chat
    if (!activeWebhook || !activeChat) {
      setError('No active webhook or chat configured. Please configure a webhook and select a chat.');
      return;
    }
    
    // Additional validation for Firebase mode
    if (USE_FIREBASE && (!activeChat.id || activeChat.id.trim() === '')) {
      setError('Active chat has invalid ID. Please refresh and try again.');
      return;
    }

    try {
      setError(null);
      
      const sanitizedContent = sanitizeInput(content);
      
      if (!sanitizedContent || sanitizedContent.trim() === '') {
        console.warn('Empty content after sanitization, skipping message');
        return;
      }

      // Add message to local state immediately (optimistic update)
      const sessionId = USE_FIREBASE ? activeChat.id : (activeChat as any).sessionId;
      
      // Create message payload for Firestore (without large Base64 data)
      const messagePayload = {
        sessionId,
        userId,
        type,
        content: sanitizedContent,
        isBot: false
      };
      
      // For Firestore storage, only include file metadata (not Base64 data)
      // But for local UI preview, we'll add the Base64 data after Firestore save
      if (fileData) {
        (messagePayload as any).fileData = {
          name: fileData.name,
          size: fileData.size,
          type: fileData.type,
          // Note: Base64 data is NOT stored in Firestore, only sent to webhook
        };
      }
      
      
      const message = await addMessage(messagePayload);

      // Store Base64 data in Redux cache for persistent UI preview
      if (fileData && message.id) {
        setFileCacheData(message.id, fileData.data);
      }

      // Message count will be updated automatically by useEffect

      setLoading(true);

      // Prepare webhook payload with full file data for cloud run processing
      const payload: WebhookPayload = {
        sessionId,
        messageId: message.id,
        timestamp: message.timestamp,
        user: {
          id: userId,
          name: `User ${userId.slice(-6)}`,
        },
        message: {
          type,
          content: sanitizedContent,
          // Include FULL file data (with Base64) for cloud run function processing
          ...(fileData && { file: fileData })
        },
        context: {
          previousMessages: messages.length,
          userAgent: navigator.userAgent,
          source: 'web' as const,
        },
      };
      

      // Send to webhook directly - no queueing
      try {
        const response = await webhookClient.sendMessage(payload, activeWebhook as any);
        
        if (response.success) {
          updateMessageStatus(message.id, 'delivered');
          
          // Add bot response message if available
          if (response.botMessage && response.botMessage.content) {
            if (USE_FIREBASE) {
              // Use Firebase bot message method
              await firebase.addBotMessage(
                response.botMessage.content,
                response.botMessage.metadata
              );
            } else {
              // Use Redux method
              const botMessage = await addMessage({
                sessionId,
                userId: 'bot', // Special bot user ID
                type: response.botMessage.type || 'text',
                content: response.botMessage.content,
                isBot: true,
                metadata: response.botMessage.metadata,
              });
              // Bot messages are always delivered
              updateMessageStatus(botMessage.id, 'delivered');
            }
            
            // Message count will be updated automatically by useEffect
          }
        } else {
          updateMessageStatus(message.id, 'failed');
          setError(response.error || 'Webhook returned an error response');
          
          // Run health check when webhook send fails
          if (USE_FIREBASE) {
            firebase.checkWebhookHealth();
          }
        }
      } catch (webhookError) {
        updateMessageStatus(message.id, 'failed');
        setError('Failed to connect to webhook service');
        
        // Run health check when webhook send throws error
        if (USE_FIREBASE) {
          firebase.checkWebhookHealth();
        }
      }
    } catch (error) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Memoize autoFocus to prevent unnecessary re-renders
  const shouldAutoFocus = useMemo(() => 
    !!(activeWebhook && activeChat && !isLoading), 
    [activeWebhook?.id, activeChat?.id, isLoading]
  );

  try {
    return (
    <div className={cn(
      'h-screen w-full flex flex-col relative overflow-hidden chat-container',
      // Mobile optimizations
      'touch-manipulation',
      className
    )}>
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDEyNywgMTI3LCAxMjcsIDAuMDMpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-40 dark:opacity-20"></div>
      
      {/* Header - Modern glassmorphism design */}
      <div className="flex-shrink-0 border-b shadow-sm z-20 relative chat-header">
        <div className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            {/* Mobile Sidebar Button */}
            <button
              onClick={onMobileSidebarOpen}
              className={cn(
                'p-2 rounded-lg transition-colors touch-manipulation md:hidden mr-3',
                'hover:bg-slate-100 dark:hover:bg-slate-800',
                'active:scale-95 active:bg-slate-200 dark:active:bg-slate-700'
              )}
              title="Open Menu"
            >
              <Menu className="w-5 h-5" style={{ color: theme === 'light' ? '#374151' : '#94a3b8' }} />
            </button>

            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl font-bold truncate" style={{ color: theme === 'light' ? '#000000' : '#f1f5f9' }}>
                {activeChat?.name || 'Select a Chat'}
              </h1>
              <p className="text-xs sm:text-sm font-medium" style={{ color: theme === 'light' ? '#374151' : '#94a3b8' }}>
                {activeWebhook ? `${activeWebhook.name} • ${messages.length} messages` : 'No webhook configured'}
              </p>
            </div>
            
            {/* Right side controls */}
            <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
              {/* Theme Toggle */}
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>

      {/* Error banner - Modern design */}
      {error && (
        <div className="flex-shrink-0 backdrop-blur-xl bg-red-50/90 dark:bg-red-900/80 border-b border-red-200/50 dark:border-red-700/50 z-20 relative">
          <div className="p-4">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-red-800 dark:text-red-200">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="flex-shrink-0 px-3 py-1 text-xs font-medium text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-100 bg-red-100 dark:bg-red-800 hover:bg-red-200 dark:hover:bg-red-700 rounded-full transition-colors duration-200"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scrollable Messages Area with improved styling */}
      <div className="flex-1 overflow-y-auto scrollbar-thin relative z-10">
        <MessageList 
          messages={messages} 
          isLoading={isLoading}
          className="min-h-full px-4 py-6"
          fileDataCache={fileDataCache}
        />
      </div>

      {/* Input - Modern floating design */}
      <div className="flex-shrink-0 z-20 relative">
        <div className="backdrop-blur-xl border-t shadow-lg chat-header">
          <MessageInput
            onSendMessage={handleSendMessage}
            disabled={isLoading || !activeWebhook || !activeChat}
            autoFocus={shouldAutoFocus}
            placeholder={
              !activeWebhook 
                ? "Configure a webhook to start chatting..." 
                : !activeChat 
                  ? "Select or create a chat..." 
                  : isLoading 
                    ? "Sending..." 
                    : "Type a message..."
            }
            className=""
          />
        </div>
      </div>
    </div>
  );
  } catch (error) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">Chat Container Error</h2>
          <p className="text-gray-600">Something went wrong. Check the console for details.</p>
          <p className="text-sm text-gray-500 mt-2">{error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      </div>
    );
  }
}