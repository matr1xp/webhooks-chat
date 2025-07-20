'use client';

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { Message, ChatSession, ChatStore } from '@/types/chat';
import { v4 as uuidv4 } from 'uuid';

const useChatStore = create<ChatStore>()(
  devtools(
    persist(
      (set, get) => ({
        sessions: {},
        currentSessionId: null,
        isLoading: false,
        error: null,

        // Computed properties
        get messages() {
          const state = get();
          return state.currentSessionId ? (state.sessions[state.currentSessionId] || []) : [];
        },

        get currentSession() {
          const state = get();
          if (!state.currentSessionId) return null;
          
          const messages = state.sessions[state.currentSessionId] || [];
          return {
            id: state.currentSessionId,
            userId: messages[0]?.userId || '',
            messages,
            createdAt: messages[0]?.timestamp || new Date().toISOString(),
            updatedAt: messages[messages.length - 1]?.timestamp || new Date().toISOString(),
          };
        },

        // Session management
        setCurrentSession: (sessionId) => {
          set((state) => {
            // Initialize session if it doesn't exist
            if (!state.sessions[sessionId]) {
              return {
                ...state,
                currentSessionId: sessionId,
                sessions: {
                  ...state.sessions,
                  [sessionId]: [],
                },
              };
            }
            return { ...state, currentSessionId: sessionId };
          });
        },

        getMessagesForSession: (sessionId) => {
          const state = get();
          return state.sessions[sessionId] || [];
        },

        // Message management
        addMessage: (messageData) => {
          const message: Message = {
            ...messageData,
            id: uuidv4(),
            timestamp: new Date().toISOString(),
            status: 'sending',
          };

          set((state) => {
            const sessionId = state.currentSessionId || messageData.sessionId;
            const currentMessages = state.sessions[sessionId] || [];
            
            return {
              ...state,
              sessions: {
                ...state.sessions,
                [sessionId]: [...currentMessages, message],
              },
            };
          });

          return message;
        },

        updateMessageStatus: (messageId, status) => {
          set((state) => {
            const updatedSessions = { ...state.sessions };
            
            // Find the session containing this message
            for (const sessionId in updatedSessions) {
              const messages = updatedSessions[sessionId];
              const messageIndex = messages.findIndex(msg => msg.id === messageId);
              
              if (messageIndex !== -1) {
                updatedSessions[sessionId] = messages.map((msg) =>
                  msg.id === messageId ? { ...msg, status } : msg
                );
                break;
              }
            }
            
            return { ...state, sessions: updatedSessions };
          });
        },

        clearMessages: (sessionId) => {
          set((state) => {
            if (sessionId) {
              // Clear specific session
              return {
                ...state,
                sessions: {
                  ...state.sessions,
                  [sessionId]: [],
                },
              };
            } else if (state.currentSessionId) {
              // Clear current session
              return {
                ...state,
                sessions: {
                  ...state.sessions,
                  [state.currentSessionId]: [],
                },
              };
            }
            return state;
          });
        },

        clearAllSessions: () => {
          set({ sessions: {}, currentSessionId: null });
        },

        setLoading: (loading) => {
          set({ isLoading: loading });
        },

        setError: (error) => {
          set({ error });
        },
      }),
      {
        name: 'chat-store-v2',
        version: 2,
        // Only persist sessions, not computed properties
        partialize: (state) => ({
          sessions: state.sessions,
          currentSessionId: state.currentSessionId,
        }),
      }
    ),
    {
      name: 'chat-store',
    }
  )
);

export default useChatStore;