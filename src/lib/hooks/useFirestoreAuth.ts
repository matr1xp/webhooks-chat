import { useState, useEffect } from 'react';
import { 
  User as FirebaseUser,
  signInWithPopup,
  signInAnonymously,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut as firebaseSignOut
} from 'firebase/auth';
import { auth } from '../firebase';
import { createUserProfile, getUserProfile } from '../firestore/users';
import type { FirestoreUser } from '../firestore/types';

interface UseFirestoreAuthReturn {
  user: FirebaseUser | null;
  userProfile: FirestoreUser | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signInAnonymous: () => Promise<void>;
  signOut: () => Promise<void>;
  isSignedIn: boolean;
}

export const useFirestoreAuth = (): UseFirestoreAuthReturn => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<FirestoreUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authRestored, setAuthRestored] = useState(false);

  // Initialize Google Auth Provider
  const googleProvider = new GoogleAuthProvider();
  
  // Configure Google Auth Provider
  googleProvider.setCustomParameters({
    prompt: 'select_account'
  });

  // Sign in with Google (with fallback to anonymous)
  const signInWithGoogle = async () => {
    try {
      setError(null);
      setLoading(true);
      
      const result = await signInWithPopup(auth, googleProvider);
      
      // Extract user info from Google profile
      const userInfo = {
        name: result.user.displayName || `User ${result.user.uid.slice(-6)}`,
        email: result.user.email || undefined,
      };
      
      // Create or update user profile
      await createUserProfile(result.user.uid, userInfo);
      
      
    } catch (err: any) {
      
      // If Google Sign-In fails due to configuration, fall back to anonymous
      if (err.code === 'auth/operation-not-allowed') {
        try {
          await signInAnonymously(auth);
          setError('Google Sign-In not configured. Using anonymous authentication.');
        } catch (anonymousErr: any) {
          setError('Authentication failed completely. Please contact support.');
        }
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Sign in anonymously (fallback method)
  const signInAnonymous = async () => {
    try {
      setError(null);
      setLoading(true);
      
      const result = await signInAnonymously(auth);
      
      // Create user profile for anonymous user
      const userInfo = {
        name: `User ${result.user.uid.slice(-6)}`,
      };
      
      await createUserProfile(result.user.uid, userInfo);
      
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      setError(null);
      
      // Clear user profile immediately
      setUserProfile(null);
      
      // Sign out from Firebase
      await firebaseSignOut(auth);
      
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        const currentUserId = user?.uid;
        const newUserId = firebaseUser?.uid;
        const isUserSwitch = currentUserId && newUserId && currentUserId !== newUserId;
        const isSignOut = currentUserId && !newUserId;
        const isSignIn = !currentUserId && newUserId;
        
        
        setUser(firebaseUser);
        
        if (firebaseUser) {
          // Get or create user profile
          let profile = await getUserProfile(firebaseUser.uid);
          
          if (!profile) {
            
            // Create profile with Google account information
            await createUserProfile(firebaseUser.uid, {
              name: firebaseUser.displayName || `User ${firebaseUser.uid.slice(-6)}`,
              email: firebaseUser.email || undefined,
            });
            
            // Wait a moment and try again
            await new Promise(resolve => setTimeout(resolve, 1000));
            profile = await getUserProfile(firebaseUser.uid);
          }
          
          setUserProfile(profile);
        } else {
          setUserProfile(null);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return {
    user,
    userProfile,
    loading,
    error,
    signInWithGoogle,
    signInAnonymous,
    signOut,
    isSignedIn: !!user && !user.isAnonymous,
  };
};