'use client';

export function FirebaseDebug() {
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  return (
    <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg max-w-2xl mb-4">
      <h3 className="text-lg font-semibold mb-4">Firebase Configuration Debug</h3>
      
      <div className="space-y-2 text-sm">
        <div>
          <strong>API Key:</strong> {firebaseConfig.apiKey ? 
            `${firebaseConfig.apiKey.substring(0, 20)}...` : 
            '❌ Missing'
          }
        </div>
        <div>
          <strong>Auth Domain:</strong> {firebaseConfig.authDomain || '❌ Missing'}
        </div>
        <div>
          <strong>Project ID:</strong> {firebaseConfig.projectId || '❌ Missing'}
        </div>
        <div>
          <strong>Storage Bucket:</strong> {firebaseConfig.storageBucket || '❌ Missing'}
        </div>
        <div>
          <strong>Messaging Sender ID:</strong> {firebaseConfig.messagingSenderId || '❌ Missing'}
        </div>
        <div>
          <strong>App ID:</strong> {firebaseConfig.appId ? 
            `${firebaseConfig.appId.substring(0, 20)}...` : 
            '❌ Missing'
          }
        </div>
      </div>

      <div className="mt-4 p-3 bg-yellow-100 dark:bg-yellow-900 rounded">
        <p className="text-sm">
          <strong>Note:</strong> All values should show data, not &quot;❌ Missing&quot;. 
          If any are missing, check your .env.local file and restart the dev server.
        </p>
      </div>
    </div>
  );
}