'use client';

import { ArrowRight } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

interface PromptSuggestionCardProps {
  title: string;
  onClick: () => void;
  highlighted?: boolean; // For teal "Envato" card
  className?: string;
}

export function PromptSuggestionCard({ 
  title, 
  onClick, 
  highlighted = false, 
  className 
}: PromptSuggestionCardProps) {
  const { theme } = useTheme();

  return (
    <button
      onClick={onClick}
      className={cn(
        'p-4 rounded-lg border text-left transition-all duration-200 group',
        'hover:shadow-md active:scale-95 touch-manipulation',
        'flex items-center justify-between min-h-[80px] w-full',
        highlighted
          ? 'bg-cyan-600 text-white border-cyan-600 hover:bg-cyan-700 hover:border-cyan-700'
          : theme === 'light'
          ? 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700'
          : 'bg-slate-800 border-slate-700 hover:bg-slate-700 hover:border-slate-600 text-slate-200',
        className
      )}
    >
      <span className={cn(
        'text-sm leading-relaxed flex-1 pr-3',
        highlighted 
          ? 'text-white' 
          : theme === 'light' 
          ? 'text-slate-700' 
          : 'text-slate-200'
      )}>
        {title}
      </span>
      
      <ArrowRight 
        className={cn(
          'w-4 h-4 transition-transform group-hover:translate-x-0.5 flex-shrink-0',
          highlighted 
            ? 'text-white' 
            : theme === 'light' 
            ? 'text-slate-400 group-hover:text-slate-600' 
            : 'text-slate-400 group-hover:text-slate-300'
        )} 
      />
    </button>
  );
}