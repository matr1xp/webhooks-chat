'use client';

import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';

interface TypingIndicatorProps {
  isVisible: boolean;
  className?: string;
}

export function TypingIndicator({ isVisible, className }: TypingIndicatorProps) {
  const { theme } = useTheme();
  
  if (!isVisible) return null;

  return (
    <div className={cn('flex justify-start items-start space-x-3 mb-4', className)}>
      {/* Bot avatar */}
      <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center flex-shrink-0 shadow-lg ring-2 ring-white ring-opacity-20 overflow-hidden">
        <img
          src="/robot-01-sm.png"
          alt="AI Assistant"
          className="w-8 h-8 object-contain"
        />
      </div>
      
      {/* Typing bubble with modern glassmorphism design */}
      <div className={cn(
        'relative px-4 py-3 rounded-2xl rounded-tl-md max-w-xs',
        'shadow-lg transform transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5',
        'backdrop-blur-sm border border-opacity-20',
        theme === 'light' 
          ? 'bg-white/90 border-slate-200 shadow-slate-200/50' 
          : 'bg-slate-800/90 border-slate-600 shadow-slate-900/50'
      )}>
        <div className="flex items-center space-x-2">
          {/* Animated dots */}
          <div className="flex space-x-1.5">
            <div 
              className={cn(
                "w-2 h-2 rounded-full animate-bounce",
                theme === 'light' ? 'bg-indigo-400' : 'bg-indigo-300'
              )}
              style={{ animationDelay: '-0.32s', animationDuration: '1.4s' }}
            />
            <div 
              className={cn(
                "w-2 h-2 rounded-full animate-bounce",
                theme === 'light' ? 'bg-indigo-500' : 'bg-indigo-400'
              )}
              style={{ animationDelay: '-0.16s', animationDuration: '1.4s' }}
            />
            <div 
              className={cn(
                "w-2 h-2 rounded-full animate-bounce",
                theme === 'light' ? 'bg-indigo-600' : 'bg-indigo-500'
              )}
              style={{ animationDuration: '1.4s' }}
            />
          </div>
          
          {/* Typing text with fade animation */}
          <span 
            className={cn(
              "text-sm font-medium animate-pulse",
              theme === 'light' ? 'text-slate-600' : 'text-slate-300'
            )}
          >
            Thinking...
          </span>
        </div>
        
        {/* Modern speech bubble tail */}
        <div 
          className={cn(
            "absolute left-0 top-4 w-0 h-0 border-r-8 border-b-8 border-t-8",
            "border-r-transparent border-t-transparent transform -translate-x-2",
            theme === 'light' 
              ? 'border-b-white/90' 
              : 'border-b-slate-800/90'
          )}
        />
      </div>
    </div>
  );
}