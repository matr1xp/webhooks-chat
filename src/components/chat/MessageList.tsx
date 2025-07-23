'use client';

import { useEffect, useRef } from 'react';
import { Message } from '@/types/chat';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import { cn } from '@/lib/utils';

interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
  className?: string;
  fileDataCache?: Record<string, string>;
}

export function MessageList({ messages, isLoading = false, className, fileDataCache = {} }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  return (
    <div className={cn(
      'w-full p-4 space-y-4 scrollbar-thin',
      className
    )}>
      {messages.length === 0 ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center text-muted-foreground">
            <div className="mb-4 text-4xl">💬</div>
            <h3 className="text-lg font-medium mb-2">Start a conversation</h3>
            <p className="text-sm">
              Send a message to begin your chat session.
            </p>
          </div>
        </div>
      ) : (
        <>
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isUser={!message.isBot} // Bot messages have isBot=true, user messages don't
              fileDataCache={fileDataCache}
            />
          ))}
          <TypingIndicator isVisible={isLoading} />
          {/* Extra padding at bottom to ensure last message is visible above input */}
          <div className="h-4"></div>
        </>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}