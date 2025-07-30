'use client';

import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { PromptSuggestionCard } from './PromptSuggestionCard';
import Image from 'next/image';

interface WelcomeScreenProps {
  onSuggestionClick: (prompt: string) => void;
  className?: string;
}

const DEFAULT_SUGGESTIONS = [
  { title: "I would like to know about figma design", highlighted: false },
  { title: "I need to buy a new design system", highlighted: false },
  { title: "Can I buy designs from Envato?", highlighted: true }, // Teal highlight
  { title: "Take a look at these new design systems", highlighted: false },
  { title: "I would like to purchase design system", highlighted: false },
  { title: "I would like to purchase a UI", highlighted: false }
];

export function WelcomeScreen({ onSuggestionClick, className }: WelcomeScreenProps) {
  const { theme } = useTheme();

  const handleSuggestionClick = (suggestion: string) => {
    onSuggestionClick(suggestion);
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
          Let&apos;s get started with your title here
        </h1>
        <p className={cn(
          'text-sm md:text-base lg:text-lg max-w-2xl mx-auto leading-relaxed',
          theme === 'light' ? 'text-slate-600' : 'text-slate-400'
        )}>
          I&apos;m an AI powered booking expert and I have a few questions for you
        </p>
      </div>

      {/* Suggestion Cards Grid */}
      <div className="w-full max-w-3xl mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {DEFAULT_SUGGESTIONS.map((suggestion, index) => (
            <PromptSuggestionCard
              key={index}
              title={suggestion.title}
              highlighted={suggestion.highlighted}
              onClick={() => handleSuggestionClick(suggestion.title)}
              className="w-full"
            />
          ))}
        </div>
      </div>

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