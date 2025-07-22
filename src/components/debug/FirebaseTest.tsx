'use client';

import { useFirebase } from '@/contexts/FirebaseContext';
import { useEffect, useState } from 'react';

export function FirebaseTest() {
  const { 
    user, 
    userProfile, 
    authLoading, 
    signInWithGoogle,
    signInAnonymous, 
    addMessage,
    activeWebhook,
    webhooks,
    addWebhook 
  } = useFirebase();
  
  const [testResults, setTestResults] = useState<string[]>([]);

  const addTestResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const runFirebaseTest = async () => {
    try {
      addTestResult('🔥 Starting Firebase test...');
      
      // Test authentication
      if (!user) {
        addTestResult('📝 Signing in anonymously...');
        await signInAnonymous();
        addTestResult('✅ Anonymous sign-in successful');
      } else {
        addTestResult(`✅ Already signed in as: ${user.uid}`);
      }

      // Wait for user profile to be loaded
      if (!userProfile) {
        addTestResult('⏳ Waiting for user profile to load...');
        // Force a reload and wait
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        if (!userProfile) {
          addTestResult('❌ User profile still not loaded');
          addTestResult(`Debug: User: ${user ? 'exists' : 'null'}, UserProfile: ${userProfile ? 'exists' : 'null'}`);
          return;
        }
        addTestResult('✅ User profile loaded');
      } else {
        addTestResult('✅ User profile already loaded');
      }

      // Test webhook creation
      if (webhooks.length === 0) {
        addTestResult('🔗 Creating test webhook...');
        await addWebhook(
          'Test Webhook',
          'https://test.example.com/webhook',
          'test-secret'
        );
        addTestResult('✅ Test webhook created');
      } else {
        addTestResult(`✅ Found ${webhooks.length} existing webhook(s)`);
      }

      // Test message creation (only if we have an active webhook)
      if (activeWebhook) {
        addTestResult('💬 Creating test message...');
        await addMessage('Hello Firestore! This is a test message.');
        addTestResult('✅ Test message created');
      } else {
        addTestResult('⚠️ No active webhook - skipping message test');
      }

      addTestResult('🎉 Firebase test completed successfully!');
    } catch (error: any) {
      addTestResult(`❌ Firebase test failed: ${error.message}`);
      console.error('Firebase test error:', error);
    }
  };

  if (authLoading) {
    return <div className="p-4 bg-yellow-100 rounded">Loading Firebase...</div>;
  }

  return (
    <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg max-w-2xl">
      <h3 className="text-lg font-semibold mb-4">Firebase Connection Test</h3>
      
      <div className="mb-4">
        <p><strong>Auth Status:</strong> {user ? '✅ Signed In' : '❌ Not Signed In'}</p>
        <p><strong>User ID:</strong> {user?.uid || 'None'}</p>
        <p><strong>User Profile:</strong> {userProfile ? '✅ Loaded' : '❌ Not Loaded'}</p>
        <p><strong>Webhooks:</strong> {webhooks.length} configured</p>
        <p><strong>Active Webhook:</strong> {activeWebhook?.name || 'None'}</p>
      </div>

      <button
        onClick={runFirebaseTest}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mb-4"
      >
        Run Firebase Test
      </button>

      {testResults.length > 0 && (
        <div className="bg-black text-green-400 p-3 rounded font-mono text-sm max-h-60 overflow-y-auto">
          {testResults.map((result, index) => (
            <div key={index}>{result}</div>
          ))}
        </div>
      )}
    </div>
  );
}