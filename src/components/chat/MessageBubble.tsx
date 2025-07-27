'use client';

import { Message } from '@/types/chat';
import { formatTimestamp, cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { useFirebase } from '@/contexts/FirebaseContext';
import { Check, CheckCheck, X, Clock, User, Trash2, Loader2, Copy } from 'lucide-react';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

interface MessageBubbleProps {
  message: Message;
  isUser?: boolean;
  fileDataCache?: Record<string, string>;
}

export function MessageBubble({ message, isUser, fileDataCache = {} }: MessageBubbleProps) {
  const { theme } = useTheme();
  const { user, deleteMessage, deleteBotReply } = useFirebase();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  // Determine if this is a user message (default to true if not explicitly set)
  const actualIsUser = isUser !== undefined ? isUser : !message.isBot;

  // Function to preprocess LaTeX expressions
  const preprocessLatex = (content: string): string => {
    let processedContent = content;

    // Replace common LaTeX expressions with wrapped versions
    const replacements: Array<{ pattern: RegExp; replacement: string | ((match: string, ...args: any[]) => string) }> = [
      // Fractions
      { pattern: /\\frac\{([^}]*)\}\{([^}]*)\}/g, replacement: '$\\frac{$1}{$2}$' },
      
      // Boxed expressions and text formatting (handle nested commands first)
      // First, handle \boxed{content with \text{} inside} by processing the inner \text{} commands
      { 
        pattern: /\\boxed\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g, 
        replacement: (match, content) => {
          // Process any \text{} commands inside the boxed content, trimming each replacement
          const processedContent = content.replace(/\\text\{([^}]*)\}/g, (_match: string, textContent: string) => textContent.trim());
          return `**${processedContent}**`;
        }
      },
      // Handle standalone \text{} commands (that weren't inside \boxed{})
      { pattern: /\\text\{([^}]*)\}/g, replacement: '$1' },
      
      // Common symbols
      { pattern: /\\times/g, replacement: '$\\times$' },
      { pattern: /\\div/g, replacement: '$\\div$' },
      { pattern: /\\approx/g, replacement: '$\\approx$' },
      { pattern: /\\cdot/g, replacement: '$\\cdot$' },
      { pattern: /\\ldots/g, replacement: '$\\ldots$' },
      { pattern: /\\pm/g, replacement: '$\\pm$' },
      { pattern: /\\mp/g, replacement: '$\\mp$' },
      
      // Comparison operators
      { pattern: /\\leq/g, replacement: '$\\leq$' },
      { pattern: /\\geq/g, replacement: '$\\geq$' },
      { pattern: /\\neq/g, replacement: '$\\neq$' },
      { pattern: /\\equiv/g, replacement: '$\\equiv$' },
      
      // Special symbols
      { pattern: /\\infty/g, replacement: '$\\infty$' },
      { pattern: /\\pi/g, replacement: '$\\pi$' },
      
      // Greek letters
      { pattern: /\\alpha/g, replacement: '$\\alpha$' },
      { pattern: /\\beta/g, replacement: '$\\beta$' },
      { pattern: /\\gamma/g, replacement: '$\\gamma$' },
      { pattern: /\\delta/g, replacement: '$\\delta$' },
      { pattern: /\\epsilon/g, replacement: '$\\epsilon$' },
      { pattern: /\\theta/g, replacement: '$\\theta$' },
      { pattern: /\\lambda/g, replacement: '$\\lambda$' },
      { pattern: /\\mu/g, replacement: '$\\mu$' },
      { pattern: /\\sigma/g, replacement: '$\\sigma$' },
      
      // Functions
      { pattern: /\\sqrt\{([^}]*)\}/g, replacement: '$\\sqrt{$1}$' },
      { pattern: /\\sum/g, replacement: '$\\sum$' },
      { pattern: /\\int/g, replacement: '$\\int$' }
    ];

    // Apply all replacements
    replacements.forEach(({ pattern, replacement }) => {
      if (typeof replacement === 'function') {
        processedContent = processedContent.replace(pattern, replacement);
      } else {
        processedContent = processedContent.replace(pattern, replacement);
      }
    });

    // Clean up any double dollar signs
    processedContent = processedContent.replace(/\$\$+/g, '$');

    return processedContent;
  };

  // Helper function to get Base64 data from cache or message
  const getFileData = (message: Message) => {
    if (!message.fileData) return null;
    
    // Check if we have Base64 data in cache (for newly uploaded files)
    const cachedData = fileDataCache[message.id];
    if (cachedData) {
      return {
        ...message.fileData,
        data: cachedData
      };
    }
    
    // Fallback to message.fileData.data (if it exists)
    return message.fileData.data ? message.fileData : null;
  };

  const fileData = getFileData(message);

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

  const handleDelete = async () => {
    if (isDeleting) return;
    
    setIsDeleting(true);
    setShowDeleteConfirm(false);
    
    try {
      await deleteMessage(message.id);
      
      // If this is a user message, also delete the bot reply
      if (actualIsUser) {
        await deleteBotReply(message.id);
      }
    } catch (error) {
      console.error('Failed to delete message:', error);
      // Could add toast notification here
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(false);
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      // Extract plain text content, stripping any markdown formatting
      const textContent = message.content.replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
                                         .replace(/\*(.*?)\*/g, '$1')     // Remove italic
                                         .replace(/`(.*?)`/g, '$1')       // Remove inline code
                                         .replace(/```[\s\S]*?```/g, (match) => {
                                           // Keep code blocks but remove the backticks
                                           return match.replace(/```[^\n]*\n?/g, '').replace(/```/g, '');
                                         })
                                         .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to text
                                         .replace(/^#+\s+/gm, '')         // Remove headers
                                         .replace(/^>\s+/gm, '')          // Remove blockquotes
                                         .trim();

      // Try modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(textContent);
      } else {
        // Fallback for older browsers or non-secure contexts
        const textArea = document.createElement('textarea');
        textArea.value = textContent;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      
      // Show success feedback
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      
    } catch (error) {
      console.error('Failed to copy message:', error);
      // Could add toast notification here for error feedback
    }
  };

  return (
    <div className={cn(
      "w-full mb-6 group animate-message-in transition-opacity duration-300",
      isDeleting && "opacity-50 pointer-events-none"
    )}>
      {/* User messages - right aligned */}
      {actualIsUser && (
        <div className="flex justify-end items-start space-x-3">
          {/* Delete button for user messages */}
          <div className="flex items-center space-x-2 opacity-70 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
            {showDeleteConfirm ? (
              <div className="flex flex-col items-center bg-white dark:bg-slate-800 rounded-lg px-2 py-1 shadow-lg border border-slate-200 dark:border-slate-600">
                <span className="text-xs text-slate-600 dark:text-slate-300 mb-1">Delete?</span>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="text-red-600 hover:text-red-700 disabled:opacity-50 p-1"
                    title="Confirm delete"
                  >
                    {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                  </button>
                  <button
                    onClick={handleCancelDelete}
                    className="text-slate-500 hover:text-slate-600 p-1"
                    title="Cancel"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={handleDeleteClick}
                disabled={isDeleting}
                className="text-slate-400 hover:text-red-500 transition-colors duration-200 disabled:opacity-50 p-1 rounded"
                title="Delete message"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          
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
                  {fileData && fileData.data && (
                    <div className="flex items-start space-x-3 mb-2">
                      <img 
                        src={`data:${fileData.type};base64,${fileData.data}`}
                        alt={fileData.name}
                        className="w-12 h-12 rounded-lg object-cover flex-shrink-0 shadow-md border border-white/20"
                        loading="lazy"
                      />
                      <div className="flex-1">
                        <p className="text-sm leading-relaxed">
                          {message.content && typeof message.content === 'string' ? message.content : '[Invalid content]'}
                        </p>
                        <p className="text-xs opacity-75 mt-1">Image sent for processing</p>
                      </div>
                    </div>
                  )}
                  {(!fileData || !fileData.data) && (
                    <div className="flex items-start space-x-3 bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                      <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-sm">🖼️</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm leading-relaxed">
                          {message.content && typeof message.content === 'string' ? message.content : '[Invalid content]'}
                        </p>
                        <p className="text-xs opacity-75 mt-1">Image sent for processing</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {message.type === 'file' && (
                <div className="flex items-start space-x-3 bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                  {fileData && fileData.type.startsWith('image/') && fileData.data ? (
                    <img 
                      src={`data:${fileData.type};base64,${fileData.data}`}
                      alt={fileData.name}
                      className="w-8 h-8 rounded-lg object-cover flex-shrink-0 shadow-md border border-white/20"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-sm">📎</span>
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium">{message.content}</p>
                    <p className="text-xs opacity-75 mt-1">File sent for processing</p>
                  </div>
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
          <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center flex-shrink-0 shadow-lg ring-2 ring-white ring-opacity-20 overflow-hidden">
            <img
              src="/robot-01-sm.png"
              alt="AI Assistant"
              className="w-8 h-8 object-contain"
            />
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
                      remarkPlugins={[remarkGfm, remarkMath]}
                      rehypePlugins={[rehypeKatex]}
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
                      {preprocessLatex(message.content)}
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
                  {fileData && fileData.data && (
                    <div className="flex items-start space-x-3 mb-2">
                      <img 
                        src={`data:${fileData.type};base64,${fileData.data}`}
                        alt={fileData.name}
                        className="w-12 h-12 rounded-lg object-cover flex-shrink-0 shadow-md border border-slate-200 dark:border-slate-600"
                        loading="lazy"
                      />
                      <div className="text-sm markdown-content flex-1" style={{ color: theme === 'light' ? '#1f2937' : '#e2e8f0' }}>
                        {message.content && typeof message.content === 'string' ? message.content : '[Invalid content]'}
                        <p className="text-xs opacity-75 mt-1" style={{ color: theme === 'light' ? '#6b7280' : '#94a3b8' }}>Image processed</p>
                      </div>
                    </div>
                  )}
                  {(!fileData || !fileData.data) && (
                    <div className="flex items-start space-x-3 bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
                      <div className="w-8 h-8 bg-slate-200 dark:bg-slate-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-sm">🖼️</span>
                      </div>
                      <div className="flex-1">
                        <div className="text-sm markdown-content" style={{ color: theme === 'light' ? '#1f2937' : '#e2e8f0' }}>
                          {message.content && typeof message.content === 'string' ? message.content : '[Invalid content]'}
                        </div>
                        <p className="text-xs opacity-75 mt-1" style={{ color: theme === 'light' ? '#6b7280' : '#94a3b8' }}>Image processed</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {message.type === 'file' && (
                <div className="flex items-start space-x-3 bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
                  {fileData && fileData.type.startsWith('image/') && fileData.data ? (
                    <img 
                      src={`data:${fileData.type};base64,${fileData.data}`}
                      alt={fileData.name}
                      className="w-8 h-8 rounded-lg object-cover flex-shrink-0 shadow-md border border-slate-200 dark:border-slate-600"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-slate-200 dark:bg-slate-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-sm">📎</span>
                    </div>
                  )}
                  <div className="flex-1">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{message.content}</span>
                    <p className="text-xs opacity-75 mt-1" style={{ color: theme === 'light' ? '#6b7280' : '#94a3b8' }}>File processed</p>
                  </div>
                </div>
              )}
            </div>

            {/* Bot message metadata */}
            <div className="flex items-center justify-between mt-2 text-xs" style={{ color: theme === 'light' ? '#6b7280' : '#94a3b8' }}>
              <span className="font-medium">AI Assistant • {formatTimestamp(message.timestamp)}</span>
            </div>
          </div>
          
          {/* Action buttons for bot messages - positioned vertically to save horizontal space */}
          <div className="flex flex-col items-center space-y-1 opacity-70 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
            {showDeleteConfirm ? (
              <div className="flex flex-col items-center bg-white dark:bg-slate-800 rounded-lg px-2 py-1 shadow-lg border border-slate-200 dark:border-slate-600">
                <span className="text-xs text-slate-600 dark:text-slate-300 mb-1">Delete?</span>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="text-red-600 hover:text-red-700 disabled:opacity-50 p-1"
                    title="Confirm delete"
                  >
                    {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                  </button>
                  <button
                    onClick={handleCancelDelete}
                    className="text-slate-500 hover:text-slate-600 p-1"
                    title="Cancel"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Copy button */}
                <button
                  onClick={handleCopy}
                  className="text-slate-400 hover:text-blue-500 transition-colors duration-200 p-1 rounded"
                  title="Copy message"
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
                
                {/* Delete button */}
                <button
                  onClick={handleDeleteClick}
                  disabled={isDeleting}
                  className="text-slate-400 hover:text-red-500 transition-colors duration-200 disabled:opacity-50 p-1 rounded"
                  title="Delete message"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}