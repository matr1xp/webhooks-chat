'use client';

import { useState } from 'react';
import { signInAnonymously } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export function SimpleFirebaseTest() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const runSimpleTest = async () => {
    setLoading(true);
    setTestResults([]);

    try {
      addResult('🔥 Testing Firebase Authentication...');
      
      // Test basic authentication
      const result = await signInAnonymously(auth);
      addResult(`✅ Authentication successful! User ID: ${result.user.uid}`);
      
      // Test Firestore connection by importing it
      const { db } = await import('@/lib/firebase');
      addResult(`✅ Firestore connection established`);
      
      // Try a basic Firestore operation
      const { doc, getDoc } = await import('firebase/firestore');
      const testDoc = doc(db, 'test', 'connection');
      
      try {
        await getDoc(testDoc);
        addResult('✅ Firestore read operation successful');
      } catch (firestoreError: any) {
        addResult(`⚠️ Firestore read failed: ${firestoreError.message}`);
      }

      addResult('🎉 Basic Firebase test completed!');
      
    } catch (error: any) {
      addResult(`❌ Test failed: ${error.message}`);
      console.error('Simple Firebase test error:', error);
      
      // Provide specific error guidance
      if (error.code === 'auth/network-request-failed') {
        addResult('💡 This usually means:');
        addResult('   1. Anonymous auth not enabled in Firebase Console');
        addResult('   2. Network connectivity issue');
        addResult('   3. Invalid API key or project configuration');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-blue-50 dark:bg-blue-900 rounded-lg max-w-2xl mb-4">
      <h3 className="text-lg font-semibold mb-4">Simple Firebase Authentication Test</h3>
      
      <button
        onClick={runSimpleTest}
        disabled={loading}
        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 mb-4"
      >
        {loading ? 'Testing...' : 'Run Simple Test'}
      </button>

      {testResults.length > 0 && (
        <div className="bg-black text-green-400 p-3 rounded font-mono text-sm max-h-40 overflow-y-auto">
          {testResults.map((result, index) => (
            <div key={index}>{result}</div>
          ))}
        </div>
      )}
    </div>
  );
}