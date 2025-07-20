'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import { Send, Paperclip, Loader2 } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';
import { FileUpload } from '@/components/ui/FileUpload';

interface MessageInputProps {
  onSendMessage: (content: string, type?: 'text' | 'file' | 'image') => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function MessageInput({ 
  onSendMessage, 
  disabled = false, 
  placeholder = "Type a message...",
  className 
}: MessageInputProps) {
  const { theme } = useTheme();
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async () => {
    if (!message.trim() || disabled || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSendMessage(message.trim());
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  };

  const handleFileSelect = (file: File) => {
    // For demo purposes, we'll just send the filename
    // In a real app, you'd upload the file to a storage service and get a URL
    const fileType = file.type.startsWith('image/') ? 'image' : 'file';
    onSendMessage(`📎 ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`, fileType);
    setShowFileUpload(false);
  };

  return (
    <div className={cn(
      'p-4 sm:p-6',
      // Mobile keyboard handling
      'pb-[env(safe-area-inset-bottom)]',
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
                onKeyPress={handleKeyPress}
                placeholder={placeholder}
                disabled={disabled || isSubmitting}
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
        
        {/* Helper text - modernized */}
        <div className="mt-3 flex items-center justify-center">
          <div className="px-3 py-1 rounded-full bg-slate-100/80 dark:bg-slate-700/80 backdrop-blur-sm">
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
          maxSize={25 * 1024 * 1024} // 25MB
        />
      </Modal>
    </div>
  );
}