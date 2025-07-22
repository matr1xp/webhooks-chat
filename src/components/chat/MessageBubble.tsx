'use client';

import { Message } from '@/types/chat';
import { formatTimestamp, cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { useFirebase } from '@/contexts/FirebaseContext';
import { Check, CheckCheck, X, Clock, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MessageBubbleProps {
  message: Message;
  isUser?: boolean;
}

export function MessageBubble({ message, isUser }: MessageBubbleProps) {
  const { theme } = useTheme();
  const { user } = useFirebase();
  // Determine if this is a user message (default to true if not explicitly set)
  const actualIsUser = isUser !== undefined ? isUser : !message.isBot;

  const getStatusIcon = () => {
    switch (message.status) {
      case 'sending':
        return <Clock className="w-3 h-3 text-gray-400" />;
      case 'delivered':
        return <CheckCheck className="w-3 h-3 text-blue-500" />;
      case 'failed':
        return <X className="w-3 h-3 text-red-500" />;
      default:
        return <Check className="w-3 h-3 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (message.status) {
      case 'sending':
        return 'opacity-70';
      case 'failed':
        return 'border-red-200 bg-red-50';
      default:
        return '';
    }
  };

  return (
    <div className="w-full mb-6 group animate-message-in">
      {/* User messages - right aligned */}
      {actualIsUser && (
        <div className="flex justify-end items-start space-x-3">
          <div className={cn(
            'relative max-w-xs sm:max-w-sm px-4 py-3 rounded-2xl rounded-tr-md',
            'text-white shadow-lg user-message',
            'transform transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5',
            getStatusColor()
          )}>
            {/* User message content */}
            <div className="break-words">
              {message.type === 'text' && (
                <p className="text-sm leading-relaxed">
                  {message.content && typeof message.content === 'string' ? message.content : '[Invalid content]'}
                </p>
              )}
              {message.type === 'image' && (
                <div>
                  <img 
                    src={message.content} 
                    alt="Shared image" 
                    className="rounded-lg max-w-full h-auto mb-2 shadow-md"
                    loading="lazy"
                  />
                </div>
              )}
              {message.type === 'file' && (
                <div className="flex items-center space-x-3 bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-sm">📎</span>
                  </div>
                  <span className="text-sm font-medium">{message.content}</span>
                </div>
              )}
            </div>

            {/* User message metadata */}
            <div className="flex items-center justify-between mt-2 text-xs text-blue-100">
              <span className="font-medium opacity-75">{formatTimestamp(message.timestamp)}</span>
              <div className="ml-2 opacity-80">
                {getStatusIcon()}
              </div>
            </div>
          </div>

          {/* User avatar */}
          <div className="relative flex-shrink-0">
            <div className={cn(
              "w-9 h-9 rounded-full flex items-center justify-center shadow-lg ring-2 ring-white ring-opacity-20",
              user?.photoURL && !user.isAnonymous 
                ? "border-2 border-emerald-400" 
                : "bg-gradient-to-br from-emerald-400 to-emerald-600"
            )}>
              {user?.photoURL && !user.isAnonymous ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="w-9 h-9 rounded-full"
                />
              ) : user?.isAnonymous ? (
                <span className="text-white text-sm font-medium">👤</span>
              ) : (
                <User className="w-4 h-4 text-white" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bot messages - left aligned */}
      {!actualIsUser && (
        <div className="flex justify-start items-start space-x-3">
          {/* Bot avatar */}
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg ring-2 ring-white ring-opacity-20">
            <span className="text-white text-sm font-medium">🤖</span>
          </div>
          
          <div className={cn(
            'relative flex-1 px-4 py-3 rounded-2xl rounded-tl-md',
            'shadow-lg bot-message',
            'transform transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5',
            'backdrop-blur-sm',
            getStatusColor()
          )}>
            {/* Bot message content */}
            <div className="break-words">
              {message.type === 'text' && (
                <div className="text-sm markdown-content" style={{ color: theme === 'light' ? '#1f2937' : '#e2e8f0' }}>
                  {message.content && typeof message.content === 'string' ? (
                    <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      // Custom styling for markdown elements in bot messages
                      p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed" style={{ color: theme === 'light' ? '#1f2937' : '#e2e8f0' }}>{children}</p>,
                      strong: ({ children }) => <strong className="font-semibold" style={{ color: theme === 'light' ? '#111827' : '#f1f5f9' }}>{children}</strong>,
                      em: ({ children }) => <em className="italic" style={{ color: theme === 'light' ? '#374151' : '#94a3b8' }}>{children}</em>,
                      code: ({ children }) => (
                        <code 
                          className="bg-indigo-50 dark:bg-indigo-900 px-2 py-1 rounded-md text-xs font-mono border border-indigo-100 dark:border-indigo-700"
                          style={{ color: theme === 'light' ? '#4338ca' : '#a5b4fc' }}
                        >
                          {children}
                        </code>
                      ),
                      pre: ({ children }) => (
                        <pre 
                          className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg mt-2 mb-2 text-xs font-mono overflow-x-auto border border-slate-200 dark:border-slate-600"
                          style={{ color: theme === 'light' ? '#1f2937' : '#e2e8f0' }}
                        >
                          {children}
                        </pre>
                      ),
                      ul: ({ children }) => <ul className="list-disc list-outside mb-2 space-y-1 pl-4" style={{ color: theme === 'light' ? '#1f2937' : '#e2e8f0' }}>{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal list-outside mb-2 space-y-1 pl-4" style={{ color: theme === 'light' ? '#1f2937' : '#e2e8f0' }}>{children}</ol>,
                      li: ({ children }) => <li className="text-sm leading-relaxed" style={{ color: theme === 'light' ? '#1f2937' : '#e2e8f0' }}>{children}</li>,
                      h1: ({ children }) => <h1 className="text-lg font-bold mb-3 border-b border-slate-200 dark:border-slate-600 pb-1" style={{ color: theme === 'light' ? '#111827' : '#f1f5f9' }}>{children}</h1>,
                      h2: ({ children }) => <h2 className="text-base font-bold mb-2" style={{ color: theme === 'light' ? '#111827' : '#f1f5f9' }}>{children}</h2>,
                      h3: ({ children }) => <h3 className="text-sm font-bold mb-2" style={{ color: theme === 'light' ? '#1f2937' : '#e2e8f0' }}>{children}</h3>,
                      blockquote: ({ children }) => (
                        <blockquote 
                          className="border-l-4 border-indigo-300 dark:border-indigo-500 pl-4 italic my-3 bg-indigo-50/50 dark:bg-indigo-900/30 py-2 rounded-r-md"
                          style={{ color: theme === 'light' ? '#374151' : '#94a3b8' }}
                        >
                          {children}
                        </blockquote>
                      ),
                      a: ({ href, children }) => (
                        <a 
                          href={href} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 underline font-medium transition-colors"
                        >
                          {children}
                        </a>
                      ),
                      table: ({ children }) => (
                        <div className="overflow-x-auto my-3 rounded-lg border border-slate-200 dark:border-slate-600">
                          <table className="min-w-full text-xs">
                            {children}
                          </table>
                        </div>
                      ),
                      thead: ({ children }) => <thead className="bg-slate-50 dark:bg-slate-700">{children}</thead>,
                      th: ({ children }) => (
                        <th 
                          className="border-b border-slate-200 dark:border-slate-600 px-3 py-2 text-left font-semibold"
                          style={{ color: theme === 'light' ? '#111827' : '#f1f5f9' }}
                        >
                          {children}
                        </th>
                      ),
                      td: ({ children }) => (
                        <td 
                          className="border-b border-slate-100 dark:border-slate-700 px-3 py-2"
                          style={{ color: theme === 'light' ? '#1f2937' : '#e2e8f0' }}
                        >
                          {children}
                        </td>
                      ),
                    }}
                  >
                      {message.content}
                    </ReactMarkdown>
                  ) : (
                    <div className="text-sm" style={{ color: theme === 'light' ? '#ef4444' : '#f87171' }}>
                      [Invalid message content]
                    </div>
                  )}
                </div>
              )}
              {message.type === 'image' && (
                <div>
                  <img 
                    src={message.content} 
                    alt="Shared image" 
                    className="rounded-lg max-w-full h-auto mb-2 shadow-md"
                    loading="lazy"
                  />
                </div>
              )}
              {message.type === 'file' && (
                <div className="flex items-center space-x-3 bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
                  <div className="w-8 h-8 bg-slate-200 dark:bg-slate-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-sm">📎</span>
                  </div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{message.content}</span>
                </div>
              )}
            </div>

            {/* Bot message metadata */}
            <div className="flex items-center justify-between mt-2 text-xs" style={{ color: theme === 'light' ? '#6b7280' : '#94a3b8' }}>
              <span className="font-medium">AI Assistant • {formatTimestamp(message.timestamp)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}