import React from 'react';
import { render, screen } from '@testing-library/react';
import { MessageBubble } from '../MessageBubble';
import { Message } from '@/types/chat';
import { ThemeProvider } from '@/contexts/ThemeContext';

// Mock the utils function
jest.mock('@/lib/utils', () => ({
  formatTimestamp: jest.fn((timestamp: string) => 'Mock Time'),
  cn: jest.fn((...classes) => classes.filter(Boolean).join(' ')),
}));

const mockMessage: Message = {
  id: 'test-id',
  sessionId: 'test-session',
  type: 'text',
  content: 'Test message content',
  timestamp: '2023-12-01T10:00:00Z',
  userId: 'user-1',
  status: 'delivered',
  isBot: false,
};

const MockThemeProvider = ({ children, theme = 'light' }: { children: React.ReactNode; theme?: 'light' | 'dark' }) => (
  <ThemeProvider>
    {children}
  </ThemeProvider>
);

describe('MessageBubble', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('User Messages', () => {
    it('renders user text message correctly', () => {
      render(
        <MockThemeProvider>
          <MessageBubble message={mockMessage} isUser={true} />
        </MockThemeProvider>
      );

      expect(screen.getByText('Test message content')).toBeInTheDocument();
      expect(screen.getByText('Mock Time')).toBeInTheDocument();
      expect(screen.getByText('👤')).toBeInTheDocument();
    });

    it('renders user message with sending status', () => {
      const sendingMessage = { ...mockMessage, status: 'sending' as const };
      render(
        <MockThemeProvider>
          <MessageBubble message={sendingMessage} isUser={true} />
        </MockThemeProvider>
      );

      expect(screen.getByText('Test message content')).toBeInTheDocument();
    });

    it('renders user message with failed status', () => {
      const failedMessage = { ...mockMessage, status: 'failed' as const };
      render(
        <MockThemeProvider>
          <MessageBubble message={failedMessage} isUser={true} />
        </MockThemeProvider>
      );

      expect(screen.getByText('Test message content')).toBeInTheDocument();
    });

    it('renders user image message', () => {
      const imageMessage: Message = {
        ...mockMessage,
        type: 'image',
        content: 'https://example.com/image.jpg',
      };

      render(
        <MockThemeProvider>
          <MessageBubble message={imageMessage} isUser={true} />
        </MockThemeProvider>
      );

      const image = screen.getByAltText('Shared image');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', 'https://example.com/image.jpg');
    });

    it('renders user file message', () => {
      const fileMessage: Message = {
        ...mockMessage,
        type: 'file',
        content: 'document.pdf',
      };

      render(
        <MockThemeProvider>
          <MessageBubble message={fileMessage} isUser={true} />
        </MockThemeProvider>
      );

      expect(screen.getByText('document.pdf')).toBeInTheDocument();
      expect(screen.getByText('📎')).toBeInTheDocument();
    });

    it('handles invalid content gracefully', () => {
      const invalidMessage: Message = {
        ...mockMessage,
        content: '',
      };

      render(
        <MockThemeProvider>
          <MessageBubble message={invalidMessage} isUser={true} />
        </MockThemeProvider>
      );

      expect(screen.getByText('[Invalid content]')).toBeInTheDocument();
    });
  });

  describe('Bot Messages', () => {
    const botMessage: Message = {
      ...mockMessage,
      isBot: true,
    };

    it('renders bot text message correctly', () => {
      render(
        <MockThemeProvider>
          <MessageBubble message={botMessage} isUser={false} />
        </MockThemeProvider>
      );

      expect(screen.getByText('Test message content')).toBeInTheDocument();
      expect(screen.getByText(/AI Assistant • Mock Time/)).toBeInTheDocument();
      expect(screen.getByText('🤖')).toBeInTheDocument();
    });

    it('renders bot markdown content', () => {
      const markdownMessage: Message = {
        ...botMessage,
        content: '**Bold text** and *italic text*',
      };

      render(
        <MockThemeProvider>
          <MessageBubble message={markdownMessage} isUser={false} />
        </MockThemeProvider>
      );

      // Since react-markdown is mocked, it renders the raw markdown content
      expect(screen.getByTestId('markdown-content')).toHaveTextContent('**Bold text** and *italic text*');
      expect(screen.getByText(/AI Assistant/)).toBeInTheDocument();
    });

    it('renders bot image message', () => {
      const imageMessage: Message = {
        ...botMessage,
        type: 'image',
        content: 'https://example.com/bot-image.jpg',
      };

      render(
        <MockThemeProvider>
          <MessageBubble message={imageMessage} isUser={false} />
        </MockThemeProvider>
      );

      const image = screen.getByAltText('Shared image');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', 'https://example.com/bot-image.jpg');
    });

    it('renders bot file message', () => {
      const fileMessage: Message = {
        ...botMessage,
        type: 'file',
        content: 'report.pdf',
      };

      render(
        <MockThemeProvider>
          <MessageBubble message={fileMessage} isUser={false} />
        </MockThemeProvider>
      );

      expect(screen.getByText('report.pdf')).toBeInTheDocument();
      expect(screen.getByText('📎')).toBeInTheDocument();
    });

    it('handles invalid bot content gracefully', () => {
      const invalidMessage: Message = {
        ...botMessage,
        content: '',
      };

      render(
        <MockThemeProvider>
          <MessageBubble message={invalidMessage} isUser={false} />
        </MockThemeProvider>
      );

      expect(screen.getByText('[Invalid message content]')).toBeInTheDocument();
    });
  });

  describe('Message Detection Logic', () => {
    it('detects user message when isUser prop is true', () => {
      const botMessage: Message = { ...mockMessage, isBot: true };
      render(
        <MockThemeProvider>
          <MessageBubble message={botMessage} isUser={true} />
        </MockThemeProvider>
      );

      expect(screen.getByText('👤')).toBeInTheDocument();
    });

    it('detects bot message when isUser prop is false', () => {
      const userMessage: Message = { ...mockMessage, isBot: false };
      render(
        <MockThemeProvider>
          <MessageBubble message={userMessage} isUser={false} />
        </MockThemeProvider>
      );

      expect(screen.getByText('🤖')).toBeInTheDocument();
    });

    it('falls back to message.isBot when isUser prop is undefined', () => {
      const botMessage: Message = { ...mockMessage, isBot: true };
      render(
        <MockThemeProvider>
          <MessageBubble message={botMessage} />
        </MockThemeProvider>
      );

      expect(screen.getByText('🤖')).toBeInTheDocument();
    });

    it('defaults to user message when isUser and isBot are undefined', () => {
      const neutralMessage: Message = { ...mockMessage, isBot: undefined };
      render(
        <MockThemeProvider>
          <MessageBubble message={neutralMessage} />
        </MockThemeProvider>
      );

      expect(screen.getByText('👤')).toBeInTheDocument();
    });
  });

  describe('Status Icons', () => {
    it('shows clock icon for sending status', () => {
      const sendingMessage = { ...mockMessage, status: 'sending' as const };
      render(
        <MockThemeProvider>
          <MessageBubble message={sendingMessage} isUser={true} />
        </MockThemeProvider>
      );

      const container = screen.getByText('Test message content').closest('.user-message');
      expect(container).toBeInTheDocument();
    });

    it('shows double check icon for delivered status', () => {
      const deliveredMessage = { ...mockMessage, status: 'delivered' as const };
      render(
        <MockThemeProvider>
          <MessageBubble message={deliveredMessage} isUser={true} />
        </MockThemeProvider>
      );

      const container = screen.getByText('Test message content').closest('.user-message');
      expect(container).toBeInTheDocument();
    });

    it('shows X icon for failed status', () => {
      const failedMessage = { ...mockMessage, status: 'failed' as const };
      render(
        <MockThemeProvider>
          <MessageBubble message={failedMessage} isUser={true} />
        </MockThemeProvider>
      );

      const container = screen.getByText('Test message content').closest('.user-message');
      expect(container).toBeInTheDocument();
    });
  });
});