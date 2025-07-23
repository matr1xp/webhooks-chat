'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
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
  Eraser
} from 'lucide-react';
import { Modal } from './Modal';

interface FirebaseChatSidebarProps {
  className?: string;
  onConfigOpen?: () => void;
}

export function FirebaseChatSidebar({ className, onConfigOpen }: FirebaseChatSidebarProps) {
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
  }, [setActiveChat]);

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

  return (
    <>
      <div className={cn(
        'flex flex-col h-full transition-all duration-300 border-r shadow-lg relative',
        'bg-slate-800 dark:bg-slate-900 backdrop-blur-xl',
        'border-slate-700 dark:border-slate-700',
        isCollapsed ? 'w-16' : 'w-80',
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
                {activeWebhook && (
                  <div className="flex items-center mt-1 text-xs" style={{ color: '#94a3b8' }}>
                    <Webhook className="w-3 h-3 mr-1" />
                    <span className="truncate">{activeWebhook.name}</span>
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
                      'p-2 rounded-lg transition-colors',
                      'hover:bg-slate-100 dark:hover:bg-slate-800',
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                    title="New Chat"
                  >
                    <Plus className="w-4 h-4" style={{ color: '#94a3b8' }} />
                  </button>
                  <button
                    onClick={handleCleanupEmptyChats}
                    disabled={!activeWebhook}
                    className={cn(
                      'p-2 rounded-lg transition-colors',
                      'hover:bg-slate-100 dark:hover:bg-slate-800',
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                    title="Cleanup Empty Chats"
                  >
                    <Eraser className="w-4 h-4" style={{ color: '#94a3b8' }} />
                  </button>
                  <button
                    onClick={onConfigOpen}
                    className="p-2 rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Settings"
                  >
                    <Settings className="w-4 h-4" style={{ color: '#94a3b8' }} />
                  </button>
                </>
              )}
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-2 rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
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
                className="mt-2 px-3 py-1 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
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
                className="mt-2 px-3 py-1 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
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
                'hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors',
                chat.id === activeChat?.id && 'bg-blue-50 dark:bg-blue-900/20 border-r-2 border-r-blue-500'
              )}
              onClick={() => handleChatSelect(chat.id)}
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
                          {formatTimeAgo(chat.lastActivity)}
                        </span>
                      </div>
                    </div>
                    
                    {!editingChat && (
                      <div className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                          >
                            <MoreVertical className="w-3 h-3" style={{ color: theme === 'light' ? '#6b7280' : '#94a3b8' }} />
                          </button>
                          
                          <div className="absolute right-0 top-6 hidden group-hover:flex flex-col bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-10">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditChat(chat.id, chat.name);
                              }}
                              className="px-3 py-1 text-xs text-left flex items-center transition-colors"
                              style={{ 
                                color: theme === 'light' ? '#374151' : '#94a3b8',
                                backgroundColor: 'transparent'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = theme === 'light' ? '#f1f5f9' : '#374151';
                                e.currentTarget.style.color = theme === 'light' ? '#111827' : '#ffffff';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                                e.currentTarget.style.color = theme === 'light' ? '#374151' : '#94a3b8';
                              }}
                            >
                              <Edit3 className="w-3 h-3 mr-2" />
                              Rename
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowDeleteModal(chat.id);
                              }}
                              className="px-3 py-1 text-xs text-left hover:bg-red-100 dark:hover:bg-red-900 flex items-center text-red-600 dark:text-red-400"
                            >
                              <Trash2 className="w-3 h-3 mr-2" />
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

        {/* Webhook Switcher */}
        {!isCollapsed && webhooks.length > 1 && (
          <div className="flex-shrink-0 p-3 border-t border-slate-700 dark:border-slate-700">
            <select
              value={activeWebhook?.id || ''}
              onChange={(e) => setActiveWebhook(e.target.value)}
              className="w-full text-xs p-2 rounded-lg border border-slate-700 dark:border-slate-700 bg-slate-800 dark:bg-slate-800"
              style={{ color: '#f1f5f9' }}
            >
              {webhooks.map((webhook) => (
                <option key={webhook.id} value={webhook.id}>
                  {webhook.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* User Profile Section */}
        <div className="flex-shrink-0 border-t border-slate-700 dark:border-slate-700">
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
            <div className="p-4">
              <div className="flex items-center space-x-3">
                <div className="relative flex-shrink-0">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center shadow-lg",
                    user?.photoURL && !user.isAnonymous 
                      ? "border-2 border-slate-500 hover:border-slate-400 transition-colors"
                      : "bg-gradient-to-br from-emerald-400 to-emerald-600"
                  )}>
                    {user?.photoURL && !user.isAnonymous ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName || 'User'}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : user?.isAnonymous ? (
                      <span className="text-white text-sm font-medium">👤</span>
                    ) : (
                      <User className="w-5 h-5 text-white" />
                    )}
                  </div>
                  
                  {/* Online indicator for Google users */}
                  {user && !user.isAnonymous && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-800 shadow-sm"></div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: '#f1f5f9' }}>
                    {user?.displayName || userProfile?.profile?.name || 'User'}
                  </p>
                  {user?.email && (
                    <p className="text-xs truncate" style={{ color: '#94a3b8' }}>
                      {user.email}
                    </p>
                  )}
                </div>
                
                <button
                  onClick={handleSignOutClick}
                  className="p-2 rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 flex-shrink-0"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" style={{ color: '#94a3b8' }} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!showDeleteModal}
        onClose={() => setShowDeleteModal(null)}
        title="Delete Chat"
        className="max-w-md"
      >
        <div className="space-y-4" style={{ backgroundColor: theme === 'light' ? '#ffffff' : '#0f172a', padding: '16px', borderRadius: '8px' }}>
          <p className="text-sm" style={{ color: theme === 'light' ? '#111827' : '#ffffff' }}>
            Are you sure you want to delete this chat? This action cannot be undone and all messages will be lost.
          </p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowDeleteModal(null)}
              className="px-4 py-2 text-sm border rounded-lg transition-colors"
              style={{ 
                color: theme === 'light' ? '#111827' : '#ffffff',
                borderColor: theme === 'light' ? '#e2e8f0' : '#374151',
                backgroundColor: 'transparent'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme === 'light' ? '#f1f5f9' : '#374151';
                e.currentTarget.style.color = theme === 'light' ? '#111827' : '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = theme === 'light' ? '#111827' : '#ffffff';
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => showDeleteModal && handleDeleteChat(showDeleteModal)}
              className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
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
        className="max-w-md"
      >
        <div className="space-y-4" style={{ backgroundColor: theme === 'light' ? '#ffffff' : '#0f172a', padding: '16px', borderRadius: '8px' }}>
          <p className="text-sm" style={{ color: theme === 'light' ? '#111827' : '#ffffff' }}>
            Are you sure you want to sign out? You will need to sign in again to access your chats and data.
          </p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowSignOutModal(false)}
              className="px-4 py-2 text-sm border rounded-lg transition-colors"
              style={{ 
                color: theme === 'light' ? '#111827' : '#ffffff',
                borderColor: theme === 'light' ? '#e2e8f0' : '#374151',
                backgroundColor: 'transparent'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme === 'light' ? '#f1f5f9' : '#374151';
                e.currentTarget.style.color = theme === 'light' ? '#111827' : '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = theme === 'light' ? '#111827' : '#ffffff';
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmSignOut}
              className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}