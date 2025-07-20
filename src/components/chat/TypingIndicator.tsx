'use client';

import { cn } from '@/lib/utils';

interface TypingIndicatorProps {
  isVisible: boolean;
  className?: string;
}

export function TypingIndicator({ isVisible, className }: TypingIndicatorProps) {
  if (!isVisible) return null;

  return (
    <div className={cn('flex justify-start mb-4', className)}>
      <div className="bg-secondary text-secondary-foreground rounded-lg px-4 py-2 shadow-sm">
        <div className="flex items-center space-x-1">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
          </div>
          <span className="text-xs text-muted-foreground ml-2">Typing...</span>
        </div>
      </div>
    </div>
  );
}