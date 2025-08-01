# WebChat Interface for n8n Webhook Integration

A modern, responsive chat interface built with Next.js that integrates with n8n workflows via webhooks. Features Firebase authentication, real-time messaging, dual data persistence (Firebase/Redux), comprehensive webhook management, and modern typography.

## ✨ Features

### 🔐 Authentication & User Management

- **Firebase Authentication** with Google Sign-in using official Google branding
- **Anonymous Authentication** fallback for seamless user experience
- **User Profile Management** with persistent preferences and dark mode support
- **Session Management** across browser sessions and devices
- **Security Rules** with user-based access control
- **Consistent Theme Support** for user interface elements

### 💬 Advanced Chat System

- **Real-time Messaging** with optimistic UI updates and status tracking
- **Multi-session Support** with unlimited concurrent chat sessions
- **Dual Data Persistence**: Firebase Firestore or Redux with localStorage
- **Bot Integration** with n8n workflow responses and metadata support
- **Message Types**: Text, file uploads (images/documents up to 10MB)
- **Drag & Drop Interface** for seamless file sharing
- **Welcome Screen Prompts** that send messages directly to configured webhooks
- **Auto-chat Creation** for prompt suggestions with intelligent naming

### 🔗 Comprehensive Webhook Management

- **Multiple Webhook Configurations** with CRUD operations
- **Health Monitoring** with automatic connection testing
- **API Secret Management** with secure storage and show/hide toggle
- **Firebase Cloud Functions** proxy for enhanced security and reliability
- **Error Handling** with detailed feedback and retry mechanisms
- **Webhook Testing** with built-in diagnostic tools

### 🎨 Modern UI/UX

- **Custom Typography System**: Soliden Condensed (chat), Soliden Regular (headers)
- **Light/Dark Mode** with system theme detection and persistence
- **Responsive Design** with mobile-first approach and touch optimizations
- **Glassmorphism Effects** with backdrop blur and modern styling
- **Visual Status Indicators** for connections, messages, and system health
- **Interactive Welcome Screen** with prompt suggestions that send messages directly
- **Google Authentication** with official Google branding and icons

### 🚀 Production-Ready Architecture

- **Next.js 15** with App Router and TypeScript
- **Static Export** for serverless deployment
- **Firebase Integration**: Hosting, Functions, Firestore, Auth
- **Performance Optimized** with caching, compression, and CDN support
- **Comprehensive Testing** with Jest and React Testing Library

## 🚀 Quick Start

### 1. Installation

```bash
# Clone or navigate to the project directory
cd chat-interface

# Install dependencies
npm install
```

### 2. Firebase Setup

Configure Firebase services:

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize project (if not already done)
firebase init
```

### 3. Environment Configuration

Create a `.env.local` file:

```env
# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Firebase Configuration (get from Firebase Console)
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef

# Optional: Default n8n Webhook Configuration
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/chat
WEBHOOK_SECRET=your-secret-key

# Optional: Timeout Configuration
TIMEOUT=10000
NEXT_PUBLIC_TIMEOUT=30000
```

### 4. Run Development Server

```bash
# Start with development logging
npm run dev

# Or start with verbose output
npm run dev:verbose
```

Open [http://localhost:3000](http://localhost:3000) to view the chat interface.

## 📋 Configuration

### Firebase Setup

1. **Create Firebase Project** at [Firebase Console](https://console.firebase.google.com)
2. **Enable Authentication** with Google provider
3. **Create Firestore Database** with security rules
4. **Deploy Cloud Functions** for webhook proxy
5. **Configure Hosting** for static site deployment

### n8n Webhook Setup

1. **Create Workflow** in n8n with Webhook trigger
2. **Configure Webhook Node**:
   - HTTP Method: `POST`
   - Response Mode: `Respond to Webhook`
   - Authentication: Optional `X-Webhook-Secret` header
3. **Activate Workflow** (critical - inactive workflows don't receive webhooks)
4. **Add Webhook** in chat interface configuration modal
5. **Test Connection** using built-in health check

The webhook receives simplified payloads:

```json
{
  "message": "Hello from the chat interface!"
}
```

## 🏗️ Architecture

### Directory Structure

```text
src/
├── components/
│   ├── chat/                    # Chat interface components
│   │   ├── ChatContainer.tsx    # Main chat wrapper with dual-mode support
│   │   ├── MessageList.tsx      # Message display with virtual scrolling
│   │   ├── MessageInput.tsx     # Input with file upload and validation
│   │   └── MessageBubble.tsx    # Individual messages with status
│   ├── ui/                      # Reusable UI components
│   │   ├── ConfigModal.tsx      # Webhook configuration management
│   │   ├── FileUpload.tsx       # Drag-and-drop file handling
│   │   ├── Modal.tsx            # Modal component system
│   │   └── ThemeToggle.tsx      # Light/dark mode toggle
│   └── auth/                    # Authentication components
│       └── GoogleSignIn.tsx     # Firebase Auth integration
├── contexts/                    # React context providers
│   ├── FirebaseContext.tsx     # Firebase service integration
│   ├── ThemeContext.tsx        # Theme management
│   └── ConfigContext.tsx       # Configuration management
├── hooks/                       # Custom React hooks
│   ├── useFirebaseChat.ts       # Firebase chat operations
│   ├── useReduxChat.ts          # Redux chat operations
│   └── useFirestoreAuth.ts      # Authentication state management
├── lib/                         # Utilities and integrations
│   ├── firebase.ts              # Firebase SDK configuration
│   ├── webhook-client.ts        # n8n webhook client
│   ├── cloud-functions.ts       # Firebase Functions client
│   └── validation.ts            # Zod validation schemas
├── store/                       # Redux state management
│   ├── chatSlice.ts             # Chat state and message handling
│   ├── configSlice.ts           # Configuration management
│   └── messageQueueSlice.ts     # Offline message queuing
├── functions/                   # Firebase Cloud Functions
│   ├── src/
│   │   ├── webhook.ts           # Webhook proxy functions
│   │   └── health.ts            # Health check functions
└── app/                         # Next.js App Router
    ├── api/                     # API routes (legacy support)
    ├── globals.css              # Global styles and typography
    └── page.tsx                 # Main application page
```

### Key Features

#### Dual Data Persistence

- **Firebase Mode**: Real-time Firestore with authentication
- **Redux Mode**: Local storage with offline support
- **Feature Flag**: Toggle between modes via `USE_FIREBASE` flag
- **Data Migration**: Seamless switching between persistence modes

#### Authentication System

- **Google Sign-in**: OAuth integration with Chrome identity API
- **Anonymous Auth**: Fallback for development and testing
- **User Profiles**: Persistent user data and preferences
- **Security Rules**: Firestore access control based on authentication

#### Message Queue System

- **Offline Support**: Queue messages when disconnected
- **Automatic Retry**: Exponential backoff with manual retry options
- **Persistent Storage**: Survive browser restarts and network issues
- **Status Tracking**: Real-time message delivery status

## 🛠️ Available Scripts

```bash
# Development
npm run dev              # Start development server with logging
npm run dev:verbose      # Start with verbose output

# Building & Production
npm run build            # Build optimized production bundle
npm run start            # Start production server

# Quality Assurance
npm run lint             # Run ESLint code analysis
npm run type-check       # Run TypeScript validation
npm test                 # Run Jest test suite
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Generate test coverage report

# Firebase Deployment
firebase deploy          # Deploy to Firebase hosting
firebase emulators:start # Start local Firebase emulators
```

## 📱 API Routes & Cloud Functions

### Firebase Cloud Functions

#### `webhookSend`

Secure proxy for n8n webhook communication with authentication and error handling.

#### `healthCheck`

Monitor n8n webhook availability and connection status.

### Legacy API Routes (Compatibility)

#### `POST /api/webhook/send`

Direct webhook forwarding (available in Redux mode).

#### `GET /api/health`

Basic health check for webhook connectivity.

## 🎨 Typography System

### Custom Font Families

- **Soliden Condensed**: Chat bubbles, message content, and input fields
  - Regular (400): Standard text and inputs
- **Soliden Regular**: Headers, navigation, and UI elements
  - Regular (400): Standard weight
  - Bold (700): Emphasis and headings
- **Monoline**: Available for custom styling

### Usage Examples

```css
/* Tailwind classes */
.font-soliden-condensed    /* Soliden Condensed family */
.font-soliden             /* Soliden Regular family */
.font-monoline            /* Monoline family */

/* CSS properties */
font-family: 'Soliden Condensed', sans-serif;
font-family: 'Soliden Regular', sans-serif;
```

## 🚀 Production Deployment

### Firebase Deployment

```bash
# Build and deploy
npm run build
firebase deploy

# Deploy specific services
firebase deploy --only hosting
firebase deploy --only functions
firebase deploy --only firestore
```

### Alternative Platforms

#### Vercel

```bash
npm run build
# Deploy out/ directory to Vercel
```

#### Netlify

```bash
npm run build
# Deploy out/ directory to Netlify
```

## 🔧 Customization

### Theme Customization

Modify theme variables in `src/app/globals.css`:

```css
:root {
  --primary: your-primary-color;
  --secondary: your-secondary-color;
  /* Add custom CSS variables */
}
```

### Adding Message Types

1. Extend types in `src/types/chat.ts`
2. Update validation schemas in `src/lib/validation.ts`
3. Add rendering logic in `MessageBubble.tsx`
4. Update webhook payload structure

### Custom Webhooks

Configure webhook endpoints in the app:

1. Open configuration modal
2. Add webhook with URL and optional secret
3. Test connection
4. Set as active webhook

## 🔍 Troubleshooting

### Common Issues

#### Authentication Problems

- **Google Sign-in fails**: Check Firebase console configuration
- **Anonymous auth issues**: Verify Firebase Auth settings
- **Permission denied**: Review Firestore security rules

#### Webhook Integration

- **404 errors**: Ensure n8n workflow is ACTIVE
- **403 errors**: Check webhook authentication and secrets
- **Timeout issues**: Verify webhook response times and network connectivity
- **Connection refused**: Confirm webhook URL and n8n instance availability

#### Development Issues

- **Build failures**: Run `npm run type-check` and fix TypeScript errors
- **Test failures**: Check test configuration and dependencies
- **Firebase connection**: Verify environment variables and Firebase setup

### Debug Mode

Enable comprehensive logging:

```bash
# Development logging
npm run dev:verbose

# Check browser console for detailed error information
# Monitor Network tab for webhook communication
# Use Firebase emulators for local debugging
```

## 📄 Technology Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 with custom typography
- **State Management**: Redux Toolkit with Redux Persist
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth with Google Sign-in
- **Backend**: Firebase Cloud Functions
- **Hosting**: Firebase Hosting
- **HTTP Client**: Axios
- **Validation**: Zod
- **Testing**: Jest + React Testing Library
- **Icons**: Lucide React
- **Fonts**: Soliden font family (Condensed & Regular variants)

## 📄 License

MIT License - feel free to use this project for your own n8n integrations.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes with proper testing
4. Run quality checks (`npm run lint && npm run type-check`)
5. Commit changes (`git commit -m 'feat: add amazing feature'`)
6. Push to branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 💬 Support

For issues and questions:

1. Check the troubleshooting section above
2. Review [n8n webhook documentation](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/)
3. Check [Firebase documentation](https://firebase.google.com/docs)
4. Open an issue with detailed reproduction steps

---

Built with ❤️ for seamless n8n workflow integration
