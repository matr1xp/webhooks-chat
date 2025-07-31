'use client';

import {
  ChevronLeft,
  ChevronRight,
  Crown,
  Edit3,
  HelpCircle,
  MessageSquare,
  MoreVertical,
  Plus,
  Settings,
  Trash2
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Image from 'next/image';
import { Modal } from './Modal';
import { ThemeToggle } from './ThemeToggle';
import { cn } from '@/lib/utils';
import { useFirebase } from '@/contexts/FirebaseContext';
import { useTheme } from '@/contexts/ThemeContext';

interface FirebaseChatSidebarProps {
  className?: string;
  onConfigOpen?: () => void;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export function FirebaseChatSidebar({ className, onConfigOpen, isMobileOpen = false, onMobileClose, onCollapsedChange }: FirebaseChatSidebarProps) {
  const { theme } = useTheme();
  const {
    // Auth
    signInWithGoogle,
    isSignedIn,
    
    // Webhooks
    activeWebhook,
    
    // Chats
    chats,
    activeChat,
    createNewChat,
    updateChat,
    deleteChat,
    setActiveChat,
  } = useFirebase();


  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Notify parent of initial collapsed state
  useEffect(() => {
    onCollapsedChange?.(isCollapsed);
  }, [isCollapsed, onCollapsedChange]);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [editingChat, setEditingChat] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [openChatMenu, setOpenChatMenu] = useState<string | null>(null);
  
  // Swipe handling state
  const [swipeStartX, setSwipeStartX] = useState<number | null>(null);
  const [swipeCurrentX, setSwipeCurrentX] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Use centralized health check from FirebaseContext to avoid circular dependency

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
      const isDeletingActiveChat = activeChat?.id === chatId;
      
      // Calculate next active chat before deletion to avoid race condition
      let nextActiveChat: string | null = null;
      if (isDeletingActiveChat) {
        const remainingChats = chatsForActiveWebhook.filter(chat => chat.id !== chatId);
        nextActiveChat = remainingChats.length > 0 ? remainingChats[0].id : null;
        
        // Set active chat to null BEFORE deletion to clear the UI immediately
        setActiveChat(null);
      }
      
      // Delete the chat
      await deleteChat(chatId);
      setShowDeleteModal(null);
      
      // Set the next active chat after deletion (if there was one)
      if (isDeletingActiveChat && nextActiveChat) {
        // Small delay to ensure Firestore has updated the chats list
        setTimeout(() => {
          setActiveChat(nextActiveChat);
        }, 100);
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
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

  // Swipe handling functions
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isMobileOpen) return;
    const touch = e.touches[0];
    setSwipeStartX(touch.clientX);
    setSwipeCurrentX(touch.clientX);
    setIsDragging(true);
  }, [isMobileOpen]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || swipeStartX === null) return;
    const touch = e.touches[0];
    setSwipeCurrentX(touch.clientX);
  }, [isDragging, swipeStartX]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging || swipeStartX === null || swipeCurrentX === null) {
      setIsDragging(false);
      setSwipeStartX(null);
      setSwipeCurrentX(null);
      return;
    }

    const swipeDistance = swipeCurrentX - swipeStartX;
    const swipeThreshold = -100; // Swipe left 100px to close

    if (swipeDistance < swipeThreshold && onMobileClose) {
      onMobileClose();
    }

    setIsDragging(false);
    setSwipeStartX(null);
    setSwipeCurrentX(null);
  }, [isDragging, swipeStartX, swipeCurrentX, onMobileClose]);


  // Mock handlers for new buttons
  const handleHelpClick = useCallback(() => {
    console.log('Help clicked');
  }, []);

  const handleUpgradeClick = useCallback(() => {
    console.log('Upgrade to PRO clicked');
  }, []);

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
      if (target && (target.closest('[aria-label="More options"]') || target.closest('.chat-menu'))) {
        return;
      }
      setOpenChatMenu(null);
    };

    if (openChatMenu) {
      document.addEventListener('click', handleClickOutside, true);
      return () => document.removeEventListener('click', handleClickOutside, true);
    }
  }, [openChatMenu]);


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
        ref={sidebarRef}
        className={cn(
          'flex flex-col h-full transition-all duration-300 shadow-lg relative backdrop-blur-xl',
          // Desktop: Normal sidebar behavior with border-r
          'md:border-r border-slate-300',
          // Mobile: Reduced width to show background content, positioned left, hidden when closed
          isMobileOpen ? 'fixed left-0 top-0 bottom-0 z-50 w-96 flex md:relative md:w-80' : 'hidden md:flex',
          // Desktop width - only apply when visible on desktop
          'md:' + (isCollapsed ? 'w-16' : 'w-80'),
          className
        )}
        style={{
          borderColor: theme === 'dark' ? '#0f172a' : '',
          backgroundColor: theme === 'light' ? '#f8fafc' : '#0f172a',
          // Apply swipe transform on mobile
          transform: isMobileOpen && isDragging && swipeStartX !== null && swipeCurrentX !== null 
            ? `translateX(${Math.min(0, swipeCurrentX - swipeStartX)}px)` 
            : undefined
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Figma-Style Header - Clean App Branding */}
        <div className="flex-shrink-0 p-6 md:p-4 border-slate-300 dark:border-slate-700">
          <div className="flex items-center justify-between">
            {!isCollapsed && (
              <div className="flex items-center space-x-3">
                <Image
                  src="/logo.png"
                  alt="Webn8 Logo"
                  width={28}
                  height={28}
                  className="flex-shrink-0 w-7 h-7 md:w-6 md:h-6"
                />
                <h2 className="text-xl md:text-lg font-semibold truncate" style={{ color: theme === 'light' ? '#111827' : '#f1f5f9' }}>
                  ChatAI
                </h2>
              </div>
            )}
            
            {/* Hide collapse button on mobile since we have close button */}
            <button
              onClick={() => {
                const newCollapsed = !isCollapsed;
                setIsCollapsed(newCollapsed);
                onCollapsedChange?.(newCollapsed);
              }}
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

        {/* Figma-Style New Chat Button - Prominent at Top */}
        {!isCollapsed && (
          <div className="flex-shrink-0 p-6 md:p-4">
            <button
              onClick={handleNewChat}
              disabled={!activeWebhook}
              className={cn(
                'w-full flex items-center justify-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200',
                'hover:shadow-md active:scale-95 touch-manipulation',
                theme === 'light'
                  ? 'bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700'
                  : 'bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:border-slate-600 text-slate-200',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
              title="Start New Chat"
            >
              <Plus className={cn(
                'w-5 h-5',
                theme === 'light' ? 'text-slate-700' : 'text-slate-200'
              )} />
              <span className={cn(
                'text-sm font-medium',
                theme === 'light' ? 'text-slate-700' : 'text-slate-200'
              )}>
                New chat
              </span>
            </button>
          </div>
        )}

        {/* Figma-Style Chat List */}
        <div className="flex-1 overflow-y-auto max-h-[75vh]">
          {/* Recent chats header - Always show as per Figma design */}
          {!isCollapsed && (
            <div className="px-6 md:px-4 py-3 md:py-2 border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Recent chats
              </h3>
            </div>
          )}

          {/* Show all chats (simplified from webhook filtering) */}
          {chatsForActiveWebhook.length === 0 && !isCollapsed && (
            <div className="p-6 md:p-4 text-center">
              <MessageSquare className="w-8 h-8 mx-auto mb-3 opacity-50" style={{ color: theme === 'light' ? '#6b7280' : '#94a3b8' }} />
              <p className="text-sm mb-3" style={{ color: theme === 'light' ? '#6b7280' : '#94a3b8' }}>
                No chats yet
              </p>
              <p className="text-xs" style={{ color: theme === 'light' ? '#94a3b8' : '#64748b' }}>
                Start a new conversation above
              </p>
            </div>
          )}

          {chatsForActiveWebhook.map((chat) => (
            <div
              key={chat.id}
              className={cn(
                'relative group cursor-pointer border rounded-lg m-2 transition-all duration-200',
                'hover:shadow-md hover:-translate-y-0.5 active:scale-95 touch-manipulation',
                'border-slate-200 dark:border-slate-700',
                chat.id === activeChat?.id 
                  ? '' 
                  : 'hover:bg-cyan-600 hover:border-cyan-600 dark:hover:bg-cyan-600 dark:hover:border-cyan-600',
                chat.id === activeChat?.id 
                  ? theme === 'light' 
                    ? 'bg-gradient-to-br from-blue-500 to-blue-600 border-blue-500 border-r-4 border-r-cyan-500' 
                    : 'bg-gradient-to-br from-indigo-500 to-purple-600 border-indigo-500 border-r-4 border-r-cyan-500'
                  : 'bg-white dark:bg-slate-800'
              )}
              onClick={() => handleChatSelect(chat.id)}
            >
              <div className="p-4 md:p-3">
                {isCollapsed ? (
                  <div className="flex justify-center">
                    <MessageSquare className="w-5 h-5" style={{ 
                      color: chat.id === activeChat?.id 
                        ? '#ffffff' 
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
                          className="w-full text-sm font-medium bg-transparent border-none outline-none text-[#374151] dark:text-[#ffffff]"
                        />
                      ) : (
                        <h3 className={cn(
                          "text-sm font-medium truncate transition-colors",
                          chat.id === activeChat?.id 
                            ? 'text-white' 
                            : 'text-slate-700 dark:text-slate-200 group-hover:text-white dark:group-hover:text-white'
                        )}>
                          {chat.name}
                        </h3>
                      )}
                      <div className="flex items-center justify-between mt-1">
                        <span className={cn(
                          "text-xs transition-colors",
                          chat.id === activeChat?.id 
                            ? 'text-cyan-100' 
                            : 'text-slate-500 dark:text-slate-400 group-hover:text-cyan-100'
                        )}>
                          {chat.messageCount} messages
                        </span>
                        <span className={cn(
                          "text-xs transition-colors",
                          chat.id === activeChat?.id 
                            ? 'text-cyan-100' 
                            : 'text-slate-500 dark:text-slate-400 group-hover:text-cyan-100'
                        )}>
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
                            "fixed bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-300 dark:border-slate-700 py-1 z-[9999] min-w-[120px]",
                            "left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2",
                            openChatMenu === chat.id ? "flex flex-col" : "hidden"
                          )}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditChat(chat.id, chat.name);
                                closeChatMenu();
                              }}
                              className="px-4 py-3 md:px-3 md:py-2 text-sm md:text-xs text-left flex items-center transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 active:bg-slate-200 dark:active:bg-slate-600 min-h-[44px] md:min-h-auto text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                            >
                              <Edit3 className="w-4 h-4 md:w-3 md:h-3 mr-3 md:mr-2 flex-shrink-0 text-slate-600 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-white" />
                              Rename
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowDeleteModal(chat.id);
                                closeChatMenu();
                              }}
                              className="px-4 py-3 md:px-3 md:py-2 text-sm md:text-xs text-left hover:bg-red-50 dark:hover:bg-red-900/50 active:bg-red-100 dark:active:bg-red-900/70 flex items-center text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors min-h-[44px] md:min-h-auto"
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

        {/* Bottom Actions Section - Figma Design */}
        {!isCollapsed && (
          <div className="flex-shrink-0 border-slate-300 dark:border-slate-700 p-4 space-y-2">
            {/* Settings Button - Full width on desktop, flex on mobile */}
            <div className="md:block flex items-center justify-between space-x-2 md:space-x-0">
              <button
                onClick={onConfigOpen}
                className={cn(
                  "flex-1 md:w-full flex items-center space-x-3 px-3 py-2 text-sm border rounded-lg transition-all duration-200 text-left",
                  "hover:shadow-md active:scale-95 touch-manipulation",
                  theme === 'light'
                    ? 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700'
                    : 'bg-slate-800 border-slate-700 hover:bg-slate-700 hover:border-slate-600 text-slate-200'
                )}
              >
                <Settings className="w-4 h-4 flex-shrink-0" />
                <span>Settings</span>
              </button>
              
              {/* Theme Toggle - Mobile version */}
              <div className="flex-shrink-0 md:hidden">
                <ThemeToggle className="scale-90" />
              </div>
            </div>

            {/* Help Button */}
            <button
              onClick={handleHelpClick}
              className={cn(
                "w-full flex items-center space-x-3 px-3 py-2 text-sm border rounded-lg transition-all duration-200 text-left",
                "hover:shadow-md active:scale-95 touch-manipulation",
                theme === 'light'
                  ? 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700'
                  : 'bg-slate-800 border-slate-700 hover:bg-slate-700 hover:border-slate-600 text-slate-200'
              )}
            >
              <HelpCircle className="w-4 h-4 flex-shrink-0" />
              <span>Help</span>
            </button>

            {/* Upgrade to PRO Button */}
            {/* <button
              onClick={handleUpgradeClick}
              className={cn(
                "w-full flex items-center justify-center space-x-2 px-4 py-3 text-sm font-medium rounded-lg transition-all",
                "bg-gradient-to-r from-purple-600 to-blue-600 text-white",
                "hover:from-purple-700 hover:to-blue-700",
                "active:scale-95 touch-manipulation shadow-lg"
              )}
            >
              <Crown className="w-4 h-4 flex-shrink-0" />
              <span>Upgrade to PRO</span>
            </button> */}
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

    </>
  );
}