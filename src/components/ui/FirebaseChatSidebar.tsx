'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useFirebase } from '@/contexts/FirebaseContext';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { 
  MessageSquare, 
  Plus, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  MoreVertical,
  Trash2,
  Edit3,
  Webhook,
  Globe,
  LogOut,
  User,
  Eraser,
  X
} from 'lucide-react';
import { Modal } from './Modal';
import { webhookClient } from '@/lib/webhook-client';

interface FirebaseChatSidebarProps {
  className?: string;
  onConfigOpen?: () => void;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function FirebaseChatSidebar({ className, onConfigOpen, isMobileOpen = false, onMobileClose }: FirebaseChatSidebarProps) {
  const { theme } = useTheme();
  const {
    // Auth
    user,
    userProfile,
    signInWithGoogle,
    signOut,
    isSignedIn,
    
    // Webhooks
    activeWebhook,
    webhooks,
    setActiveWebhook,
    
    // Chats
    chats,
    activeChat,
    createNewChat,
    updateChat,
    deleteChat,
    cleanupEmptyChats,
    setActiveChat,
  } = useFirebase();


  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [editingChat, setEditingChat] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const isInitialized = useRef(false);
  const [isWebhookSelectorOpen, setIsWebhookSelectorOpen] = useState(false);
  const [openChatMenu, setOpenChatMenu] = useState<string | null>(null);

  // Expose health check function for external calls
  const checkWebhookHealth = useCallback(async (webhook?: any) => {
    const targetWebhook = webhook || activeWebhook;
    if (!targetWebhook) {
      setIsOnline(false);
      return false;
    }

    try {
      const healthy = await webhookClient.checkHealth(targetWebhook);
      setIsOnline(healthy);
      return healthy;
    } catch (error) {
      setIsOnline(false);
      return false;
    }
  }, [activeWebhook]);

  // Filter chats for active webhook - memoized to prevent unnecessary re-renders
  const chatsForActiveWebhook = useMemo(() => 
    chats.filter(chat => 
      activeWebhook ? chat.webhookId === activeWebhook.id : false
    ), [chats, activeWebhook?.id]
  );

  const handleNewChat = useCallback(async () => {
    if (!activeWebhook) return;
    
    try {
      // Ensure user is signed in
      if (!isSignedIn) {
        await signInWithGoogle();
      }
      
      const newChat = await createNewChat(
        activeWebhook.id, 
        `Chat ${new Date().toLocaleString()}`
      );
      setActiveChat(newChat.id);
    } catch (error) {
    }
  }, [activeWebhook, isSignedIn, signInWithGoogle, createNewChat, setActiveChat]);

  const handleChatSelect = useCallback((chatId: string) => {
    setActiveChat(chatId);
    // Close any open chat menus
    setOpenChatMenu(null);
    // Close mobile sidebar after selection
    if (isMobileOpen && onMobileClose) {
      onMobileClose();
    }
  }, [setActiveChat, isMobileOpen, onMobileClose]);

  const handleDeleteChat = useCallback(async (chatId: string) => {
    try {
      // Calculate next active chat before deletion to avoid race condition
      let nextActiveChat: string | null = null;
      if (activeChat?.id === chatId) {
        const remainingChats = chatsForActiveWebhook.filter(chat => chat.id !== chatId);
        nextActiveChat = remainingChats.length > 0 ? remainingChats[0].id : null;
      }
      
      // Delete the chat first
      await deleteChat(chatId);
      setShowDeleteModal(null);
      
      // Update active chat only if we deleted the current active chat
      if (activeChat?.id === chatId) {
        setActiveChat(nextActiveChat);
      }
    } catch (error) {
    }
  }, [activeChat?.id, chatsForActiveWebhook, deleteChat, setActiveChat]);

  const handleEditChat = useCallback((chatId: string, currentName: string) => {
    setEditingChat(chatId);
    setEditName(currentName);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingChat || !editName.trim()) return;
    
    try {
      await updateChat(editingChat, editName.trim());
      setEditingChat(null);
      setEditName('');
    } catch (error) {
    }
  }, [editingChat, editName, updateChat]);

  const handleCancelEdit = useCallback(() => {
    setEditingChat(null);
    setEditName('');
  }, []);

  const toggleChatMenu = useCallback((chatId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setOpenChatMenu(prev => prev === chatId ? null : chatId);
  }, []);

  const closeChatMenu = useCallback(() => {
    setOpenChatMenu(null);
  }, []);

  const handleCleanupEmptyChats = useCallback(async () => {
    if (!activeWebhook) return;
    
    try {
      const deletedCount = await cleanupEmptyChats(activeWebhook.id);
      if (deletedCount > 0) {
      }
    } catch (error) {
    }
  }, [activeWebhook, cleanupEmptyChats]);

  const handleSignOutClick = useCallback(() => {
    setShowSignOutModal(true);
  }, []);

  const handleConfirmSignOut = useCallback(async () => {
    try {
      await signOut();
      setShowSignOutModal(false);
    } catch (error) {
    }
  }, [signOut]);

  const formatTimeAgo = useCallback((timestamp: any) => {
    const now = new Date();
    const time = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'now';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return `${Math.floor(diffInMinutes / 1440)}d`;
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      const target = event.target as Element;
      // Don't close if clicking on the dropdown itself or its children
      if (target && (target.closest('.webhook-selector') || target.closest('[aria-label="More options"]') || target.closest('.chat-menu'))) {
        return;
      }
      setIsWebhookSelectorOpen(false);
      setOpenChatMenu(null);
    };

    if (isWebhookSelectorOpen || openChatMenu) {
      document.addEventListener('click', handleClickOutside, true);
      return () => document.removeEventListener('click', handleClickOutside, true);
    }
  }, [isWebhookSelectorOpen, openChatMenu]);

  // Check webhook health only on initial load or when webhook changes
  useEffect(() => {
    // Run health check when activeWebhook changes or on initial load
    if (activeWebhook) {
      if (!isInitialized.current) {
        isInitialized.current = true;
      }
      checkWebhookHealth();
    } else {
      setIsOnline(false);
    }
  }, [activeWebhook, checkWebhookHealth]);

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={onMobileClose}
        />
      )}

      <div 
        className={cn(
          'flex flex-col h-full transition-all duration-300 shadow-lg relative backdrop-blur-xl',
          // Desktop: Normal sidebar behavior with border-r
          'md:border-r border-slate-300 dark:border-slate-700',
          // Mobile: Full screen when open, hidden when closed
          isMobileOpen ? 'fixed inset-0 z-50 w-full h-full flex' : 'hidden md:flex',
          // Desktop width when not mobile
          !isMobileOpen && (isCollapsed ? 'w-16' : 'w-80'),
          className
        )}
        style={{
          backgroundColor: theme === 'light' ? '#f8fafc' : '#0f172a'
        }}
      >
        {/* Header */}
        <div className="flex-shrink-0 p-6 md:p-4 border-b border-slate-300 dark:border-slate-700 relative">
          <div className="flex items-center justify-between">
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-3">
                  <Image
                    src="/logo.png"
                    alt="Webn8 Logo"
                    width={28}
                    height={28}
                    className="flex-shrink-0 md:w-6 md:h-6"
                    style={{ width: 'auto', height: '28px' }}
                  />
                  <h2 className="text-xl md:text-lg font-semibold truncate" style={{ color: theme === 'light' ? '#111827' : '#f1f5f9' }}>
                    WebhookIQ
                  </h2>
                </div>
                {/* Webhook Selector in Header */}
                {webhooks.length > 0 && (
                  <div className="mt-3 md:mt-2 relative webhook-selector -mx-6 md:-mx-4 px-6 md:px-4" style={{ width: 'calc(100% + 3rem)' }}>
                    {webhooks.length === 1 ? (
                      // Single webhook - show as static text with status
                      <div className="flex items-center justify-between text-sm md:text-xs" style={{ color: '#94a3b8' }}>
                        <div className="flex items-center min-w-0 flex-1">
                          <Webhook className="w-4 h-4 md:w-3 md:h-3 mr-2 md:mr-1 flex-shrink-0" />
                          <span className="truncate">{activeWebhook?.name}</span>
                        </div>
                        {/* Connection status pill */}
                        <div className={cn(
                          "flex items-center space-x-1 px-3 py-1 md:px-2 md:py-0.5 rounded-full text-sm md:text-xs font-medium transition-all duration-300 ml-3 md:ml-2 flex-shrink-0",
                          isOnline === true
                            ? "bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 shadow-emerald-200/50 dark:shadow-emerald-800/50 shadow-sm" 
                            : isOnline === false
                            ? "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 shadow-red-200/50 dark:shadow-red-800/50 shadow-sm"
                            : "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 shadow-blue-200/50 dark:shadow-blue-800/50 shadow-sm"
                        )}>
                          {isOnline === true ? (
                            <>
                              <div className="w-1.5 h-1.5 bg-emerald-500 dark:bg-emerald-400 rounded-full animate-pulse"></div>
                              <span className="hidden sm:inline">Connected</span>
                            </>
                          ) : isOnline === false ? (
                            <>
                              <div className="w-1.5 h-1.5 bg-red-500 dark:bg-red-400 rounded-full"></div>
                              <span className="hidden sm:inline">Offline</span>
                            </>
                          ) : (
                            <>
                              <div className="w-1.5 h-1.5 bg-blue-500 dark:bg-blue-400 rounded-full animate-spin"></div>
                              <span className="hidden sm:inline">Checking</span>
                            </>
                          )}
                        </div>
                      </div>
                    ) : (
                      // Multiple webhooks - show as dropdown selector with status on same row
                      <div className="space-y-1">
                        <div className="flex items-center">
                          <button
                            onClick={() => setIsWebhookSelectorOpen(!isWebhookSelectorOpen)}
                            className={cn(
                              "flex items-center text-left text-xs px-2 py-1 rounded transition-colors mr-2",
                              "hover:bg-slate-200 dark:hover:bg-slate-700 touch-manipulation",
                              "focus:outline-none focus:ring-1 focus:ring-blue-500",
                              isWebhookSelectorOpen && "bg-slate-200 dark:bg-slate-700"
                            )}
                            style={{ color: theme === 'light' ? '#6b7280' : '#94a3b8' }}
                          >
                            <Webhook className="w-3 h-3 mr-1 flex-shrink-0" />
                            <span className="flex-1 truncate">{activeWebhook?.name || 'Select Webhook'}</span>
                            <svg 
                              className={cn("w-3 h-3 ml-1 transition-transform flex-shrink-0", isWebhookSelectorOpen && "rotate-180")} 
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>

                          {/* Connection status pill for multiple webhooks - same row */}
                          <div className={cn(
                            "flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-medium transition-all duration-300 flex-shrink-0",
                            isOnline === true
                              ? "bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 shadow-emerald-200/50 dark:shadow-emerald-800/50 shadow-sm" 
                              : isOnline === false
                              ? "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 shadow-red-200/50 dark:shadow-red-800/50 shadow-sm"
                              : "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 shadow-blue-200/50 dark:shadow-blue-800/50 shadow-sm"
                          )}>
                            {isOnline === true ? (
                              <>
                                <div className="w-1.5 h-1.5 bg-emerald-500 dark:bg-emerald-400 rounded-full animate-pulse"></div>
                                <span className="hidden sm:inline">Connected</span>
                              </>
                            ) : isOnline === false ? (
                              <>
                                <div className="w-1.5 h-1.5 bg-red-500 dark:bg-red-400 rounded-full"></div>
                                <span className="hidden sm:inline">Offline</span>
                              </>
                            ) : (
                              <>
                                <div className="w-1.5 h-1.5 bg-blue-500 dark:bg-blue-400 rounded-full animate-spin"></div>
                                <span className="hidden sm:inline">Checking</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Dropdown Menu */}
                        {isWebhookSelectorOpen && (
                          <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-lg z-[70] max-h-48 overflow-y-auto">
                            {webhooks.map((webhook) => (
                              <button
                                key={webhook.id}
                                onClick={() => {
                                  setActiveWebhook(webhook.id);
                                  setIsWebhookSelectorOpen(false);
                                }}
                                className={cn(
                                  "w-full text-left px-3 py-2 text-xs transition-colors touch-manipulation",
                                  "hover:bg-slate-100 dark:hover:bg-slate-700",
                                  "active:bg-slate-200 dark:active:bg-slate-600",
                                  "first:rounded-t-lg last:rounded-b-lg",
                                  "flex items-center",
                                  webhook.id === activeWebhook?.id && "bg-blue-600 text-white"
                                )}
                                style={{ 
                                  color: webhook.id === activeWebhook?.id ? '#ffffff' : (theme === 'light' ? '#374151' : '#f1f5f9')
                                }}
                              >
                                <Webhook className="w-3 h-3 mr-2 flex-shrink-0" />
                                <span className="truncate">{webhook.name}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            
            <div className="flex items-center space-x-2 md:space-x-1 -mt-8">
              {!isCollapsed && (
                <>
                  <button
                    onClick={handleNewChat}
                    disabled={!activeWebhook}
                    className={cn(
                      'p-3 md:p-2 rounded-lg transition-colors min-h-[44px] min-w-[44px] md:min-h-auto md:min-w-auto flex items-center justify-center',
                      'hover:bg-slate-200 dark:hover:bg-slate-800 active:bg-slate-300 dark:active:bg-slate-700',
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                    title="New Chat"
                  >
                    <Plus className="w-5 h-5 md:w-4 md:h-4" style={{ color: theme === 'light' ? '#6b7280' : '#94a3b8' }} />
                  </button>
                  <button
                    onClick={handleCleanupEmptyChats}
                    disabled={!activeWebhook}
                    className={cn(
                      'p-3 md:p-2 rounded-lg transition-colors min-h-[44px] min-w-[44px] md:min-h-auto md:min-w-auto flex items-center justify-center',
                      'hover:bg-slate-200 dark:hover:bg-slate-800 active:bg-slate-300 dark:active:bg-slate-700',
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                    title="Cleanup Empty Chats"
                  >
                    <Eraser className="w-5 h-5 md:w-4 md:h-4" style={{ color: theme === 'light' ? '#6b7280' : '#94a3b8' }} />
                  </button>
                  <button
                    onClick={onConfigOpen}
                    className="p-3 md:p-2 rounded-lg transition-colors hover:bg-slate-200 dark:hover:bg-slate-800 active:bg-slate-300 dark:active:bg-slate-700 min-h-[44px] min-w-[44px] md:min-h-auto md:min-w-auto flex items-center justify-center"
                    title="Settings"
                  >
                    <Settings className="w-5 h-5 md:w-4 md:h-4" style={{ color: theme === 'light' ? '#6b7280' : '#94a3b8' }} />
                  </button>
                </>
              )}
              {/* Hide collapse button on mobile since we have close button */}
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className={cn(
                  'p-2 rounded-lg transition-colors hover:bg-slate-200 dark:hover:bg-slate-800 hidden md:block'
                )}
                title={isCollapsed ? 'Expand' : 'Collapse'}
              >
                {isCollapsed ? (
                  <ChevronRight className="w-4 h-4" style={{ color: theme === 'light' ? '#6b7280' : '#94a3b8' }} />
                ) : (
                  <ChevronLeft className="w-4 h-4" style={{ color: theme === 'light' ? '#6b7280' : '#94a3b8' }} />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {!activeWebhook && !isCollapsed && (
            <div className="p-6 md:p-4 text-center">
              <Globe className="w-12 h-12 md:w-8 md:h-8 mx-auto mb-4 md:mb-2 opacity-50" style={{ color: theme === 'light' ? '#6b7280' : '#94a3b8' }} />
              <p className="text-base md:text-sm mb-4 md:mb-2" style={{ color: theme === 'light' ? '#6b7280' : '#94a3b8' }}>
                No webhook configured
              </p>
              <button
                onClick={onConfigOpen}
                className="px-6 py-3 md:px-3 md:py-1 text-sm md:text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600 active:bg-blue-700 transition-colors min-h-[44px] md:min-h-auto"
              >
                Setup Webhook
              </button>
            </div>
          )}

          {activeWebhook && chatsForActiveWebhook.length === 0 && !isCollapsed && (
            <div className="p-6 md:p-4 text-center">
              <MessageSquare className="w-12 h-12 md:w-8 md:h-8 mx-auto mb-4 md:mb-2 opacity-50" style={{ color: theme === 'light' ? '#6b7280' : '#94a3b8' }} />
              <p className="text-base md:text-sm mb-4 md:mb-2" style={{ color: theme === 'light' ? '#6b7280' : '#94a3b8' }}>
                No chats yet
              </p>
              <button
                onClick={handleNewChat}
                className="px-6 py-3 md:px-3 md:py-1 text-sm md:text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600 active:bg-blue-700 transition-colors min-h-[44px] md:min-h-auto"
              >
                Start First Chat
              </button>
            </div>
          )}

          {chatsForActiveWebhook.map((chat) => (
            <div
              key={chat.id}
              className={cn(
                'relative group cursor-pointer border-b border-slate-200 dark:border-slate-800 last:border-b-0',
                'hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors',
                chat.id === activeChat?.id && 'bg-blue-50 dark:bg-blue-900/20 border-r-2 border-r-blue-500'
              )}
              onClick={() => handleChatSelect(chat.id)}
            >
              <div className="p-4 md:p-3">
                {isCollapsed ? (
                  <div className="flex justify-center">
                    <MessageSquare className="w-5 h-5" style={{ 
                      color: chat.id === activeChat?.id 
                        ? '#3b82f6' 
                        : theme === 'light' ? '#6b7280' : '#94a3b8' 
                    }} />
                  </div>
                ) : (
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      {editingChat === chat.id ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onBlur={handleSaveEdit}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit();
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                          autoFocus
                          className="w-full text-sm font-medium bg-transparent border-none outline-none"
                          style={{ color: theme === 'light' ? '#374151' : '#1f2937' }}
                        />
                      ) : (
                        <h3 className="text-sm font-medium truncate" style={{ 
                          color: chat.id === activeChat?.id 
                            ? '#3b82f6' 
                            : theme === 'light' ? '#374151' : '#e2e8f0' 
                        }}>
                          {chat.name}
                        </h3>
                      )}
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs" style={{ color: theme === 'light' ? '#6b7280' : '#94a3b8' }}>
                          {chat.messageCount} messages
                        </span>
                        <span className="text-xs" style={{ color: theme === 'light' ? '#6b7280' : '#94a3b8' }}>
                          {formatTimeAgo(chat.lastActivity)}
                        </span>
                      </div>
                    </div>
                    
                    {!editingChat && (
                      <div className="ml-2 md:opacity-0 md:group-hover:opacity-100 opacity-100 transition-opacity">
                        <div className="relative chat-menu">
                          <button
                            onClick={(e) => toggleChatMenu(chat.id, e)}
                            className="p-2 md:p-1 rounded hover:bg-slate-300 dark:hover:bg-slate-700 active:bg-slate-400 dark:active:bg-slate-600 transition-colors min-h-[44px] min-w-[44px] md:min-h-auto md:min-w-auto flex items-center justify-center"
                            aria-label="More options"
                          >
                            <MoreVertical className="w-4 h-4 md:w-3 md:h-3" style={{ color: theme === 'light' ? '#6b7280' : '#94a3b8' }} />
                          </button>
                          
                          <div className={cn(
                            "absolute right-0 top-full mt-1 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-300 dark:border-slate-700 py-1 z-[60] min-w-[120px]",
                            openChatMenu === chat.id ? "flex flex-col" : "hidden md:group-hover:flex md:flex-col"
                          )}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditChat(chat.id, chat.name);
                                closeChatMenu();
                              }}
                              className="px-4 py-3 md:px-3 md:py-2 text-sm md:text-xs text-left flex items-center transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 active:bg-slate-200 dark:active:bg-slate-600 min-h-[44px] md:min-h-auto"
                              style={{ color: theme === 'light' ? '#f1f5f9' : '#94a3b8' }}
                            >
                              <Edit3 className="w-4 h-4 md:w-3 md:h-3 mr-3 md:mr-2 flex-shrink-0" style={{ color: theme === 'light' ? '#f1f5f9' : '#94a3b8' }} />
                              Rename
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowDeleteModal(chat.id);
                                closeChatMenu();
                              }}
                              className="px-4 py-3 md:px-3 md:py-2 text-sm md:text-xs text-left hover:bg-red-50 dark:hover:bg-red-900/50 active:bg-red-100 dark:active:bg-red-900/70 flex items-center text-red-600 dark:text-red-400 transition-colors min-h-[44px] md:min-h-auto"
                            >
                              <Trash2 className="w-4 h-4 md:w-3 md:h-3 mr-3 md:mr-2 flex-shrink-0" />
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>


        {/* User Profile Section */}
        <div className="flex-shrink-0 border-t border-slate-300 dark:border-slate-700">
          {isCollapsed ? (
            <div className="p-3 flex justify-center">
              <div className="relative">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shadow-lg",
                  user?.photoURL && !user.isAnonymous 
                    ? "border-2 border-slate-500 hover:border-slate-400 transition-colors"
                    : "bg-gradient-to-br from-emerald-400 to-emerald-600"
                )}>
                  {user?.photoURL && !user.isAnonymous ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'User'}
                      className="w-8 h-8 rounded-full"
                    />
                  ) : user?.isAnonymous ? (
                    <span className="text-white text-xs font-medium">👤</span>
                  ) : (
                    <User className="w-4 h-4 text-white" />
                  )}
                </div>
                
                {/* Online indicator for Google users */}
                {user && !user.isAnonymous && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-slate-800 shadow-sm"></div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-6 md:p-4">
              <div className="flex items-center space-x-4 md:space-x-3">
                <div className="relative flex-shrink-0">
                  <div className={cn(
                    "w-12 h-12 md:w-10 md:h-10 rounded-full flex items-center justify-center shadow-lg",
                    user?.photoURL && !user.isAnonymous 
                      ? "border-2 border-slate-500 hover:border-slate-400 transition-colors"
                      : "bg-gradient-to-br from-emerald-400 to-emerald-600"
                  )}>
                    {user?.photoURL && !user.isAnonymous ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName || 'User'}
                        className="w-12 h-12 md:w-10 md:h-10 rounded-full"
                      />
                    ) : user?.isAnonymous ? (
                      <span className="text-white text-base md:text-sm font-medium">👤</span>
                    ) : (
                      <User className="w-6 h-6 md:w-5 md:h-5 text-white" />
                    )}
                  </div>
                  
                  {/* Online indicator for Google users */}
                  {user && !user.isAnonymous && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-800 shadow-sm"></div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-base md:text-sm font-medium truncate" style={{ color: theme === 'light' ? '#111827' : '#f1f5f9' }}>
                    {user?.displayName || userProfile?.profile?.name || 'User'}
                  </p>
                  {user?.email && (
                    <p className="text-sm md:text-xs truncate" style={{ color: theme === 'light' ? '#6b7280' : '#94a3b8' }}>
                      {user.email}
                    </p>
                  )}
                </div>
                
                <button
                  onClick={handleSignOutClick}
                  className="p-3 md:p-2 rounded-lg transition-colors hover:bg-slate-200 dark:hover:bg-slate-800 active:bg-slate-300 dark:active:bg-slate-700 flex-shrink-0 min-h-[44px] min-w-[44px] md:min-h-auto md:min-w-auto flex items-center justify-center"
                  title="Sign Out"
                >
                  <LogOut className="w-5 h-5 md:w-4 md:h-4" style={{ color: theme === 'light' ? '#6b7280' : '#94a3b8' }} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Close Button - Bottom Position */}
        {isMobileOpen && (
          <div 
            className="flex-shrink-0 p-6 border-t border-slate-300 dark:border-slate-700 md:hidden flex justify-center"
            style={{
              backgroundColor: theme === 'light' ? '#f8fafc' : '#0f172a'
            }}
          >
            <button
              onClick={onMobileClose}
              className={cn(
                "px-8 py-4 rounded-full border-2 border-slate-400 dark:border-slate-500 transition-all duration-200",
                "bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600",
                "hover:border-slate-500 dark:hover:border-slate-400",
                "active:scale-95 active:bg-slate-200 dark:active:bg-slate-500",
                "shadow-lg hover:shadow-xl touch-manipulation flex items-center space-x-3"
              )}
              title="Close Menu"
            >
              <X className="w-6 h-6" style={{ color: theme === 'light' ? '#f1f5f9' : '#f1f5f9' }} />
              <span className="text-base font-medium" style={{ color: theme === 'light' ? '#f1f5f9' : '#f1f5f9' }}>Close</span>
            </button>
          </div>
        )}

      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!showDeleteModal}
        onClose={() => setShowDeleteModal(null)}
        title="Delete Chat"
        className="max-w-[95vw] w-full sm:max-w-md"
      >
        <div className="space-y-4 p-1">
          <p className="text-sm" style={{ color: theme === 'light' ? '#374151' : '#94a3b8' }}>
            Are you sure you want to delete this chat? This action cannot be undone and all messages will be lost.
          </p>
          <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3">
            <button
              onClick={() => setShowDeleteModal(null)}
              className="w-full sm:w-auto px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              style={{ color: theme === 'light' ? '#374151' : '#94a3b8' }}
            >
              Cancel
            </button>
            <button
              onClick={() => showDeleteModal && handleDeleteChat(showDeleteModal)}
              className="w-full sm:w-auto px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>

      {/* Sign Out Confirmation Modal */}
      <Modal
        isOpen={showSignOutModal}
        onClose={() => setShowSignOutModal(false)}
        title="Sign Out"
        className="max-w-[95vw] w-full sm:max-w-md"
      >
        <div className="space-y-4 p-1">
          <p className="text-sm" style={{ color: theme === 'light' ? '#374151' : '#94a3b8' }}>
            Are you sure you want to sign out? You will need to sign in again to access your chats and data.
          </p>
          <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3">
            <button
              onClick={() => setShowSignOutModal(false)}
              className="w-full sm:w-auto px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              style={{ color: theme === 'light' ? '#374151' : '#94a3b8' }}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmSignOut}
              className="w-full sm:w-auto px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}