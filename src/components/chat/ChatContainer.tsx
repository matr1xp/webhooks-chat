'use client';

import { AlertCircle, Bell, Menu, Search, Share } from 'lucide-react';
import { generateSessionId, generateUserId, sanitizeInput } from '@/lib/utils';
import { useEffect, useMemo, useState } from 'react';

import { MessageInput } from './MessageInput';
import { MessageList } from './MessageList';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { UserProfileDropdown } from '@/components/ui/UserProfileDropdown';
import { WebhookPayload } from '@/types/chat';
import { WelcomeScreen } from './WelcomeScreen';
import { cn } from '@/lib/utils';
import { useChatStore } from '@/hooks/useReduxChat';
import { useConfig } from '@/contexts/ConfigContext';
import { useFileCache } from '@/hooks/useFileCache';
import { useFirebase } from '@/contexts/FirebaseContext';
import { useFirebaseChat } from '@/hooks/useFirebaseChat';
import { useTheme } from '@/contexts/ThemeContext';
import { webhookClient } from '@/lib/webhook-client';

interface ChatContainerProps {
  className?: string;
  onMobileSidebarOpen?: () => void;
  isSidebarCollapsed?: boolean;
  isMobileSidebarOpen?: boolean;
}

export function ChatContainer({ className, onMobileSidebarOpen, isSidebarCollapsed = false, isMobileSidebarOpen = false }: ChatContainerProps) {
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

  // Helper function to generate chat name from first message
  const generateChatName = (content: string): string => {
    // Remove extra whitespace and clean up the content
    const cleanContent = content.trim().replace(/\s+/g, ' ');
    
    // If content is too short, return as is
    if (cleanContent.length <= 35) {
      return cleanContent;
    }
    
    // Find a good breaking point (end of sentence, comma, or word boundary)
    let breakPoint = 35;
    
    // Look for sentence end within first 45 characters
    const sentenceEnd = cleanContent.substring(0, 45).search(/[.!?]/);
    if (sentenceEnd > 15 && sentenceEnd < 35) {
      return cleanContent.substring(0, sentenceEnd + 1).trim();
    }
    
    // Look for comma within first 40 characters
    const commaIndex = cleanContent.substring(0, 40).lastIndexOf(',');
    if (commaIndex > 15) {
      breakPoint = commaIndex;
    } else {
      // Find last space before character 35 to avoid cutting words
      const lastSpace = cleanContent.substring(0, 35).lastIndexOf(' ');
      if (lastSpace > 15) {
        breakPoint = lastSpace;
      }
    }
    
    return cleanContent.substring(0, breakPoint).trim() + '...';
  };


  const [userId] = useState(() => generateUserId());
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [lastBotSource, setLastBotSource] = useState<{source: string; timestamp: number} | null>(null);
  
  // Redux file cache for persistent Base64 data storage
  const { cache: fileDataCache, setFileCacheData, cleanupCache } = useFileCache();

  // Helper function to check if bot source is still valid (within configured timeout)
  const getValidDestination = (): string | null => {
    if (!lastBotSource) return null;
    
    const now = Date.now();
    // Get timeout from environment variable, default to 5 minutes
    const timeoutMinutes = parseInt(process.env.NEXT_PUBLIC_DESTINATION_TIMEOUT || '5');
    const timeoutInMs = timeoutMinutes * 60 * 1000; // Convert minutes to milliseconds
    const timeElapsed = now - lastBotSource.timestamp;
    
    if (timeElapsed <= timeoutInMs) {
      return lastBotSource.source;
    }
    
    // Clear expired bot source
    setLastBotSource(null);
    return null;
  };

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

  // Check webhook health when active webhook changes
  useEffect(() => {
    if (activeWebhook?.id) {
      if (USE_FIREBASE) {
        // Convert to FirestoreWebhook format for health check
        const firestoreWebhook = {
          id: activeWebhook.id,
          name: activeWebhook.name,
          url: activeWebhook.url,
          secret: (activeWebhook as any).apiSecret || (activeWebhook as any).secret,
          isActive: activeWebhook.isActive,
          createdAt: (activeWebhook as any).createdAt
        };
        firebase.checkWebhookHealth(firestoreWebhook)
          .then(setIsOnline)
          .catch(() => setIsOnline(false));
      } else {
        // For Redux mode, you could implement similar health check here
        setIsOnline(null);
      }
    } else {
      setIsOnline(false);
    }
  }, [activeWebhook?.id, USE_FIREBASE, firebase]);

  // Detect if we're on mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Determine if connection pill should be shown
  const shouldShowConnectionPill = useMemo(() => {
    if (!activeWebhook) return false;
    
    if (isMobile) {
      // Mobile: show when sidebar overlay is not open
      return !isMobileSidebarOpen;
    } else {
      // Desktop: show when sidebar is collapsed
      return isSidebarCollapsed;
    }
  }, [activeWebhook, isMobile, isSidebarCollapsed, isMobileSidebarOpen]);

  // Determine if we should show welcome screen
  const shouldShowWelcomeScreen = useMemo(() => {
    return !activeChat || messages.length === 0;
  }, [activeChat, messages.length]);

  // Mock header action handlers
  const handleSearchClick = () => {
    console.log('Search clicked');
  };

  const handleShareClick = () => {
    console.log('Share clicked');
  };

  const handleNotificationsClick = () => {
    console.log('Notifications clicked');
  };

  const handleSendMessage = async (
    content: string, 
    type: 'text' | 'file' | 'image' = 'text',
    fileData?: { name: string; size: number; type: string; data: string }
  ) => {
    // Check if we have an active webhook
    if (!activeWebhook) {
      setError('No active webhook configured. Please configure a webhook first.');
      return;
    }

    // Check if webhook is healthy (connected)
    if (isOnline === false) {
      setError('Webhook is offline. Please check your webhook configuration and try again.');
      return;
    }

    // If webhook status is still checking, wait a moment and check again
    if (isOnline === null) {
      setError('Checking webhook connection. Please wait and try again.');
      return;
    }

    // Auto-create a new chat if none is selected (for welcome screen suggestions)
    let currentChat = activeChat;
    if (!currentChat && USE_FIREBASE) {
      try {
        setError(null);
        const newChat = await firebase.createNewChat(
          activeWebhook.id, 
          generateChatName(content)
        );
        firebase.setActiveChat(newChat.id);
        currentChat = newChat;
      } catch (error) {
        console.error('Failed to create new chat:', error);
        setError('Failed to create new chat. Please try again.');
        return;
      }
    }

    // Check if we now have an active chat
    if (!currentChat) {
      setError('No active chat configured. Please select or create a chat.');
      return;
    }
    
    // Additional validation for Firebase mode
    if (USE_FIREBASE && (!currentChat.id || currentChat.id.trim() === '')) {
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
      const sessionId = USE_FIREBASE ? currentChat.id : (currentChat as any).sessionId;
      
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

      // Auto-rename chat if this is the first user message
      if (USE_FIREBASE && currentChat && type === 'text') {
        // Check if this is the first user message by counting existing user messages
        const userMessages = messages.filter(msg => !msg.isBot);
        
        // If no user messages existed before this one, and the chat has a default name, rename it
        if (userMessages.length === 0 && currentChat.name && currentChat.name.startsWith('Chat ')) {
          try {
            const newChatName = generateChatName(sanitizedContent);
            await firebase.updateChat(currentChat.id, newChatName);
          } catch (error) {
            console.warn('Failed to auto-rename chat:', error);
            // Don't block the message sending if renaming fails
          }
        }
      }

      // Message count will be updated automatically by useEffect

      setLoading(true);

      // Check if we have a valid destination (within 5 minutes)
      const validDestination = getValidDestination();

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
          // Include destination field if we have a valid bot source (within 5 minutes)
          ...(validDestination && { destination: validDestination }),
          // Include FULL file data (with Base64) for cloud run function processing
          ...(fileData && { file: fileData })
        },
        context: {
          previousMessages: messages.length,
          userAgent: navigator.userAgent,
          source: 'web' as const,
        },
      };

      

      // Clear the last bot source after using it to prevent it from being used in future messages
      if (validDestination) {
        setLastBotSource(null);
      }

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
                response.botMessage.metadata,
                response.botMessage.source
              );
            } else {
              // Use Redux method
              const botMessage = await addMessage({
                sessionId,
                userId: 'bot', // Special bot user ID
                type: response.botMessage.type || 'text',
                content: response.botMessage.content,
                isBot: true,
                source: response.botMessage.source,
                metadata: response.botMessage.metadata,
              });
              // Bot messages are always delivered
              updateMessageStatus(botMessage.id, 'delivered');
            }
            
            // Store bot source for next user message destination (with timestamp for timeout expiry)
            if (response.botMessage.source) {
              setLastBotSource({
                source: response.botMessage.source,
                timestamp: Date.now()
              });
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
    [activeWebhook, activeChat, isLoading]
  );

  try {
    return (
    <div className={cn(
      'h-screen w-full flex flex-col relative chat-container',
      // Mobile: allow overflow for fixed input, desktop: hidden overflow
      'overflow-visible md:overflow-hidden',
      className
    )}>
      {/* Header - Mobile-optimized design */}
      <div className="flex-shrink-0 border-[#e2e8f0] dark:border-[#374151] chat-header z-30 relative">
        <div className="p-3 md:p-4 lg:p-6">
          <div className="flex items-center justify-between">
            {/* Mobile Sidebar Button */}
            <button
              onClick={onMobileSidebarOpen}
              className={cn(
                'p-2 rounded-lg transition-colors touch-manipulation md:hidden mr-2',
                'hover:bg-slate-100 dark:hover:bg-slate-800',
                'active:scale-95 active:bg-slate-200 dark:active:bg-slate-700'
              )}
              title="Open Menu"
            >
              <Menu className="w-5 h-5" style={{ color: theme === 'light' ? '#374151' : '#94a3b8' }} />
            </button>

            <div className="min-w-0 flex-1">
              <h1 className="text-base md:text-lg lg:text-xl font-bold truncate" style={{ color: theme === 'light' ? '#111827' : '#f1f5f9' }}>
                {activeChat?.name || 'Conversation title goes here'}
              </h1>
              <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-0.5 hidden sm:block">
                {activeChat && messages.length > 0 
                  ? `Started ${new Date().toLocaleDateString()}`
                  : 'Select a chat or start a new conversation'
                }
              </p>
            </div>
            
            {/* Header Actions - Right side - Hide most on mobile */}
            <div className="flex items-center space-x-1 md:space-x-2 lg:space-x-3 flex-shrink-0">
              {/* Mock Action Icons - Hidden on mobile except user profile */}
              <button
                onClick={handleSearchClick}
                className={cn(
                  'p-2 rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-slate-800',
                  'active:scale-95 touch-manipulation hidden md:block'
                )}
                title="Search"
              >
                <Search className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </button>
              
              <button
                onClick={handleShareClick}
                className={cn(
                  'p-2 rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-slate-800',
                  'active:scale-95 touch-manipulation hidden md:block'
                )}
                title="Share"
              >
                <Share className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </button>
              
              <button
                onClick={handleNotificationsClick}
                className={cn(
                  'p-2 rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-slate-800',
                  'active:scale-95 touch-manipulation hidden md:block'
                )}
                title="Notifications"
              >
                <Bell className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </button>

              {/* Theme Toggle - Hidden on mobile */}
              <div className="hidden md:block">
                <ThemeToggle />
              </div>
              
              {/* User Profile Dropdown - Always visible but simplified on mobile */}
              <UserProfileDropdown />
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

      {/* Main Content Area - Welcome Screen or Messages */}
      <div className={cn(
        "flex-1 overflow-y-auto scrollbar-thin relative z-10 chat-messages-area",
        // Mobile: leave space for fixed input at bottom
        "pb-24 md:pb-0",
        error && "pt-8" // Additional padding when error banner is shown
      )}>
        {shouldShowWelcomeScreen ? (
          <WelcomeScreen 
            onSuggestionClick={handleSendMessage}
            className="min-h-full"
          />
        ) : (
          <MessageList 
            messages={messages} 
            isLoading={isLoading}
            className="min-h-full px-4 py-6"
            fileDataCache={fileDataCache}
          />
        )}
      </div>

      {/* Input - Fixed at bottom on mobile, normal position on desktop */}
      <div className={cn(
        "z-20 flex-shrink-0",
        // Mobile: fixed at bottom with full width
        "fixed bottom-0 left-0 right-0",
        // Desktop: relative positioning (normal flex item)
        "md:relative md:bottom-auto md:left-auto md:right-auto"
      )}>
        <div className="border-[#e2e8f0] dark:border-[#374151] bg-[#ffffff] dark:bg-[#1e293b]">
          <MessageInput
            onSendMessage={handleSendMessage}
            disabled={isLoading || !activeWebhook}
            autoFocus={shouldAutoFocus && !shouldShowWelcomeScreen}
            placeholder={
              !activeWebhook 
                ? "Configure a webhook to start chatting..." 
                : shouldShowWelcomeScreen
                  ? "Type your message here or pick from the prompts"
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