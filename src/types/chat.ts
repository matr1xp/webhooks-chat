export interface Message {
  id: string;
  sessionId: string;
  type: 'text' | 'file' | 'image';
  content: string;
  timestamp: string;
  userId: string;
  status: 'sending' | 'delivered' | 'failed';
  isBot?: boolean; // Flag to identify bot messages
  source?: string; // Source of the bot response (e.g., "OpenAI GPT4", "Claude", etc.)
  metadata?: Record<string, any>;
  // For file/image preview purposes
  fileData?: {
    name: string;
    size: number;
    type: string;
    data: string; // Base64 encoded for preview
  };
}

export interface User {
  id: string;
  name?: string;
}

export interface ChatSession {
  id: string;
  userId: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

export interface WebhookPayload {
  sessionId: string;
  messageId: string;
  timestamp: string;
  user: User;
  message: {
    type: 'text' | 'file' | 'image';
    content: string;
    destination?: string; // Target AI service/model for this message
    metadata?: Record<string, any>;
    file?: {
      name: string;
      size: number;
      type: string;
      data: string; // Base64 encoded file data
    };
  };
  context?: {
    previousMessages?: number;
    userAgent?: string;
    source: 'web' | 'mobile';
  };
}

export interface WebhookResponse {
  success: boolean;
  messageId: string;
  timestamp: string;
  error?: string;
  // Bot response from n8n workflow
  botMessage?: {
    content: string;
    type?: 'text' | 'file' | 'image';
    source?: string; // Source of the bot response
    metadata?: Record<string, any>;
  };
}

export interface ChatStore {
  // Multi-session support
  sessions: { [sessionId: string]: Message[] };
  currentSessionId: string | null;
  isLoading: boolean;
  error: string | null;
  
  // Legacy support - computed from current session
  messages: Message[];
  currentSession: ChatSession | null;
  
  // Session management
  setCurrentSession: (sessionId: string) => void;
  getMessagesForSession: (sessionId: string) => Message[];
  
  // Message management
  addMessage: (message: Omit<Message, 'id' | 'timestamp' | 'status'>) => Message;
  updateMessageStatus: (messageId: string, status: Message['status']) => void;
  clearMessages: (sessionId?: string) => void;
  clearAllSessions: () => void;
  
  // State management
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}