'use client';

export function EnvDebug() {
  // Check if running in browser
  if (typeof window === 'undefined') {
    return <div>Loading environment check...</div>;
  }

  const envVars = {
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  const missingVars = Object.entries(envVars).filter(([key, value]) => !value);
  const presentVars = Object.entries(envVars).filter(([key, value]) => value);

  return (
    <div className="p-4 bg-yellow-50 dark:bg-yellow-900 rounded-lg max-w-2xl mb-4">
      <h3 className="text-lg font-semibold mb-4">Environment Variables Debug</h3>
      
      <div className="space-y-2 text-sm">
        <div className="font-semibold">Present Variables ({presentVars.length}/6):</div>
        {presentVars.map(([key, value]) => (
          <div key={key} className="text-green-600">
            ✅ {key}: {typeof value === 'string' ? `${value.substring(0, 20)}...` : 'undefined'}
          </div>
        ))}
        
        {missingVars.length > 0 && (
          <>
            <div className="font-semibold mt-4 text-red-600">Missing Variables ({missingVars.length}):</div>
            {missingVars.map(([key]) => (
              <div key={key} className="text-red-600">
                ❌ {key}
              </div>
            ))}
          </>
        )}
      </div>

      <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded text-xs">
        <div><strong>Node Environment:</strong> {process.env.NODE_ENV}</div>
        <div><strong>All env keys starting with NEXT_PUBLIC_FIREBASE:</strong></div>
        <div className="font-mono">
          {Object.keys(process.env).filter(key => key.startsWith('NEXT_PUBLIC_FIREBASE')).join(', ') || 'None found'}
        </div>
      </div>

      {missingVars.length > 0 && (
        <div className="mt-4 p-3 bg-red-100 dark:bg-red-900 rounded">
          <p className="text-sm font-semibold">Fix Steps:</p>
          <ol className="text-xs mt-2 space-y-1">
            <li>1. Check that .env.local exists in project root</li>
            <li>2. Restart development server completely</li>
            <li>3. Ensure no spaces around = in .env.local</li>
            <li>4. Ensure no quotes around values in .env.local</li>
          </ol>
        </div>
      )}
    </div>
  );
}