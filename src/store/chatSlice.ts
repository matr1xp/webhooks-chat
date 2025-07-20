import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Message, ChatSession } from '@/types/chat';
import { v4 as uuidv4 } from 'uuid';

interface ChatState {
  sessions: { [sessionId: string]: Message[] };
  currentSessionId: string | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: ChatState = {
  sessions: {},
  currentSessionId: null,
  isLoading: false,
  error: null,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setCurrentSession: (state, action: PayloadAction<string>) => {
      const sessionId = action.payload;
      // Initialize session if it doesn't exist
      if (!state.sessions[sessionId]) {
        state.sessions[sessionId] = [];
      }
      state.currentSessionId = sessionId;
    },

    addMessage: (state, action: PayloadAction<Omit<Message, 'id' | 'timestamp' | 'status'>>) => {
      const messageData = action.payload;
      const message: Message = {
        ...messageData,
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        status: 'sending',
      };

      const sessionId = state.currentSessionId || messageData.sessionId;
      if (!state.sessions[sessionId]) {
        state.sessions[sessionId] = [];
      }
      state.sessions[sessionId].push(message);
    },

    updateMessageStatus: (state, action: PayloadAction<{ messageId: string; status: Message['status'] }>) => {
      const { messageId, status } = action.payload;
      
      // Find the session containing this message
      for (const sessionId in state.sessions) {
        const messages = state.sessions[sessionId];
        const messageIndex = messages.findIndex(msg => msg.id === messageId);
        
        if (messageIndex !== -1) {
          state.sessions[sessionId][messageIndex].status = status;
          break;
        }
      }
    },

    clearMessages: (state, action: PayloadAction<string | undefined>) => {
      const sessionId = action.payload;
      
      if (sessionId) {
        // Clear specific session
        state.sessions[sessionId] = [];
      } else if (state.currentSessionId) {
        // Clear current session
        state.sessions[state.currentSessionId] = [];
      }
    },

    clearAllSessions: (state) => {
      state.sessions = {};
      state.currentSessionId = null;
    },

    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const {
  setCurrentSession,
  addMessage,
  updateMessageStatus,
  clearMessages,
  clearAllSessions,
  setLoading,
  setError,
} = chatSlice.actions;

export default chatSlice.reducer;