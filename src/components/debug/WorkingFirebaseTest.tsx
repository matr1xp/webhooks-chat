'use client';

import { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, setDoc, collection, addDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export function WorkingFirebaseTest() {
  const [user, setUser] = useState<any>(null);
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addResult = (message: string) => {
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  // Listen to auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (user) {
        addResult(`🔐 User authenticated: ${user.uid}`);
      }
    });

    return () => unsubscribe();
  }, []);

  const testIntegratedFirebase = async () => {
    setLoading(true);
    setResults([]);

    try {
      addResult('🔥 Testing integrated Firebase...');

      // Sign in if not already signed in
      if (!user) {
        addResult('📝 Signing in anonymously...');
        await signInAnonymously(auth);
        addResult('✅ Authentication completed');
      } else {
        addResult(`✅ Already authenticated as: ${user.uid}`);
      }

      // Test creating a user document
      if (user || auth.currentUser) {
        const userId = user?.uid || auth.currentUser?.uid;
        addResult('👤 Creating user profile...');
        
        const userDocRef = doc(db, 'users', userId!);
        await setDoc(userDocRef, {
          profile: {
            name: `Test User ${userId!.slice(-6)}`,
            createdAt: new Date(),
          },
          preferences: {
            theme: 'light',
            notifications: true,
          },
          webhooks: {
            webhooks: [],
          },
        });

        addResult('✅ User profile created');

        // Test creating a chat
        addResult('💬 Creating test chat...');
        const chatsRef = collection(db, 'chats');
        const chatDocRef = await addDoc(chatsRef, {
          userId: userId,
          webhookId: 'test-webhook-id',
          name: 'Test Chat Integration',
          messageCount: 0,
          lastActivity: new Date(),
          createdAt: new Date(),
        });

        addResult(`✅ Chat created: ${chatDocRef.id}`);

        // Test creating a message
        addResult('📨 Creating test message...');
        const messagesRef = collection(db, 'messages', chatDocRef.id, 'messages');
        await addDoc(messagesRef, {
          content: 'Hello from integrated Firebase test!',
          type: 'text',
          userId: userId,
          isBot: false,
          status: 'delivered',
          timestamp: new Date(),
        });

        addResult('✅ Message created');
        addResult('🎉 Integrated Firebase test completed successfully!');
        addResult('🔍 Check your Firebase Console to see the data');
      }

    } catch (error: any) {
      addResult(`❌ Integrated test failed: ${error.message}`);
      console.error('Integrated Firebase test error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-orange-50 dark:bg-orange-900 rounded-lg max-w-2xl mb-4">
      <h3 className="text-lg font-semibold mb-4">Working Firebase Integration Test</h3>
      
      <div className="mb-4 text-sm">
        <div><strong>Auth Status:</strong> {user ? '✅ Signed In' : '❌ Not Signed In'}</div>
        <div><strong>User ID:</strong> {user?.uid || 'None'}</div>
      </div>
      
      <button
        onClick={testIntegratedFirebase}
        disabled={loading}
        className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50 mb-4"
      >
        {loading ? 'Testing Integration...' : 'Test Firebase Integration'}
      </button>

      {results.length > 0 && (
        <div className="bg-black text-green-400 p-3 rounded font-mono text-sm max-h-40 overflow-y-auto">
          {results.map((result, index) => (
            <div key={index}>{result}</div>
          ))}
        </div>
      )}
    </div>
  );
}