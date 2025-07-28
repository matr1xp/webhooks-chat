'use client';

import { useState, useEffect, useRef } from 'react';
import { useConfig } from '@/contexts/ConfigContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useFirebase } from '@/contexts/FirebaseContext';
import { useSelector } from 'react-redux';
import { selectActiveWebhook, selectActiveChat, selectChatsForWebhook } from '@/store/configSelectors';
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
  X
} from 'lucide-react';
import { Modal } from './Modal';
import { webhookClient } from '@/lib/webhook-client';

interface ChatSidebarProps {
  className?: string;
  onConfigOpen?: () => void;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function ChatSidebar({ className, onConfigOpen, isMobileOpen = false, onMobileClose }: ChatSidebarProps) {
  const { theme } = useTheme();
  const { store, createNewChat } = useConfig();
  const firebase = useFirebase();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [editingChat, setEditingChat] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const isInitialized = useRef(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isWebhookSelectorOpen, setIsWebhookSelectorOpen] = useState(false);

  // Feature flag: Switch between Firebase and Redux
  const USE_FIREBASE = true; // Set to false to use Redux instead

  // Use Firebase or Redux based on feature flag
  const reduxActiveWebhook = useSelector(selectActiveWebhook);
  const reduxActiveChat = useSelector(selectActiveChat);
  const reduxChatsForActiveWebhook = useSelector(selectChatsForWebhook(reduxActiveWebhook?.id || ''));

  const activeWebhook = USE_FIREBASE ? firebase.activeWebhook : reduxActiveWebhook;
  const activeChat = USE_FIREBASE ? firebase.activeChat : reduxActiveChat;
  const chatsForActiveWebhook = USE_FIREBASE ? firebase.chats.filter(chat => chat.webhookId === activeWebhook?.id) : reduxChatsForActiveWebhook;

  // Check webhook health
  useEffect(() => {
    const checkHealth = async () => {
      if (!activeWebhook) {
        console.log('ChatSidebar: No active webhook, setting offline');
        setIsOnline(false);
        return;
      }

      console.log('ChatSidebar: Checking health for webhook:', activeWebhook.name);
      try {
        const healthy = await webhookClient.checkHealth(activeWebhook as any);
        console.log('ChatSidebar: Health check result:', healthy);
        setIsOnline(healthy);
      } catch (error) {
        console.log('ChatSidebar: Health check error:', error);
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
      setIsOnline(false);
    }
    
    // Check health every 10 minutes (600000ms) - reduced frequency for external webhooks
    const healthInterval = setInterval(checkHealth, 600000);

    return () => {
      clearInterval(healthInterval);
    };
  }, [activeWebhook]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      const target = event.target as Element;
      // Don't close if clicking on the dropdown itself or its children
      if (target && (target.closest('.dropdown-menu') || target.closest('[aria-label="More options"]') || target.closest('.webhook-selector'))) {
        return;
      }
      setOpenDropdown(null);
      setIsWebhookSelectorOpen(false);
    };

    if (openDropdown || isWebhookSelectorOpen) {
      document.addEventListener('click', handleClickOutside, true);
      return () => document.removeEventListener('click', handleClickOutside, true);
    }
  }, [openDropdown, isWebhookSelectorOpen]);

  const handleNewChat = async () => {
    if (!activeWebhook) return;
    
    if (USE_FIREBASE) {
      const newChat = await firebase.createNewChat(activeWebhook.id, `Chat with ${activeWebhook.name}`);
      firebase.setActiveChat(newChat.id);
    } else {
      const newChat = createNewChat(activeWebhook.id);
      store.setActiveChat(newChat.id);
    }
  };

  const handleChatSelect = (chatId: string) => {
    if (USE_FIREBASE) {
      firebase.setActiveChat(chatId);
    } else {
      store.setActiveChat(chatId);
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    if (USE_FIREBASE) {
      await firebase.deleteChat(chatId);
    } else {
      store.deleteChat(chatId);
    }
    setShowDeleteModal(null);
    
    // If we deleted the active chat, select another one
    if (activeChat?.id === chatId) {
      const remainingChats = chatsForActiveWebhook.filter(chat => chat.id !== chatId);
      if (remainingChats.length > 0) {
        if (USE_FIREBASE) {
          firebase.setActiveChat(remainingChats[0].id);
        } else {
          store.setActiveChat(remainingChats[0].id);
        }
      }
    }
  };

  const handleEditChat = (chatId: string, currentName: string) => {
    setEditingChat(chatId);
    setEditName(currentName);
  };

  const handleSaveEdit = async () => {
    if (!editingChat || !editName.trim()) return;
    
    if (USE_FIREBASE) {
      await firebase.updateChat(editingChat, editName.trim());
    } else {
      store.updateChat(editingChat, { name: editName.trim() });
    }
    setEditingChat(null);
    setEditName('');
  };

  const handleCancelEdit = () => {
    setEditingChat(null);
    setEditName('');
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'now';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return `${Math.floor(diffInMinutes / 1440)}d`;
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={onMobileClose}
        />
      )}

      <div className={cn(
        'flex flex-col h-full transition-all duration-300 border-r shadow-lg relative',
        'bg-slate-800 dark:bg-slate-900 backdrop-blur-xl',
        'border-slate-700 dark:border-slate-700',
        // Desktop: Normal sidebar behavior OR Mobile when open
        isMobileOpen ? 'fixed inset-y-0 left-0 z-50 w-80 flex' : 'hidden md:flex',
        // Desktop width when not mobile
        !isMobileOpen && (isCollapsed ? 'w-16' : 'w-80'),
        // Mobile is always full width (w-80)
        isMobileOpen && 'w-80',
        className
      )}>
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b border-slate-700 dark:border-slate-700">
          <div className="flex items-center justify-between">
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <Image
                    src="/logo.png"
                    alt="Webn8 Logo"
                    width={24}
                    height={24}
                    className="flex-shrink-0"
                    style={{ width: 'auto', height: '24px' }}
                  />
                  <h2 className="text-lg font-semibold truncate" style={{ color: '#f1f5f9' }}>
                    WebhookIQ
                  </h2>
                </div>
                {/* Webhook Selector in Header */}
                {(USE_FIREBASE ? firebase.webhooks : store.webhooks).length > 0 && (
                  <div className="mt-2 relative webhook-selector">
                    {(USE_FIREBASE ? firebase.webhooks : store.webhooks).length === 1 ? (
                      // Single webhook - show as static text with status
                      <div className="flex items-center justify-between text-xs" style={{ color: '#94a3b8' }}>
                        <div className="flex items-center min-w-0 flex-1">
                          <Webhook className="w-3 h-3 mr-1 flex-shrink-0" />
                          <span className="truncate">{activeWebhook?.name}</span>
                        </div>
                        {/* Connection status pill */}
                        <div className={cn(
                          "flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-medium transition-all duration-300 ml-2 flex-shrink-0",
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
                      // Multiple webhooks - show as dropdown selector with status  
                      <div className="space-y-1">
                        <button
                          onClick={() => setIsWebhookSelectorOpen(!isWebhookSelectorOpen)}
                          className={cn(
                            "flex items-center w-full text-left text-xs px-2 py-1 rounded transition-colors",
                            "hover:bg-slate-700 dark:hover:bg-slate-700 touch-manipulation",
                            "focus:outline-none focus:ring-1 focus:ring-blue-500",
                            isWebhookSelectorOpen && "bg-slate-700 dark:bg-slate-700"
                          )}
                          style={{ color: '#94a3b8' }}
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

                        {/* Connection status pill for multiple webhooks */}
                        <div className="flex justify-end">
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
                          <div className="absolute left-0 right-0 top-full mt-1 bg-slate-800 dark:bg-slate-800 border border-slate-700 dark:border-slate-700 rounded-lg shadow-lg z-[70] max-h-48 overflow-y-auto">
                            {(USE_FIREBASE ? firebase.webhooks : store.webhooks).map((webhook) => (
                              <button
                                key={webhook.id}
                                onClick={() => {
                                  if (USE_FIREBASE) {
                                    firebase.setActiveWebhook(webhook.id);
                                  } else {
                                    store.setActiveWebhook(webhook.id);
                                  }
                                  setIsWebhookSelectorOpen(false);
                                }}
                                className={cn(
                                  "w-full text-left px-3 py-2 text-xs transition-colors touch-manipulation",
                                  "hover:bg-[#e2e8f0] dark:hover:bg-[#e2e8f0]",
                                  "hover:text-[#374151] dark:hover:text-[#374151]",
                                  "active:bg-[#cbd5e1] dark:active:bg-[#cbd5e1]",
                                  "first:rounded-t-lg last:rounded-b-lg",
                                  "flex items-center",
                                  webhook.id === activeWebhook?.id && "bg-blue-600 text-white"
                                )}
                                style={{ 
                                  color: webhook.id === activeWebhook?.id ? '#ffffff' : '#374151'
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
            
            <div className="flex items-center space-x-1">
              {!isCollapsed && (
                <>
                  <button
                    onClick={handleNewChat}
                    disabled={!activeWebhook}
                    className={cn(
                      'p-2 rounded-lg transition-colors touch-manipulation',
                      'hover:bg-slate-100 dark:hover:bg-slate-800',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                      'active:scale-95 active:bg-slate-200 dark:active:bg-slate-700'
                    )}
                    title="New Chat"
                  >
                    <Plus className="w-4 h-4" style={{ color: '#94a3b8' }} />
                  </button>
                  <button
                    onClick={onConfigOpen}
                    className={cn(
                      'p-2 rounded-lg transition-colors touch-manipulation',
                      'hover:bg-slate-100 dark:hover:bg-slate-800',
                      'active:scale-95 active:bg-slate-200 dark:active:bg-slate-700'
                    )}
                    title="Settings"
                  >
                    <Settings className="w-4 h-4" style={{ color: '#94a3b8' }} />
                  </button>
                </>
              )}
              {/* Hide collapse button on mobile since we have close button */}
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className={cn(
                  'p-2 rounded-lg transition-colors touch-manipulation hidden md:block',
                  'hover:bg-slate-100 dark:hover:bg-slate-800',
                  'active:scale-95 active:bg-slate-200 dark:active:bg-slate-700'
                )}
                title={isCollapsed ? 'Expand' : 'Collapse'}
              >
                {isCollapsed ? (
                  <ChevronRight className="w-4 h-4" style={{ color: '#94a3b8' }} />
                ) : (
                  <ChevronLeft className="w-4 h-4" style={{ color: '#94a3b8' }} />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {!activeWebhook && !isCollapsed && (
            <div className="p-4 text-center">
              <Globe className="w-8 h-8 mx-auto mb-2 opacity-50" style={{ color: theme === 'light' ? '#6b7280' : '#94a3b8' }} />
              <p className="text-sm" style={{ color: theme === 'light' ? '#6b7280' : '#94a3b8' }}>
                No webhook configured
              </p>
              <button
                onClick={onConfigOpen}
                className={cn(
                  "mt-2 px-3 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors touch-manipulation",
                  "active:scale-95 active:bg-blue-700"
                )}
              >
                Setup Webhook
              </button>
            </div>
          )}

          {activeWebhook && chatsForActiveWebhook.length === 0 && !isCollapsed && (
            <div className="p-4 text-center">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" style={{ color: theme === 'light' ? '#6b7280' : '#94a3b8' }} />
              <p className="text-sm" style={{ color: theme === 'light' ? '#6b7280' : '#94a3b8' }}>
                No chats yet
              </p>
              <button
                onClick={handleNewChat}
                className={cn(
                  "mt-2 px-3 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors touch-manipulation",
                  "active:scale-95 active:bg-blue-700"
                )}
              >
                Start First Chat
              </button>
            </div>
          )}

          {chatsForActiveWebhook.map((chat) => (
            <div
              key={chat.id}
              className={cn(
                'relative group cursor-pointer border-b border-slate-100 dark:border-slate-800 last:border-b-0',
                'hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors touch-manipulation',
                'active:bg-slate-100 dark:active:bg-slate-700/50',
                'md:hover:bg-slate-50 md:dark:hover:bg-slate-800/50',
                chat.id === activeChat?.id && 'bg-blue-50 dark:bg-blue-900/20 border-r-2 border-r-blue-500'
              )}
              onClick={() => {
                handleChatSelect(chat.id);
                // Close mobile sidebar after selection
                if (isMobileOpen && onMobileClose) {
                  onMobileClose();
                }
              }}
            >
              <div className="p-3">
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
                          {formatTimeAgo(typeof chat.lastActivity === 'string' ? chat.lastActivity : chat.lastActivity.toDate?.()?.toISOString() || chat.lastActivity.toString())}
                        </span>
                      </div>
                    </div>
                    
                    {!editingChat && (
                      <div className="ml-2 md:opacity-0 md:group-hover:opacity-100 opacity-100 transition-opacity">
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              console.log('Three-dot menu clicked for chat:', chat.id);
                              setOpenDropdown(openDropdown === chat.id ? null : chat.id);
                            }}
                            className={cn(
                              'p-3 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors',
                              'active:scale-95 active:bg-slate-300 dark:active:bg-slate-600',
                              'touch-manipulation select-none',
                              'focus:outline-none focus:ring-2 focus:ring-blue-500',
                              openDropdown === chat.id && 'bg-slate-200 dark:bg-slate-700'
                            )}
                            type="button"
                            aria-label="More options"
                          >
                            <MoreVertical className="w-4 h-4" style={{ color: theme === 'light' ? '#6b7280' : '#94a3b8' }} />
                          </button>
                          
                          {/* Unified dropdown - works on both mobile and desktop */}
                          <div className={cn(
                            "dropdown-menu absolute right-0 top-8 flex-col bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-10 min-w-[120px]",
                            // Mobile: Show/hide based on openDropdown state
                            isMobileOpen ? (
                              openDropdown === chat.id ? "flex" : "hidden"
                            ) : (
                              // Desktop: Show on group hover, but also allow click-based opening
                              openDropdown === chat.id ? "flex" : "hidden md:group-hover:flex"
                            )
                          )}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditChat(chat.id, chat.name);
                                setOpenDropdown(null);
                              }}
                              className={cn(
                                "px-3 py-2 text-sm text-left flex items-center transition-colors touch-manipulation",
                                "hover:bg-slate-100 dark:hover:bg-slate-700",
                                "active:bg-slate-200 dark:active:bg-slate-600"
                              )}
                              style={{ 
                                color: theme === 'light' ? '#374151' : '#94a3b8'
                              }}
                            >
                              <Edit3 className="w-4 h-4 mr-2" />
                              Rename
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowDeleteModal(chat.id);
                                setOpenDropdown(null);
                              }}
                              className={cn(
                                "px-3 py-2 text-sm text-left flex items-center text-red-600 dark:text-red-400 transition-colors touch-manipulation",
                                "hover:bg-red-100 dark:hover:bg-red-900",
                                "active:bg-red-200 dark:active:bg-red-800"
                              )}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
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

        {/* Mobile Close Button - Bottom Position */}
        {isMobileOpen && (
          <div className="flex-shrink-0 p-3 border-t border-slate-700 dark:border-slate-700 md:hidden flex justify-center">
            <button
              onClick={onMobileClose}
              className={cn(
                "p-3 rounded-full border-2 border-slate-400 dark:border-slate-500 transition-all duration-200",
                "bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600",
                "hover:border-slate-500 dark:hover:border-slate-400",
                "active:scale-95 active:bg-slate-300 dark:active:bg-slate-500",
                "shadow-sm hover:shadow-md touch-manipulation"
              )}
              title="Close Menu"
            >
              <X className="w-5 h-5" style={{ color: '#374151' }} />
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
          <p className="text-sm" style={{ color: theme === 'light' ? '#111827' : '#ffffff' }}>
            Are you sure you want to delete this chat? This action cannot be undone and all messages will be lost.
          </p>
          <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3">
            <button
              onClick={() => setShowDeleteModal(null)}
              className={cn(
                "w-full sm:w-auto px-4 py-2 text-sm border rounded-lg transition-colors touch-manipulation",
                "hover:bg-slate-50 dark:hover:bg-slate-800",
                "active:scale-95 active:bg-slate-100 dark:active:bg-slate-700"
              )}
              style={{ 
                color: theme === 'light' ? '#111827' : '#ffffff',
                borderColor: theme === 'light' ? '#e2e8f0' : '#374151'
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => showDeleteModal && handleDeleteChat(showDeleteModal)}
              className={cn(
                "w-full sm:w-auto px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors touch-manipulation",
                "active:scale-95 active:bg-red-700"
              )}
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}