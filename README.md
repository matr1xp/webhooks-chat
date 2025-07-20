# Chat Interface for n8n Webhook Integration

A modern, responsive chat interface built with Next.js that sends user messages to n8n workflows via webhooks. Features real-time messaging, file uploads, offline support with message queuing, and comprehensive error handling.

## Features

- 🚀 **Modern Tech Stack**: Next.js 14, React, TypeScript, Tailwind CSS
- 💬 **Real-time Chat**: Optimistic UI updates with status indicators
- 📱 **Responsive Design**: Mobile-first approach with touch optimizations
- 📎 **File Upload**: Drag-and-drop file uploads with type validation
- 🔄 **Message Queue**: Offline support with automatic retry mechanisms
- 🔌 **n8n Integration**: Direct webhook integration with comprehensive error handling
- 🎨 **Modern UI**: Clean design with shadcn/ui components
- ⚡ **Performance**: Optimized for speed and user experience

## Quick Start

### 1. Installation

```bash
# Clone or navigate to the project directory
cd chat-interface

# Install dependencies
npm install
```

### 2. Environment Configuration

Create a `.env.local` file:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/chat
WEBHOOK_SECRET=your-secret-key
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the chat interface.

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_APP_URL` | Your application URL | Yes |
| `N8N_WEBHOOK_URL` | n8n webhook endpoint URL | Yes |
| `WEBHOOK_SECRET` | Secret key sent as `X-Webhook-Secret` header for n8n authentication | Optional but recommended |
| `TIMEOUT` | Server-side webhook request timeout in milliseconds (default: 10000ms) | Optional |
| `NEXT_PUBLIC_TIMEOUT` | Client-side webhook request timeout in milliseconds (default: 30000ms) | Optional |

### n8n Webhook Setup

1. **Create a new workflow in n8n**
2. **Add a "Webhook" node as the trigger**
   - Set HTTP Method to `POST`
   - Set Response Mode to `Respond to Webhook`
   - If using authentication, configure the webhook to expect `X-Webhook-Secret` header
   - Copy the webhook URL (should look like `https://your-n8n.com/webhook/your-id`)
3. **Activate the workflow** (very important - webhook only works when workflow is active)
4. **Configure the environment variables in your `.env.local`**
   ```env
   N8N_WEBHOOK_URL=https://your-n8n.com/webhook/your-webhook-id
   WEBHOOK_SECRET=your-secret-key-here
   TIMEOUT=30000
   NEXT_PUBLIC_TIMEOUT=30000
   ```
5. **Test the webhook** by sending a message in the chat interface

The webhook will receive payloads in this simple format:

```json
{
  "message": "Hello from the chat interface!"
}
```

## Architecture

### Component Structure

```
src/
├── components/
│   ├── chat/
│   │   ├── ChatContainer.tsx      # Main chat wrapper
│   │   ├── MessageList.tsx        # Message display area
│   │   ├── MessageInput.tsx       # Input with file upload
│   │   ├── MessageBubble.tsx      # Individual messages
│   │   └── TypingIndicator.tsx    # Loading states
│   └── ui/
│       ├── FileUpload.tsx         # Drag-and-drop upload
│       └── Modal.tsx              # Modal component
├── hooks/
│   ├── useChat.ts                 # Chat state management
│   └── useMessageQueue.ts         # Offline queue system
├── lib/
│   ├── webhook-client.ts          # n8n webhook client
│   ├── validation.ts              # Zod schemas
│   └── utils.ts                   # Utility functions
├── types/
│   └── chat.ts                    # TypeScript interfaces
└── app/
    ├── api/                       # Next.js API routes
    ├── layout.tsx                 # Root layout
    └── page.tsx                   # Main page
```

### Key Features

#### Message Queue System
- Automatic retry with exponential backoff
- Persistent storage for offline messages
- Queue processing every 5 seconds
- Manual retry functionality

#### File Upload
- Drag-and-drop interface
- File type validation
- Size limits (25MB default)
- Support for images, documents, and more

#### Responsive Design
- Mobile-first approach
- Touch-optimized interactions
- Adaptive layouts for different screen sizes
- Safe area handling for mobile devices

## API Routes

### POST `/api/webhook/send`
Forwards messages to the configured n8n webhook.

**Request Body:**
```json
{
  "sessionId": "string",
  "messageId": "string",
  "timestamp": "string",
  "user": { "id": "string", "name": "string" },
  "message": { "type": "text|file|image", "content": "string" }
}
```

### GET `/api/messages/[sessionId]`
Retrieves message history for a session (placeholder implementation).

### GET `/api/health`
Health check endpoint that verifies n8n webhook availability.

### POST `/api/test-webhook`
Test endpoint to debug webhook connectivity issues. Returns detailed error information.

## Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript checks
```

### Technology Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **HTTP Client**: Axios
- **Validation**: Zod
- **Icons**: Lucide React

## Production Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Set production environment variables

3. Deploy to your preferred platform (Vercel, Netlify, etc.)

## Customization

### Styling
Modify `src/app/globals.css` and Tailwind configuration in `tailwind.config.js`.

### Message Types
Extend the message types in `src/types/chat.ts` and update validation schemas.

### Webhook Payload
Customize the payload structure in `src/lib/webhook-client.ts`.

## Troubleshooting

### Common Issues

1. **Webhook receiving 403 Forbidden errors**
   - **Check if your n8n instance requires authentication**
   - If using n8n cloud or self-hosted with auth, you may need API credentials
   - Try accessing the webhook URL directly in your browser to see the error
   - Ensure the webhook URL format is correct: `https://your-n8n.com/webhook/your-webhook-id`
   - Check n8n instance security settings and CORS configuration

2. **Webhook not receiving messages (404/general errors)**
   - Verify `N8N_WEBHOOK_URL` is correct and complete
   - **Ensure the n8n workflow is ACTIVE** (most common issue)
   - Check that the webhook node is set to `POST` method
   - Test the webhook URL directly with a tool like Postman
   - Review n8n workflow execution logs for errors

2. **File uploads not working**
   - Check file size limits
   - Verify file type restrictions
   - Review browser console for errors

3. **Messages stuck in queue**
   - Check network connectivity
   - Verify webhook endpoint health
   - Use manual retry button

### Debug Mode

Enable development mode for detailed logging:
```bash
npm run dev
```

Check browser console and network tab for debugging information.

## License

MIT License - feel free to use this project for your own n8n integrations.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review the n8n webhook documentation
3. Open an issue with detailed information