import { z } from 'zod';

export const MessageSchema = z.object({
  type: z.enum(['text', 'file', 'image']),
  content: z.string().min(1, 'Message content cannot be empty').max(10000, 'Message too long'),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const UserSchema = z.object({
  id: z.string().min(1, 'User ID cannot be empty'),
  name: z.string().optional(),
});

export const WebhookPayloadSchema = z.object({
  sessionId: z.string(),
  messageId: z.string(),
  timestamp: z.string(),
  user: UserSchema,
  message: MessageSchema,
  context: z.object({
    previousMessages: z.number().optional(),
    userAgent: z.string().optional(),
    source: z.enum(['web', 'mobile']),
  }).optional(),
});

export const WebhookResponseSchema = z.object({
  success: z.boolean(),
  messageId: z.string(),
  timestamp: z.string(),
  error: z.string().optional(),
});

export type MessageValidation = z.infer<typeof MessageSchema>;
export type UserValidation = z.infer<typeof UserSchema>;
export type WebhookPayloadValidation = z.infer<typeof WebhookPayloadSchema>;
export type WebhookResponseValidation = z.infer<typeof WebhookResponseSchema>;