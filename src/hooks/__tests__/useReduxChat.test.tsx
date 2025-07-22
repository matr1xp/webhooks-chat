import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useChatStore } from '../useReduxChat';
import chatSlice from '@/store/chatSlice';
import { Message } from '@/types/chat';

// UUID mocking is complex in Jest, so we'll test structure without exact UUID

// Mock Date.now to have predictable timestamps
const mockTimestamp = '2023-12-01T10:00:00.000Z';
const mockDate = new Date(mockTimestamp);

// Store original Date
const OriginalDate = global.Date;

// Mock Date constructor
global.Date = jest.fn((input?: any) => {
  if (input === undefined) {
    return mockDate;
  }
  return new OriginalDate(input);
}) as any;

// Mock Date.now
global.Date.now = jest.fn(() => mockDate.getTime());

// Copy other static methods
Object.setPrototypeOf(global.Date, OriginalDate);
Object.getOwnPropertyNames(OriginalDate).forEach(name => {
  if (name !== 'now' && name !== 'length' && name !== 'name' && name !== 'prototype') {
    global.Date[name] = OriginalDate[name];
  }
});

const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      chat: chatSlice,
    },
    preloadedState: {
      chat: {
        sessions: {},
        currentSessionId: null,
        isLoading: false,
        error: null,
        ...initialState,
      },
    },
  });
};

const createWrapper = (store: any) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  Wrapper.displayName = 'ReduxWrapper';
  return Wrapper;
};

describe('useChatStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('returns initial empty state', () => {
      const store = createTestStore();
      const wrapper = createWrapper(store);
      
      const { result } = renderHook(() => useChatStore(), { wrapper });

      expect(result.current.messages).toEqual([]);
      expect(result.current.currentSession).toBe(null);
      expect(result.current.currentSessionId).toBe(null);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.sessions).toEqual({});
    });

    it('returns preloaded state when provided', () => {
      const mockMessage: Message = {
        id: 'msg-1',
        sessionId: 'session-1',
        type: 'text',
        content: 'Test message',
        timestamp: mockTimestamp,
        userId: 'user-1',
        status: 'delivered',
        isBot: false,
      };

      const initialState = {
        sessions: {
          'session-1': [mockMessage],
        },
        currentSessionId: 'session-1',
        isLoading: true,
        error: 'Test error',
      };

      const store = createTestStore(initialState);
      const wrapper = createWrapper(store);
      
      const { result } = renderHook(() => useChatStore(), { wrapper });

      expect(result.current.messages).toEqual([mockMessage]);
      expect(result.current.currentSessionId).toBe('session-1');
      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBe('Test error');
      expect(result.current.sessions).toEqual({ 'session-1': [mockMessage] });
    });
  });

  describe('Session Management', () => {
    it('sets current session', () => {
      const store = createTestStore();
      const wrapper = createWrapper(store);
      
      const { result } = renderHook(() => useChatStore(), { wrapper });

      act(() => {
        result.current.setCurrentSession('session-1');
      });

      expect(result.current.currentSessionId).toBe('session-1');
    });

    it('gets messages for a specific session', () => {
      const mockMessage: Message = {
        id: 'msg-1',
        sessionId: 'session-1',
        type: 'text',
        content: 'Test message',
        timestamp: mockTimestamp,
        userId: 'user-1',
        status: 'delivered',
        isBot: false,
      };

      const initialState = {
        sessions: {
          'session-1': [mockMessage],
          'session-2': [],
        },
      };

      const store = createTestStore(initialState);
      const wrapper = createWrapper(store);
      
      const { result } = renderHook(() => useChatStore(), { wrapper });

      const session1Messages = result.current.getMessagesForSession('session-1');
      const session2Messages = result.current.getMessagesForSession('session-2');
      const nonExistentSessionMessages = result.current.getMessagesForSession('session-3');

      expect(session1Messages).toEqual([mockMessage]);
      expect(session2Messages).toEqual([]);
      expect(nonExistentSessionMessages).toEqual([]);
    });
  });

  describe('Message Management', () => {
    it('adds a new message', () => {
      const store = createTestStore({
        currentSessionId: 'session-1',
        sessions: { 'session-1': [] },
      });
      const wrapper = createWrapper(store);
      
      const { result } = renderHook(() => useChatStore(), { wrapper });

      const messageData = {
        sessionId: 'session-1',
        type: 'text' as const,
        content: 'New message',
        userId: 'user-1',
        isBot: false,
      };

      let addedMessage: Message;
      act(() => {
        addedMessage = result.current.addMessage(messageData);
      });

      // Check that the message has the correct structure (UUID will be generated)
      expect(addedMessage!).toEqual(expect.objectContaining({
        ...messageData,
        id: expect.any(String),
        timestamp: mockTimestamp,
        status: 'sending',
      }));
      
      // Verify UUID is mocked (should be our test string or a valid UUID string)  
      expect(addedMessage!.id).toEqual(expect.any(String));

      // Check that the message was added to the store
      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0]).toEqual(expect.objectContaining({
        ...messageData,
        id: expect.any(String),
        timestamp: mockTimestamp,
        status: 'sending',
      }));
    });

    it('updates message status', () => {
      const mockMessage: Message = {
        id: 'msg-1',
        sessionId: 'session-1',
        type: 'text',
        content: 'Test message',
        timestamp: mockTimestamp,
        userId: 'user-1',
        status: 'sending',
        isBot: false,
      };

      const initialState = {
        sessions: { 'session-1': [mockMessage] },
        currentSessionId: 'session-1',
      };

      const store = createTestStore(initialState);
      const wrapper = createWrapper(store);
      
      const { result } = renderHook(() => useChatStore(), { wrapper });

      act(() => {
        result.current.updateMessageStatus('msg-1', 'delivered');
      });

      expect(result.current.messages[0].status).toBe('delivered');
    });

    it('clears messages for current session', () => {
      const mockMessage: Message = {
        id: 'msg-1',
        sessionId: 'session-1',
        type: 'text',
        content: 'Test message',
        timestamp: mockTimestamp,
        userId: 'user-1',
        status: 'delivered',
        isBot: false,
      };

      const initialState = {
        sessions: { 'session-1': [mockMessage] },
        currentSessionId: 'session-1',
      };

      const store = createTestStore(initialState);
      const wrapper = createWrapper(store);
      
      const { result } = renderHook(() => useChatStore(), { wrapper });

      act(() => {
        result.current.clearMessages();
      });

      expect(result.current.messages).toEqual([]);
    });

    it('clears messages for specific session', () => {
      const mockMessage1: Message = {
        id: 'msg-1',
        sessionId: 'session-1',
        type: 'text',
        content: 'Test message 1',
        timestamp: mockTimestamp,
        userId: 'user-1',
        status: 'delivered',
        isBot: false,
      };

      const mockMessage2: Message = {
        id: 'msg-2',
        sessionId: 'session-2',
        type: 'text',
        content: 'Test message 2',
        timestamp: mockTimestamp,
        userId: 'user-1',
        status: 'delivered',
        isBot: false,
      };

      const initialState = {
        sessions: { 
          'session-1': [mockMessage1],
          'session-2': [mockMessage2],
        },
        currentSessionId: 'session-1',
      };

      const store = createTestStore(initialState);
      const wrapper = createWrapper(store);
      
      const { result } = renderHook(() => useChatStore(), { wrapper });

      act(() => {
        result.current.clearMessages('session-1');
      });

      expect(result.current.sessions['session-1']).toEqual([]);
      expect(result.current.sessions['session-2']).toEqual([mockMessage2]);
    });

    it('clears all sessions', () => {
      const initialState = {
        sessions: { 
          'session-1': [{ id: 'msg-1' }],
          'session-2': [{ id: 'msg-2' }],
        },
        currentSessionId: 'session-1',
      };

      const store = createTestStore(initialState);
      const wrapper = createWrapper(store);
      
      const { result } = renderHook(() => useChatStore(), { wrapper });

      act(() => {
        result.current.clearAllSessions();
      });

      expect(result.current.sessions).toEqual({});
      expect(result.current.currentSessionId).toBe(null);
    });
  });

  describe('Loading and Error States', () => {
    it('sets loading state', () => {
      const store = createTestStore();
      const wrapper = createWrapper(store);
      
      const { result } = renderHook(() => useChatStore(), { wrapper });

      act(() => {
        result.current.setLoading(true);
      });

      expect(result.current.isLoading).toBe(true);

      act(() => {
        result.current.setLoading(false);
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('sets error state', () => {
      const store = createTestStore();
      const wrapper = createWrapper(store);
      
      const { result } = renderHook(() => useChatStore(), { wrapper });

      act(() => {
        result.current.setError('Test error');
      });

      expect(result.current.error).toBe('Test error');

      act(() => {
        result.current.setError(null);
      });

      expect(result.current.error).toBe(null);
    });
  });

  describe('Current Session Computed Values', () => {
    it('returns current session messages when session is active', () => {
      const mockMessage: Message = {
        id: 'msg-1',
        sessionId: 'session-1',
        type: 'text',
        content: 'Test message',
        timestamp: mockTimestamp,
        userId: 'user-1',
        status: 'delivered',
        isBot: false,
      };

      const initialState = {
        sessions: { 'session-1': [mockMessage] },
        currentSessionId: 'session-1',
      };

      const store = createTestStore(initialState);
      const wrapper = createWrapper(store);
      
      const { result } = renderHook(() => useChatStore(), { wrapper });

      expect(result.current.messages).toEqual([mockMessage]);
    });

    it('returns empty array when no current session', () => {
      const initialState = {
        sessions: { 'session-1': [{ id: 'msg-1' }] },
        currentSessionId: null,
      };

      const store = createTestStore(initialState);
      const wrapper = createWrapper(store);
      
      const { result } = renderHook(() => useChatStore(), { wrapper });

      expect(result.current.messages).toEqual([]);
    });
  });
});