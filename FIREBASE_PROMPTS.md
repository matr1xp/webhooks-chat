# Firebase Dynamic Prompts Feature

## Overview

This document tracks the implementation of dynamic prompt suggestions in the WelcomeScreen component. The feature loads webhook-specific suggestions from Firebase Firestore, providing a personalized experience based on the active webhook configuration.

## Implementation Status

### ✅ Completed
- [x] Analysis of current WelcomeScreen implementation
- [x] Firebase context and hooks research
- [x] Schema design for prompt configuration
- [x] Documentation setup (FIREBASE_PROMPTS.md)
- [x] Update Firestore types with prompt config interface
- [x] Create Firestore service functions for prompt management
- [x] Implement Firebase hook for fetching dynamic suggestions
- [x] Update WelcomeScreen to use dynamic data with fallback
- [x] Add loading and error states for better UX

### 🎉 Feature Complete
The dynamic prompts feature is now fully implemented and ready for use!

### Implementation Summary
- **Files Created**: 3 new files
  - `src/lib/firestore/prompts.ts` - Firestore service functions
  - `src/lib/hooks/useFirestorePrompts.ts` - React hook for prompt management
  - `FIREBASE_PROMPTS.md` - This documentation file

- **Files Modified**: 2 existing files
  - `src/lib/firestore/types.ts` - Added FirestorePromptConfig interface
  - `src/components/chat/WelcomeScreen.tsx` - Integrated dynamic prompts with loading/error states

- **Key Features Implemented**:
  - Real-time prompt updates via Firestore subscriptions
  - 5-minute caching to reduce Firestore reads
  - Graceful fallback to default suggestions
  - Loading skeleton states for better UX
  - Error handling with retry functionality
  - Fallback indicator for transparency

## Data Schema

### Firestore Collection: `prompts`

Each document represents a webhook's prompt configuration:

```typescript
interface FirestorePromptConfig {
  id: string;              // Document ID = webhook name (e.g., "OpenAI GPT4")
  webhookName: string;     // Display name for the webhook
  title: string;           // Welcome message title (e.g., "I'm an AI powered chat bot")
  suggestions: string[];   // Array of prompt suggestions
  createdAt: Timestamp;    // Document creation time
  updatedAt: Timestamp;    // Last modification time
  isActive: boolean;       // Enable/disable suggestions for this webhook
}
```

### Example Document Structure

```json
{
  "id": "OpenAI GPT4",
  "webhookName": "OpenAI GPT4",
  "title": "I'm an AI powered chat bot",
  "suggestions": [
    "What is the meaning of life?",
    "Tell me about the latest AI developments",
    "Construct a poem about love.",
    "Explain quantum computing in simple terms",
    "Help me write a professional email",
    "Create a workout plan for beginners"
  ],
  "createdAt": "2024-01-15T08:00:00Z",
  "updatedAt": "2024-01-15T08:00:00Z",
  "isActive": true
}
```

## Current Implementation Details

### Existing WelcomeScreen Structure
- **Location**: `src/components/chat/WelcomeScreen.tsx`
- **Current State**: Uses hardcoded `DEFAULT_SUGGESTIONS` array
- **Active Webhook Access**: Available via `useFirebase().activeWebhook`
- **Fallback Strategy**: Maintains current suggestions as fallback

### Firebase Integration Points
- **Context**: `FirebaseContext` provides `activeWebhook` data
- **Authentication**: Uses `useFirestoreAuth` for user management
- **Pattern**: Following existing hooks like `useFirestoreConfig` and `useFirestoreChat`

## Implementation Plan

### Phase 1: Foundation
1. **Update Types** (`src/lib/firestore/types.ts`)
   - Add `FirestorePromptConfig` interface
   - Export conversion utilities

2. **Create Service Functions** (`src/lib/firestore/prompts.ts`)
   - `getPromptConfig(webhookName: string)`
   - `subscribeToPromptConfig(webhookName: string, callback)`
   - `updatePromptConfig(webhookName: string, config: Partial<FirestorePromptConfig>)`

### Phase 2: Hook Implementation
3. **Create Hook** (`src/lib/hooks/useFirestorePrompts.ts`)
   - Real-time subscription to prompt configuration
   - Caching layer (5-minute TTL)
   - Error handling and loading states
   - Automatic fallback to default suggestions

### Phase 3: UI Integration
4. **Update WelcomeScreen** (`src/components/chat/WelcomeScreen.tsx`)
   - Replace static suggestions with dynamic data
   - Add loading skeleton states
   - Implement error boundaries
   - Update welcome title dynamically

### Phase 4: Enhanced UX
5. **Loading States & Error Handling**
   - Skeleton loading for suggestion cards
   - Graceful degradation on Firebase unavailability
   - User-friendly error messages
   - Retry mechanisms

## Technical Considerations

### Performance Optimizations
- **Caching Strategy**: 5-minute cache to reduce Firestore reads
- **Component Memoization**: Use React.memo for PromptSuggestionCard
- **Debounced Updates**: Prevent excessive requests on webhook changes

### Error Resilience
- **Fallback Hierarchy**:
  1. Cached dynamic suggestions
  2. Fresh dynamic suggestions from Firestore
  3. Hardcoded default suggestions
- **Error Scenarios**:
  - Network unavailable
  - Firebase service down
  - Document not found
  - Malformed data

### Security & Access Control
- **Read Access**: Public read for prompt configurations
- **Write Access**: Admin-only (future admin interface)
- **Data Validation**: Client-side validation for malformed data

## Usage Examples

### For Developers

```typescript
// Using the hook in a component
import { useFirestorePrompts } from '@/lib/hooks/useFirestorePrompts';

function MyComponent() {
  const { activeWebhook } = useFirebase();
  const { 
    promptConfig, 
    loading, 
    error, 
    retry 
  } = useFirestorePrompts(activeWebhook?.name);

  if (loading) return <SkeletonLoader />;
  if (error) return <ErrorFallback onRetry={retry} />;
  
  return (
    <div>
      <h1>{promptConfig.title}</h1>
      {promptConfig.suggestions.map(suggestion => (
        <SuggestionCard key={suggestion} text={suggestion} />
      ))}
    </div>
  );
}
```

### For Administrators

To add/update prompts in Firebase Console:

1. Navigate to Firestore Database
2. Go to `prompts` collection
3. Create/edit document with webhook name as ID
4. Follow the schema structure above

## Testing Strategy

### Unit Tests
- Hook behavior with various webhook states
- Fallback logic when data unavailable
- Cache expiration and refresh logic

### Integration Tests
- End-to-end flow from webhook change to suggestion update
- Error handling scenarios
- Performance under various network conditions

### Manual Testing Checklist
- [ ] Suggestions update when switching webhooks
- [ ] Fallback works when Firebase unavailable
- [ ] Loading states display correctly
- [ ] Error states provide useful feedback
- [ ] Cache prevents excessive API calls

## Future Enhancements

### Admin Interface
- Web-based admin panel for managing prompts
- Bulk import/export functionality
- A/B testing capabilities

### Analytics Integration
- Track suggestion click rates
- Popular suggestion analysis
- User engagement metrics

### Advanced Features
- Localization support for multiple languages
- User-specific suggestion customization
- Machine learning-based suggestion optimization

## Troubleshooting

### Common Issues

#### Prompts Not Loading
1. Check Firebase connection status
2. Verify webhook name matches document ID
3. Confirm Firestore security rules allow read access
4. Check browser console for errors

#### Slow Loading
1. Review caching implementation
2. Check network tab for excessive requests
3. Verify Firestore indexes are configured
4. Monitor cache hit/miss ratios

#### Fallback Not Working
1. Verify default suggestions are properly imported
2. Check error handling logic in hook
3. Test with network disabled
4. Review error boundary implementation

### Debug Commands

```bash
# Check Firestore connection
firebase firestore:rules:list

# Monitor real-time updates
firebase firestore:listen prompts

# Test with local emulator
firebase emulators:start --only firestore
```

## Development Notes

### File Structure
```
src/
├── lib/
│   ├── firestore/
│   │   ├── types.ts (updated)
│   │   └── prompts.ts (new)
│   └── hooks/
│       └── useFirestorePrompts.ts (new)
└── components/
    └── chat/
        └── WelcomeScreen.tsx (updated)
```

### Dependencies
- Existing Firebase SDK (already configured)
- Existing Firestore hooks pattern
- React hooks for state management
- TypeScript for type safety

## Quick Setup Guide

### 1. Add Sample Data to Firestore

To test the feature, add documents to the `prompts` collection in Firebase Console:

#### Example 1: OpenAI GPT4
**Document ID**: `OpenAI GPT4`

**Document Data**:
```json
{
  "webhookName": "OpenAI GPT4",
  "title": "I'm an AI powered chat bot",
  "suggestions": [
    "What is the meaning of life?",
    "Tell me about the latest AI developments",
    "Construct a poem about love.",
    "Explain quantum computing in simple terms",
    "Help me write a professional email",
    "Create a workout plan for beginners"
  ],
  "isActive": true,
  "createdAt": "2024-01-31T10:00:00Z",
  "updatedAt": "2024-01-31T10:00:00Z"
}
```

#### Example 2: MekanikOZ
**Document ID**: `MekanikOZ`

**Document Data**: (See `firestore-data/mekanik-prompts.json`)
```json
{
  "webhookName": "MekanikOZ",
  "title": "I'm an expert AI booking assistant",
  "suggestions": [
    "I want to book my car for annual service",
    "What are the services you offer",
    "Do you do an oil and filter change",
    "What's wrong with my car?"
  ],
  "isActive": true,
  "createdAt": "2024-01-31T10:00:00Z",
  "updatedAt": "2024-01-31T10:00:00Z"
}
```

### 2. Test the Feature

1. Start your development server: `npm run dev`
2. Navigate to the chat interface
3. Switch between different webhooks to see different suggestions
4. Observe loading states, error handling, and fallback behavior

### 3. Firestore Security Rules

Ensure your Firestore security rules allow reading from the `prompts` collection:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow public read access to prompts
    match /prompts/{document} {
      allow read: if true;
      allow write: if request.auth != null; // Authenticated users only
    }
  }
}
```

---

*Last Updated: 2024-01-31*
*Status: ✅ Complete*