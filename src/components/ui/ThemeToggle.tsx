'use client';

import { useTheme } from '@/contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  return (
    <div className={cn(
      "flex items-center bg-white/20 backdrop-blur-sm rounded-full p-1 shadow-lg border border-white/20",
      "dark:bg-slate-700/40 dark:border-slate-600/40",
      "transition-all duration-300",
      className
    )}>
      {/* Light Mode Button */}
      <button
        onClick={() => setTheme('light')}
        className={cn(
          "flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300 group",
          theme === 'light'
            ? "bg-white shadow-md text-amber-600 scale-110"
            : "text-gray-600 hover:text-amber-600 hover:bg-white/50 dark:text-slate-400 dark:hover:text-amber-400"
        )}
        title="Light mode"
      >
        <Sun className={cn(
          "w-4 h-4 transition-all duration-300",
          theme === 'light' ? "animate-pulse" : "group-hover:scale-110"
        )} />
      </button>

      {/* Dark Mode Button */}
      <button
        onClick={() => setTheme('dark')}
        className={cn(
          "flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300 group",
          theme === 'dark'
            ? "bg-slate-800 shadow-md text-blue-400 scale-110"
            : "text-gray-600 hover:text-blue-500 hover:bg-slate-800/20 dark:text-slate-400 dark:hover:text-blue-400"
        )}
        title="Dark mode"
      >
        <Moon className={cn(
          "w-4 h-4 transition-all duration-300",
          theme === 'dark' ? "animate-pulse" : "group-hover:scale-110"
        )} />
      </button>
    </div>
  );
}