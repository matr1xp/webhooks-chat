'use client';

import { useState } from 'react';
import { useFirebase } from '@/contexts/FirebaseContext';

export function FirebaseQuickSetup() {
  const {
    user,
    signInWithGoogle,
    signInAnonymous,
    webhooks,
    activeWebhook,
    addWebhook,
    setActiveWebhook,
    chats,
    activeChat,
    createNewChat,
    setActiveChat,
  } = useFirebase();

  const [loading, setLoading] = useState(false);

  const quickSetup = async () => {
    try {
      setLoading(true);
      
      // 1. Sign in user
      if (!user) {
        await signInAnonymous();
      }

      // 2. Create a webhook if none exists
      if (webhooks.length === 0) {
        await addWebhook(
          'Test Webhook',
          'https://your-n8n-instance.com/webhook/test',
          'test-secret'
        );
      }

      // 3. Set active webhook if not set
      if (!activeWebhook && webhooks.length > 0) {
        await setActiveWebhook(webhooks[0].id);
      }

      // 4. Create a chat if none exists
      if (chats.length === 0 && activeWebhook) {
        const newChat = await createNewChat(
          activeWebhook.id,
          'My First Firebase Chat'
        );
        setActiveChat(newChat.id);
      }

      // 5. Set active chat if not set
      if (!activeChat && chats.length > 0) {
        setActiveChat(chats[0].id);
      }

    } catch (error) {
      console.error('Quick setup failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 bg-white dark:bg-slate-800 p-4 rounded-lg shadow-lg border max-w-sm">
      <h3 className="font-semibold mb-2">Firebase Chat Setup</h3>
      
      <div className="space-y-2 text-sm mb-4">
        <div className="flex justify-between">
          <span>User:</span>
          <span className={user ? 'text-green-600' : 'text-red-600'}>
            {user ? '✅ Signed In' : '❌ Not Signed In'}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Webhooks:</span>
          <span className={webhooks.length > 0 ? 'text-green-600' : 'text-red-600'}>
            {webhooks.length > 0 ? `✅ ${webhooks.length}` : '❌ None'}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Active Webhook:</span>
          <span className={activeWebhook ? 'text-green-600' : 'text-red-600'}>
            {activeWebhook ? '✅ Set' : '❌ None'}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Chats:</span>
          <span className={chats.length > 0 ? 'text-green-600' : 'text-red-600'}>
            {chats.length > 0 ? `✅ ${chats.length}` : '❌ None'}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Active Chat:</span>
          <span className={activeChat ? 'text-green-600' : 'text-red-600'}>
            {activeChat ? '✅ Set' : '❌ None'}
          </span>
        </div>
      </div>

      <button
        onClick={quickSetup}
        disabled={loading}
        className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? 'Setting up...' : 'Quick Setup Chat'}
      </button>

      <p className="text-xs text-gray-500 mt-2">
        This will create a test webhook and chat so you can try Firebase chat functionality.
      </p>
    </div>
  );
}