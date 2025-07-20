'use client';

import { useState } from 'react';
import { useConfig } from '@/contexts/ConfigContext';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
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
  Globe
} from 'lucide-react';
import { Modal } from './Modal';

interface ChatSidebarProps {
  className?: string;
  onConfigOpen?: () => void;
}

export function ChatSidebar({ className, onConfigOpen }: ChatSidebarProps) {
  const { theme } = useTheme();
  const { store, createNewChat } = useConfig();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [editingChat, setEditingChat] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const activeWebhook = store.getActiveWebhook();
  const chatsForActiveWebhook = activeWebhook ? store.getChatsForWebhook(activeWebhook.id) : [];
  const activeChat = store.getActiveChat();

  const handleNewChat = () => {
    if (!activeWebhook) return;
    
    const newChat = createNewChat(activeWebhook.id);
    store.setActiveChat(newChat.id);
  };

  const handleChatSelect = (chatId: string) => {
    store.setActiveChat(chatId);
  };

  const handleDeleteChat = (chatId: string) => {
    store.deleteChat(chatId);
    setShowDeleteModal(null);
    
    // If we deleted the active chat, select another one
    if (activeChat?.id === chatId) {
      const remainingChats = chatsForActiveWebhook.filter(chat => chat.id !== chatId);
      if (remainingChats.length > 0) {
        store.setActiveChat(remainingChats[0].id);
      }
    }
  };

  const handleEditChat = (chatId: string, currentName: string) => {
    setEditingChat(chatId);
    setEditName(currentName);
  };

  const handleSaveEdit = () => {
    if (!editingChat || !editName.trim()) return;
    
    store.updateChat(editingChat, { name: editName.trim() });
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
      <div className={cn(
        'flex flex-col h-full transition-all duration-300 border-r shadow-lg relative',
        'bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl',
        'border-slate-200/60 dark:border-slate-700/60',
        isCollapsed ? 'w-16' : 'w-80',
        className
      )}>
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b border-slate-200/60 dark:border-slate-700/60">
          <div className="flex items-center justify-between">
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold truncate" style={{ color: theme === 'light' ? '#111827' : '#f1f5f9' }}>
                  Chats
                </h2>
                {activeWebhook && (
                  <div className="flex items-center mt-1 text-xs" style={{ color: theme === 'light' ? '#6b7280' : '#94a3b8' }}>
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
                    <Plus className="w-4 h-4" style={{ color: theme === 'light' ? '#374151' : '#94a3b8' }} />
                  </button>
                  <button
                    onClick={onConfigOpen}
                    className="p-2 rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Settings"
                  >
                    <Settings className="w-4 h-4" style={{ color: theme === 'light' ? '#374151' : '#94a3b8' }} />
                  </button>
                </>
              )}
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-2 rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                title={isCollapsed ? 'Expand' : 'Collapse'}
              >
                {isCollapsed ? (
                  <ChevronRight className="w-4 h-4" style={{ color: theme === 'light' ? '#374151' : '#94a3b8' }} />
                ) : (
                  <ChevronLeft className="w-4 h-4" style={{ color: theme === 'light' ? '#374151' : '#94a3b8' }} />
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
                          style={{ color: theme === 'light' ? '#111827' : '#f1f5f9' }}
                        />
                      ) : (
                        <h3 className="text-sm font-medium truncate" style={{ 
                          color: chat.id === activeChat?.id 
                            ? '#3b82f6' 
                            : theme === 'light' ? '#111827' : '#f1f5f9' 
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
                              // Toggle dropdown menu
                            }}
                            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                          >
                            <MoreVertical className="w-3 h-3" style={{ color: theme === 'light' ? '#6b7280' : '#94a3b8' }} />
                          </button>
                          
                          {/* Dropdown menu - simplified for now */}
                          <div className="absolute right-0 top-6 hidden group-hover:flex flex-col bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-10">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditChat(chat.id, chat.name);
                              }}
                              className="px-3 py-1 text-xs text-left hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center"
                              style={{ color: theme === 'light' ? '#374151' : '#94a3b8' }}
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
        {!isCollapsed && store.webhooks.length > 1 && (
          <div className="flex-shrink-0 p-3 border-t border-slate-200/60 dark:border-slate-700/60">
            <select
              value={activeWebhook?.id || ''}
              onChange={(e) => store.setActiveWebhook(e.target.value)}
              className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              style={{ color: theme === 'light' ? '#111827' : '#f1f5f9' }}
            >
              {store.webhooks.map((webhook) => (
                <option key={webhook.id} value={webhook.id}>
                  {webhook.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!showDeleteModal}
        onClose={() => setShowDeleteModal(null)}
        title="Delete Chat"
        className="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm" style={{ color: theme === 'light' ? '#374151' : '#94a3b8' }}>
            Are you sure you want to delete this chat? This action cannot be undone and all messages will be lost.
          </p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowDeleteModal(null)}
              className="px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              style={{ color: theme === 'light' ? '#374151' : '#94a3b8' }}
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
    </>
  );
}