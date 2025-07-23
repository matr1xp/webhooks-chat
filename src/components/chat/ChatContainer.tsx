'use client';

import { useEffect, useState, useRef } from 'react';
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
import { AlertCircle, Wifi, WifiOff, RefreshCw } from 'lucide-react';

interface ChatContainerProps {
  className?: string;
}

export function ChatContainer({ className }: ChatContainerProps) {
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
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const isInitialized = useRef(false);

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

  // Check webhook health
  useEffect(() => {
    const checkHealth = async () => {
      // Skip health check if currently sending a message to avoid interference
      if (isSendingMessage || !activeWebhook) {
        return;
      }

      try {
        const healthy = await webhookClient.checkHealth(activeWebhook as any);
        setIsOnline(healthy);
      } catch (error) {
        setIsOnline(false);
      }
    };

    // Run health check when activeWebhook changes or on initial load
    if (activeWebhook) {
      if (!isInitialized.current) {
        isInitialized.current = true;
      }
      checkHealth();
    } else {
      // No active webhook, set offline
      setIsOnline(false);
    }
    
    // Check health every 10 minutes (600000ms) - reduced frequency for external webhooks
    const healthInterval = setInterval(checkHealth, 600000);

    return () => {
      clearInterval(healthInterval);
    };
  }, [isSendingMessage, activeWebhook]);

  const handleSendMessage = async (content: string, type: 'text' | 'file' | 'image' = 'text') => {
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
      setIsSendingMessage(true); // Prevent health checks during message sending
      
      const sanitizedContent = sanitizeInput(content);
      
      if (!sanitizedContent) return;

      // Add message to local state immediately (optimistic update)
      const sessionId = USE_FIREBASE ? activeChat.id : (activeChat as any).sessionId;
      const message = await addMessage({
        sessionId,
        userId,
        type,
        content: sanitizedContent,
      });

      // Message count will be updated automatically by useEffect

      setLoading(true);

      // Prepare webhook payload
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
              const botMessage = await firebase.addBotMessage(
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
        }
      } catch (webhookError) {
        updateMessageStatus(message.id, 'failed');
        setError('Failed to connect to webhook service');
      }
    } catch (error) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
      setIsSendingMessage(false); // Re-enable health checks
    }
  };

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
              
              {/* Connection status - modernized */}
              <div className={cn(
                "flex items-center space-x-1 sm:space-x-2 px-2 py-1 rounded-full text-xs font-medium transition-all duration-300",
                isOnline === true
                  ? "bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 shadow-emerald-200/50 dark:shadow-emerald-800/50 shadow-sm" 
                  : isOnline === false
                  ? "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 shadow-red-200/50 dark:shadow-red-800/50 shadow-sm"
                  : "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 shadow-blue-200/50 dark:shadow-blue-800/50 shadow-sm"
              )}>
                {isOnline === true ? (
                  <>
                    <div className="w-2 h-2 bg-emerald-500 dark:bg-emerald-400 rounded-full animate-pulse"></div>
                    <span className="hidden sm:inline">Connected</span>
                  </>
                ) : isOnline === false ? (
                  <>
                    <div className="w-2 h-2 bg-red-500 dark:bg-red-400 rounded-full"></div>
                    <span className="hidden sm:inline">Disconnected</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full animate-spin"></div>
                    <span className="hidden sm:inline">Checking...</span>
                  </>
                )}
              </div>
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
        />
      </div>

      {/* Input - Modern floating design */}
      <div className="flex-shrink-0 z-20 relative">
        <div className="backdrop-blur-xl border-t shadow-lg chat-header">
          <MessageInput
            onSendMessage={handleSendMessage}
            disabled={isLoading || !activeWebhook || !activeChat}
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