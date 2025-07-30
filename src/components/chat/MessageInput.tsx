'use client';

import { KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Paperclip, Send, Webhook } from 'lucide-react';

import { FileUpload } from '@/components/ui/FileUpload';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import { useFirebase } from '@/contexts/FirebaseContext';
import { useTheme } from '@/contexts/ThemeContext';

interface FileData {
  name: string;
  size: number;
  type: string;
  data: string; // Base64 encoded
}

interface MessageInputProps {
  onSendMessage: (content: string, type?: 'text' | 'file' | 'image', fileData?: FileData) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export function MessageInput({ 
  onSendMessage, 
  disabled = false, 
  placeholder = "Type a message...",
  className,
  autoFocus = false
}: MessageInputProps) {
  const { theme } = useTheme();
  const { activeWebhook, checkWebhookHealth } = useFirebase();
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);


  // Handle autoFocus when prop changes
  useEffect(() => {
    if (autoFocus && !disabled && textareaRef.current) {
      const focusElement = () => {
        if (textareaRef.current) {
          try {
            // For mobile compatibility, we need to ensure focus happens
            // in a way that doesn't violate browser policies
            textareaRef.current.focus({ preventScroll: false });
            
            // Set cursor to end for better UX
            const length = textareaRef.current.value.length;
            textareaRef.current.setSelectionRange(length, length);
            
            // Scroll the element into view if needed (mobile consideration)
            textareaRef.current.scrollIntoView({ 
              block: 'nearest', 
              behavior: 'smooth' 
            });
          } catch (error) {
            // Fallback for browsers that don't support focus options
            textareaRef.current.focus();
          }
        }
      };
      
      // Longer delay for mobile devices to ensure proper rendering
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
      const delay = isMobile ? 300 : 100;
      
      const timeoutId = setTimeout(focusElement, delay);
      return () => clearTimeout(timeoutId);
    }
  }, [autoFocus, disabled]);

  // Check webhook health for status display
  useEffect(() => {
    if (activeWebhook?.id) {
      checkWebhookHealth(activeWebhook)
        .then(setIsOnline)
        .catch(() => setIsOnline(false));
    } else {
      setIsOnline(false);
    }
  }, [activeWebhook?.id, checkWebhookHealth]);

  const handleSubmit = useCallback(async () => {
    if (!message.trim() || disabled || isSubmitting) return;

    setIsSubmitting(true);
    try {
      onSendMessage(message.trim());
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [message, disabled, isSubmitting, onSendMessage]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  };

  const handleFileSelect = async (file: File) => {
    try {
      // Add file size check for processing
      // Since we're sending to cloud run for processing (not storing in Firestore),
      // we can be more generous with file sizes
      if (file.size > 10 * 1024 * 1024) { // 10MB limit for cloud processing
        console.error('File too large for processing:', file.size);
        onSendMessage(`📎 ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB) - File too large for processing (max 10MB)`, file.type.startsWith('image/') ? 'image' : 'file');
        setShowFileUpload(false);
        return;
      }

      
      // Convert file to base64
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
          const base64 = result.split(',')[1] || result;
          resolve(base64);
        };
        reader.onerror = (error) => {
          console.error('FileReader error:', error);
          reject(error);
        };
        reader.readAsDataURL(file);
      });

      const fileType = file.type.startsWith('image/') ? 'image' : 'file';
      
      // Create file data object
      const fileData = {
        name: file.name,
        size: file.size,
        type: file.type,
        data: base64Data
      };

      
      // Send message with file data
      onSendMessage(`📎 ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`, fileType, fileData);
      setShowFileUpload(false);
    } catch (error) {
      console.error('Error processing file:', error);
      // Fallback to text description if file processing fails
      const fileType = file.type.startsWith('image/') ? 'image' : 'file';
      onSendMessage(`📎 ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB) - Error processing file`, fileType);
      setShowFileUpload(false);
    }
  };

  return (
    <div className={cn(
      'p-3 md:p-4 lg:p-6 chat-input-area',
      // Mobile safe area and keyboard handling
      'pb-[max(env(safe-area-inset-bottom),1rem)]',
      className
    )}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-end space-x-3">
          {/* File upload button */}
          <button
            onClick={() => setShowFileUpload(true)}
            disabled={disabled || isSubmitting}
            className={cn(
              'flex-shrink-0 w-11 h-11 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/60 dark:border-slate-600/60 hover:bg-white dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-500 transition-all duration-200 touch-manipulation shadow-sm hover:shadow-md',
              'flex items-center justify-center group',
              (disabled || isSubmitting) && 'opacity-50 cursor-not-allowed'
            )}
            aria-label="Attach file"
          >
            <Paperclip className="w-5 h-5 text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors" />
          </button>

          {/* Message input container */}
          <div className="flex-1 relative">
            <div className="relative rounded-2xl chat-input backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-200 focus-within:ring-2 focus-within:ring-blue-500 dark:focus-within:ring-indigo-500 focus-within:ring-opacity-20 focus-within:border-blue-300 dark:focus-within:border-indigo-400">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={disabled || isSubmitting}
                autoFocus={autoFocus && !disabled}
                className={cn(
                  'w-full min-h-[48px] sm:min-h-[52px] max-h-[120px] px-4 py-3 pr-14 sm:pr-16 rounded-2xl bg-transparent text-sm resize-none focus:outline-none leading-relaxed touch-manipulation',
                  (disabled || isSubmitting) && 'opacity-50 cursor-not-allowed'
                )}
                style={{ 
                  color: theme === 'light' ? '#111827' : '#f1f5f9',
                  '--placeholder-color': theme === 'light' ? '#6b7280' : '#94a3b8'
                } as React.CSSProperties & { '--placeholder-color': string }}
                rows={1}
              />
              
              {/* Send button */}
              <button
                onClick={handleSubmit}
                disabled={!message.trim() || disabled || isSubmitting}
                className={cn(
                  'absolute right-2 bottom-2 w-8 h-8 sm:w-9 sm:h-9 rounded-xl transition-all duration-200 touch-manipulation flex items-center justify-center group',
                  message.trim() && !disabled && !isSubmitting
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 dark:from-indigo-500 dark:to-purple-600 text-white hover:from-blue-600 hover:to-blue-700 dark:hover:from-indigo-600 dark:hover:to-purple-700 shadow-lg shadow-blue-500/25 dark:shadow-indigo-500/25 hover:shadow-xl hover:shadow-blue-500/30 dark:hover:shadow-indigo-500/30 hover:scale-105 active:scale-95'
                    : 'bg-slate-200 dark:bg-slate-600 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                )}
                aria-label="Send message"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                )}
              </button>
            </div>
          </div>
        </div>
        
        {/* Helper text and webhook status - modernized, responsive layout */}
        <div id="fix-me" className="mt-3 flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0 chat-footer px-3 py-2 rounded-lg">
          {/* Webhook status - centered on mobile, left on desktop */}
          {activeWebhook && (
            <div className="flex items-center justify-center md:justify-start space-x-2 px-3 py-1 rounded-full bg-slate-100/80 dark:bg-slate-700/80 backdrop-blur-sm">
              <Webhook className="w-3 h-3 flex-shrink-0" style={{ color: theme === 'light' ? '#6b7280' : '#94a3b8' }} />
              <span className="text-xs text-slate-600 dark:text-slate-400 font-medium truncate max-w-32">
                {activeWebhook.name}
              </span>
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
                    <span>Connected</span>
                  </>
                ) : isOnline === false ? (
                  <>
                    <div className="w-1.5 h-1.5 bg-red-500 dark:bg-red-400 rounded-full"></div>
                    <span>Offline</span>
                  </>
                ) : (
                  <>
                    <div className="w-1.5 h-1.5 bg-blue-500 dark:bg-blue-400 rounded-full animate-spin"></div>
                    <span>Checking</span>
                  </>
                )}
              </div>
            </div>
          )}
          
          {/* Keyboard shortcuts - Hidden on mobile, shown on desktop */}
          <div className="hidden md:block px-3 py-1 rounded-full bg-slate-100/80 dark:bg-slate-700/80 backdrop-blur-sm">
            <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              Press <kbd className="px-1.5 py-0.5 text-xs font-mono bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300">Enter</kbd> to send, 
              <kbd className="px-1.5 py-0.5 text-xs font-mono bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 ml-1">Shift+Enter</kbd> for new line
            </span>
          </div>
        </div>
      </div>

      {/* File Upload Modal */}
      <Modal
        isOpen={showFileUpload}
        onClose={() => setShowFileUpload(false)}
        title="Upload File"
        className="max-w-lg"
      >
        <FileUpload
          onFileSelect={handleFileSelect}
          accept="image/*,.pdf,.doc,.docx,.txt,.csv,.json,.xml"
          maxSize={10 * 1024 * 1024} // 10MB (for cloud processing, not Firestore storage)
        />
      </Modal>
    </div>
  );
}