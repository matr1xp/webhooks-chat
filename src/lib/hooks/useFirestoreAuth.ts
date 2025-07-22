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
      
      console.log('✅ Google Sign-In successful:', {
        uid: result.user.uid,
        name: userInfo.name,
        email: userInfo.email,
        isNewUser: (result as any).additionalUserInfo?.isNewUser
      });
      
    } catch (err: any) {
      console.warn('⚠️ Google Sign-In failed, falling back to anonymous:', err.message);
      
      // If Google Sign-In fails due to configuration, fall back to anonymous
      if (err.code === 'auth/operation-not-allowed') {
        try {
          await signInAnonymously(auth);
          console.log('✅ Fallback anonymous sign-in successful');
          setError('Google Sign-In not configured. Using anonymous authentication.');
        } catch (anonymousErr: any) {
          setError('Authentication failed completely. Please contact support.');
          console.error('❌ Anonymous fallback also failed:', anonymousErr);
        }
      } else {
        setError(err.message);
        console.error('❌ Google Sign-In failed:', err);
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
      
      console.log('✅ Anonymous Sign-In successful:', {
        uid: result.user.uid,
        isAnonymous: result.user.isAnonymous
      });
      
    } catch (err: any) {
      setError(err.message);
      console.error('❌ Anonymous Sign-In failed:', err);
    } finally {
      setLoading(false);
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      setError(null);
      console.log('🚪 Signing out user:', user?.uid?.slice(-6));
      
      // Clear user profile immediately
      setUserProfile(null);
      
      // Sign out from Firebase
      await firebaseSignOut(auth);
      
      console.log('✅ User signed out successfully');
    } catch (err: any) {
      setError(err.message);
      console.error('❌ Error signing out:', err);
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
        
        console.log('🔑 Auth state changed:', { 
          action: isUserSwitch ? 'USER_SWITCH' : isSignOut ? 'SIGN_OUT' : isSignIn ? 'SIGN_IN' : 'REFRESH',
          fromUserId: currentUserId?.slice(-6) || null,
          toUserId: newUserId?.slice(-6) || null,
          isAnonymous: firebaseUser?.isAnonymous,
          displayName: firebaseUser?.displayName,
          email: firebaseUser?.email,
          providerId: firebaseUser?.providerData?.[0]?.providerId,
          timestamp: new Date().toISOString()
        });
        
        setUser(firebaseUser);
        
        if (firebaseUser) {
          // Get or create user profile
          let profile = await getUserProfile(firebaseUser.uid);
          console.log('User profile loaded:', { 
            userId: firebaseUser.uid, 
            profileExists: !!profile,
            displayName: firebaseUser.displayName,
            email: firebaseUser.email
          });
          
          if (!profile) {
            console.log('Creating new user profile for Google user:', {
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName,
              email: firebaseUser.email
            });
            
            // Create profile with Google account information
            await createUserProfile(firebaseUser.uid, {
              name: firebaseUser.displayName || `User ${firebaseUser.uid.slice(-6)}`,
              email: firebaseUser.email || undefined,
            });
            
            // Wait a moment and try again
            await new Promise(resolve => setTimeout(resolve, 1000));
            profile = await getUserProfile(firebaseUser.uid);
            console.log('Google user profile created successfully:', !!profile);
          } else {
            console.log('Existing Google user profile found with webhooks:', profile.webhooks?.webhooks?.length || 0);
          }
          
          setUserProfile(profile);
        } else {
          setUserProfile(null);
        }
      } catch (err: any) {
        setError(err.message);
        console.error('Error loading user profile:', err);
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