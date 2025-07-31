'use client';

import Image from 'next/image';
import { PromptSuggestionCard } from './PromptSuggestionCard';
import { cn } from '@/lib/utils';
import { useFirebase } from '@/contexts/FirebaseContext';
import { useFirestorePrompts } from '@/lib/hooks/useFirestorePrompts';
import { useTheme } from '@/contexts/ThemeContext';

interface WelcomeScreenProps {
  onSuggestionClick: (prompt: string) => void;
  className?: string;
}

// Loading skeleton component for suggestion cards
const SuggestionSkeleton = ({ theme }: { theme: 'light' | 'dark' }) => (
  <div className={cn(
    'p-4 rounded-lg border min-h-[80px] w-full animate-pulse',
    theme === 'light' 
      ? 'bg-slate-100 border-slate-200' 
      : 'bg-slate-800 border-slate-700'
  )}>
    <div className={cn(
      'h-4 rounded w-3/4',
      theme === 'light' ? 'bg-slate-300' : 'bg-slate-600'
    )} />
  </div>
);

export function WelcomeScreen({ onSuggestionClick, className }: WelcomeScreenProps) {
  const { theme } = useTheme();
  const { activeWebhook } = useFirebase();
  const { promptConfig, loading, error, isUsingFallback, retry } = useFirestorePrompts(activeWebhook?.name);

  const handleSuggestionClick = (suggestion: string) => {
    onSuggestionClick(suggestion);
  };

  // Render loading state for suggestions grid
  const renderSuggestionsGrid = () => {
    if (loading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <SuggestionSkeleton key={index} theme={theme} />
          ))}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {promptConfig.suggestions.map((suggestion, index) => (
          <PromptSuggestionCard
            key={index}
            title={suggestion.title}
            highlighted={suggestion.highlighted}
            onClick={() => handleSuggestionClick(suggestion.title)}
            className="w-full"
          />
        ))}
      </div>
    );
  };

  return (
    <div className={cn(
      'flex flex-col items-center justify-center min-h-full p-6 md:p-8',
      'max-w-4xl mx-auto w-full',
      className
    )}>
      {/* Owl Mascot */}
      <div className="mb-8 flex justify-center">
        <div className="relative">
          <Image
            src="/owl.gif"
            alt="AI Assistant Owl"
            width={120}
            height={120}
            className="w-24 h-24 md:w-32 md:h-32 object-contain"
            priority
          />
        </div>
      </div>

      {/* Welcome Text */}
      <div className="text-center mb-8 md:mb-12">
        <h1 className={cn(
          'text-xl md:text-2xl lg:text-3xl font-bold mb-3 md:mb-4',
          theme === 'light' ? 'text-slate-800' : 'text-slate-100'
        )}>
          Let&apos;s get started with {activeWebhook?.name || 'your assistant'}
        </h1>
        <p className={cn(
          'text-sm md:text-base lg:text-lg max-w-2xl mx-auto leading-relaxed',
          theme === 'light' ? 'text-slate-600' : 'text-slate-400'
        )}>
          {promptConfig.title}
        </p>
      </div>

      {/* Suggestion Cards Grid */}
      <div className="w-full max-w-3xl mb-8">
        {renderSuggestionsGrid()}
      </div>

      {/* Error State */}
      {error && !loading && (
        <div className="w-full max-w-md mb-4 p-4 rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-800 dark:text-red-200">
                Failed to load suggestions
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                Using default suggestions as fallback
              </p>
            </div>
            <button
              onClick={retry}
              className="ml-4 px-3 py-1 text-xs font-medium text-red-800 dark:text-red-200 border border-red-300 dark:border-red-600 rounded hover:bg-red-100 dark:hover:bg-red-800/30 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Fallback Indicator */}
      {isUsingFallback && !error && !loading && (
        <div className="w-full max-w-md mb-4 p-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20">
          <p className="text-xs text-amber-800 dark:text-amber-200 text-center">
            Using default suggestions for {activeWebhook?.name || 'this webhook'}
          </p>
        </div>
      )}

      {/* Bottom Helper Text */}
      <div className="text-center max-w-md">
        <p className={cn(
          'text-xs md:text-sm',
          theme === 'light' ? 'text-slate-500' : 'text-slate-500'
        )}>
          Click on any suggestion above to get started, or type your own message below
        </p>
      </div>
    </div>
  );
}