import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';

// Get environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase app (avoid duplicate initialization)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize services
export const db = getFirestore(app);
export const auth = getAuth(app);

// Set authentication persistence to local storage with error handling
// This ensures authenticated users persist across browser sessions and redirects
if (typeof window !== 'undefined') {
  // Check if localStorage is available before setting persistence
  try {
    const testKey = '__firebase-auth-test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    
    // If localStorage is available, set persistence
    setPersistence(auth, browserLocalPersistence).catch((error) => {
      console.warn('Failed to set Firebase auth persistence, continuing without persistence:', error);
    });
  } catch (error) {
    console.warn('localStorage not available for Firebase auth persistence:', error);
  }
}

export default app;