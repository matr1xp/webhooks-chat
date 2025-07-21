import {
  MessageSchema,
  UserSchema,
  WebhookPayloadSchema,
  WebhookResponseSchema,
  MessageValidation,
  UserValidation,
  WebhookPayloadValidation,
  WebhookResponseValidation,
} from '../validation';

describe('validation schemas', () => {
  describe('MessageSchema', () => {
    it('validates a valid text message', () => {
      const validMessage = {
        type: 'text' as const,
        content: 'Hello world',
      };

      const result = MessageSchema.safeParse(validMessage);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validMessage);
      }
    });

    it('validates a message with metadata', () => {
      const messageWithMetadata = {
        type: 'text' as const,
        content: 'Hello world',
        metadata: {
          userId: '123',
          timestamp: '2023-12-01T10:00:00Z',
        },
      };

      const result = MessageSchema.safeParse(messageWithMetadata);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(messageWithMetadata);
      }
    });

    it('validates all message types', () => {
      const types = ['text', 'file', 'image'] as const;
      
      types.forEach(type => {
        const message = {
          type,
          content: 'test content',
        };
        
        const result = MessageSchema.safeParse(message);
        expect(result.success).toBe(true);
      });
    });

    it('rejects invalid message type', () => {
      const invalidMessage = {
        type: 'invalid',
        content: 'Hello world',
      };

      const result = MessageSchema.safeParse(invalidMessage);
      expect(result.success).toBe(false);
    });

    it('rejects empty content', () => {
      const emptyContentMessage = {
        type: 'text' as const,
        content: '',
      };

      const result = MessageSchema.safeParse(emptyContentMessage);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Message content cannot be empty');
      }
    });

    it('rejects content that is too long', () => {
      const longContentMessage = {
        type: 'text' as const,
        content: 'a'.repeat(10001), // Exceeds max length
      };

      const result = MessageSchema.safeParse(longContentMessage);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Message too long');
      }
    });

    it('accepts content at the maximum length', () => {
      const maxLengthMessage = {
        type: 'text' as const,
        content: 'a'.repeat(10000), // Exactly at max length
      };

      const result = MessageSchema.safeParse(maxLengthMessage);
      expect(result.success).toBe(true);
    });

    it('rejects missing required fields', () => {
      const incompleteMessage = {
        type: 'text' as const,
        // Missing content
      };

      const result = MessageSchema.safeParse(incompleteMessage);
      expect(result.success).toBe(false);
    });
  });

  describe('UserSchema', () => {
    it('validates a user with just ID', () => {
      const user = {
        id: 'user-123',
      };

      const result = UserSchema.safeParse(user);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(user);
      }
    });

    it('validates a user with ID and name', () => {
      const user = {
        id: 'user-123',
        name: 'John Doe',
      };

      const result = UserSchema.safeParse(user);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(user);
      }
    });

    it('rejects user without ID', () => {
      const userWithoutId = {
        name: 'John Doe',
      };

      const result = UserSchema.safeParse(userWithoutId);
      expect(result.success).toBe(false);
    });

    it('rejects user with empty ID', () => {
      const userWithEmptyId = {
        id: '',
        name: 'John Doe',
      };

      const result = UserSchema.safeParse(userWithEmptyId);
      expect(result.success).toBe(false);
    });
  });

  describe('WebhookPayloadSchema', () => {
    const validPayload = {
      sessionId: 'session-123',
      messageId: 'msg-456',
      timestamp: '2023-12-01T10:00:00Z',
      user: {
        id: 'user-789',
        name: 'John Doe',
      },
      message: {
        type: 'text' as const,
        content: 'Hello world',
      },
    };

    it('validates a complete webhook payload', () => {
      const result = WebhookPayloadSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validPayload);
      }
    });

    it('validates payload with context', () => {
      const payloadWithContext = {
        ...validPayload,
        context: {
          previousMessages: 5,
          userAgent: 'Mozilla/5.0',
          source: 'web' as const,
        },
      };

      const result = WebhookPayloadSchema.safeParse(payloadWithContext);
      expect(result.success).toBe(true);
    });

    it('validates payload with minimal context', () => {
      const payloadWithMinimalContext = {
        ...validPayload,
        context: {
          source: 'mobile' as const,
        },
      };

      const result = WebhookPayloadSchema.safeParse(payloadWithMinimalContext);
      expect(result.success).toBe(true);
    });

    it('rejects invalid context source', () => {
      const payloadWithInvalidContext = {
        ...validPayload,
        context: {
          source: 'invalid',
        },
      };

      const result = WebhookPayloadSchema.safeParse(payloadWithInvalidContext);
      expect(result.success).toBe(false);
    });

    it('rejects payload missing required fields', () => {
      const { sessionId, ...incompletePayload } = validPayload;

      const result = WebhookPayloadSchema.safeParse(incompletePayload);
      expect(result.success).toBe(false);
    });

    it('rejects payload with invalid user', () => {
      const payloadWithInvalidUser = {
        ...validPayload,
        user: {
          // Missing id
          name: 'John Doe',
        },
      };

      const result = WebhookPayloadSchema.safeParse(payloadWithInvalidUser);
      expect(result.success).toBe(false);
    });

    it('rejects payload with invalid message', () => {
      const payloadWithInvalidMessage = {
        ...validPayload,
        message: {
          type: 'invalid',
          content: 'Hello world',
        },
      };

      const result = WebhookPayloadSchema.safeParse(payloadWithInvalidMessage);
      expect(result.success).toBe(false);
    });
  });

  describe('WebhookResponseSchema', () => {
    it('validates a successful response', () => {
      const successResponse = {
        success: true,
        messageId: 'msg-123',
        timestamp: '2023-12-01T10:00:00Z',
      };

      const result = WebhookResponseSchema.safeParse(successResponse);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(successResponse);
      }
    });

    it('validates an error response', () => {
      const errorResponse = {
        success: false,
        messageId: 'msg-123',
        timestamp: '2023-12-01T10:00:00Z',
        error: 'Something went wrong',
      };

      const result = WebhookResponseSchema.safeParse(errorResponse);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(errorResponse);
      }
    });

    it('validates response without error field', () => {
      const responseWithoutError = {
        success: false,
        messageId: 'msg-123',
        timestamp: '2023-12-01T10:00:00Z',
      };

      const result = WebhookResponseSchema.safeParse(responseWithoutError);
      expect(result.success).toBe(true);
    });

    it('rejects response missing required fields', () => {
      const incompleteResponse = {
        success: true,
        // Missing messageId and timestamp
      };

      const result = WebhookResponseSchema.safeParse(incompleteResponse);
      expect(result.success).toBe(false);
    });

    it('rejects response with invalid success field', () => {
      const invalidResponse = {
        success: 'yes', // Should be boolean
        messageId: 'msg-123',
        timestamp: '2023-12-01T10:00:00Z',
      };

      const result = WebhookResponseSchema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });
  });

  describe('Type inference', () => {
    it('infers correct types from schemas', () => {
      // This test verifies that TypeScript types are correctly inferred
      const message: MessageValidation = {
        type: 'text',
        content: 'Hello world',
      };

      const user: UserValidation = {
        id: 'user-123',
        name: 'John Doe',
      };

      const webhookPayload: WebhookPayloadValidation = {
        sessionId: 'session-123',
        messageId: 'msg-456',
        timestamp: '2023-12-01T10:00:00Z',
        user,
        message,
      };

      const webhookResponse: WebhookResponseValidation = {
        success: true,
        messageId: 'msg-123',
        timestamp: '2023-12-01T10:00:00Z',
      };

      // If this compiles without errors, the types are correctly inferred
      expect(message.type).toBe('text');
      expect(user.id).toBe('user-123');
      expect(webhookPayload.sessionId).toBe('session-123');
      expect(webhookResponse.success).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('handles null and undefined values', () => {
      expect(MessageSchema.safeParse(null).success).toBe(false);
      expect(MessageSchema.safeParse(undefined).success).toBe(false);
      expect(UserSchema.safeParse(null).success).toBe(false);
      expect(WebhookPayloadSchema.safeParse(null).success).toBe(false);
      expect(WebhookResponseSchema.safeParse(null).success).toBe(false);
    });

    it('handles empty objects', () => {
      expect(MessageSchema.safeParse({}).success).toBe(false);
      expect(UserSchema.safeParse({}).success).toBe(false);
      expect(WebhookPayloadSchema.safeParse({}).success).toBe(false);
      expect(WebhookResponseSchema.safeParse({}).success).toBe(false);
    });

    it('handles extra fields gracefully', () => {
      const messageWithExtra = {
        type: 'text' as const,
        content: 'Hello world',
        extraField: 'should be ignored',
      };

      const result = MessageSchema.safeParse(messageWithExtra);
      expect(result.success).toBe(true);
      if (result.success) {
        // Extra fields should be stripped out
        expect(result.data).not.toHaveProperty('extraField');
      }
    });
  });
});