'use client';

import { useState } from 'react';

export function DirectFirebaseTest() {
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addResult = (message: string) => {
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const runDirectTest = async () => {
    setLoading(true);
    setResults([]);

    try {
      addResult('🔥 Starting direct Firebase test...');

      // Test environment variables directly
      const envVars = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      };

      addResult(`📋 Env check: ${Object.values(envVars).every(v => v) ? 'All present' : 'Some missing'}`);

      // Import Firebase modules directly
      const { initializeApp } = await import('firebase/app');
      const { getAuth, signInAnonymously } = await import('firebase/auth');
      const { getFirestore, doc, setDoc } = await import('firebase/firestore');

      addResult('📦 Firebase modules imported successfully');

      // Initialize Firebase directly
      const firebaseConfig = {
        apiKey: envVars.apiKey,
        authDomain: envVars.authDomain,
        projectId: envVars.projectId,
        storageBucket: envVars.storageBucket,
        messagingSenderId: envVars.messagingSenderId,
        appId: envVars.appId,
      };

      const app = initializeApp(firebaseConfig, 'test-app');
      const auth = getAuth(app);
      const db = getFirestore(app);

      addResult('🚀 Firebase app initialized');

      // Test authentication
      const userCredential = await signInAnonymously(auth);
      addResult(`✅ Authentication successful: ${userCredential.user.uid}`);

      // Test Firestore write
      const testDocRef = doc(db, 'test', 'direct-test');
      await setDoc(testDocRef, {
        message: 'Direct Firebase test successful',
        timestamp: new Date().toISOString(),
        userId: userCredential.user.uid,
      });

      addResult('✅ Firestore write successful');
      addResult('🎉 Direct Firebase test completed successfully!');

    } catch (error: any) {
      addResult(`❌ Direct test failed: ${error.message}`);
      addResult(`Error code: ${error.code || 'unknown'}`);
      console.error('Direct Firebase test error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-green-50 dark:bg-green-900 rounded-lg max-w-2xl mb-4">
      <h3 className="text-lg font-semibold mb-4">Direct Firebase Test (Isolated)</h3>
      
      <button
        onClick={runDirectTest}
        disabled={loading}
        className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50 mb-4"
      >
        {loading ? 'Testing...' : 'Run Direct Test'}
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