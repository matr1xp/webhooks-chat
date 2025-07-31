import { useState, useEffect } from 'react';
import { 
  User as FirebaseUser,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInAnonymously,
  GoogleAuthProvider,
  OAuthProvider,
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
  signInWithApple: () => Promise<void>;
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

  // Initialize Apple Auth Provider
  const appleProvider = new OAuthProvider('apple.com');
  
  // Configure Apple Auth Provider
  appleProvider.addScope('email');
  appleProvider.addScope('name');

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

  // Sign in with Apple
  const signInWithApple = async () => {
    try {
      setError(null);
      setLoading(true);
      
      // Enhanced mobile detection - use redirect for all mobile browsers and embedded browsers
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isEmbeddedBrowser = (window.navigator as any)?.standalone !== undefined || // iOS Safari PWA
                               /FBAN|FBAV|Instagram|Line|Twitter|WeChat|MicroMessenger/i.test(navigator.userAgent); // Social media browsers
      const shouldUseRedirect = isMobile || isEmbeddedBrowser;
      
      console.log('🍎 Starting Apple Sign-In:', {
        isMobile,
        isEmbeddedBrowser,
        shouldUseRedirect,
        userAgent: navigator.userAgent
      });
      
      let result;
      if (shouldUseRedirect) {
        // For mobile and embedded browsers, use redirect flow which is more reliable
        console.log('🔄 Using redirect flow for Apple Sign-In');
        await signInWithRedirect(auth, appleProvider);
        // Note: The redirect result will be handled in the auth state listener
        // Don't set loading to false here as the redirect will reload the page
        return;
      } else {
        // For desktop browsers, use popup
        console.log('🪟 Using popup flow for Apple Sign-In');
        result = await signInWithPopup(auth, appleProvider);
      }
      
      if (result) {
        // Extract user info from Apple profile
        // Apple might not provide displayName, so we'll use email or generate a name
        const userInfo = {
          name: result.user.displayName || 
                result.user.email?.split('@')[0] ||
                `User ${result.user.uid.slice(-6)}`,
          email: result.user.email || undefined,
        };
        
        // Create or update user profile
        await createUserProfile(result.user.uid, userInfo);
      }
      
    } catch (err: any) {
      // If Apple Sign-In fails, provide helpful error message
      if (err.code === 'auth/operation-not-allowed') {
        setError('Apple Sign-In not configured in Firebase Console. Contact support or try anonymous sign-in.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in was cancelled. Please try again.');
      } else if (err.code === 'auth/popup-blocked') {
        setError('Popup blocked. Please allow popups for this site and try again.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError('Domain not authorized for Apple Sign-In. Please contact support.');
      } else if (err.code === 'auth/invalid-credential') {
        setError('Apple Sign-In configuration error. Please ensure you\'re signed into iCloud with 2FA enabled.');
      } else if (err.message?.includes('redirect')) {
        setError('Apple Sign-In redirect failed. Please ensure you\'re signed into iCloud and try again.');
      } else {
        setError(err.message || 'Apple Sign-In failed. Please ensure you\'re signed into iCloud with 2FA enabled and try again.');
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
    let mounted = true;
    let redirectHandled = false;
    
    // Handle redirect results for Apple Sign-In (mobile compatibility)
    const handleRedirectResult = async () => {
      if (redirectHandled) return;
      
      try {
        console.log('Checking for redirect result...');
        const result = await getRedirectResult(auth);
        redirectHandled = true;
        
        if (result && mounted) {
          // This was a redirect-based sign-in (e.g., Apple Sign-In on mobile)
          console.log('✅ Redirect result received:', {
            email: result.user?.email,
            uid: result.user?.uid,
            isAnonymous: result.user?.isAnonymous,
            provider: result.providerId
          });
          
          // Clear any existing errors since redirect was successful
          setError(null);
        } else if (mounted) {
          console.log('ℹ️ No redirect result found');
        }
      } catch (error: any) {
        console.error('❌ Redirect result error:', error);
        if (mounted) {
          if (error.code === 'auth/operation-not-allowed') {
            setError('Apple Sign-In not configured. Contact support or try anonymous sign-in.');
          } else if (error.code === 'auth/unauthorized-domain') {
            setError('Domain not authorized for Apple Sign-In. Please contact support.');
          } else if (error.code === 'auth/invalid-credential') {
            setError('Apple Sign-In configuration error. Please ensure Apple Sign-In is properly configured.');
          } else {
            setError(error.message || 'Authentication failed after redirect.');
          }
        }
      }
    };

    // Small delay to ensure DOM is ready, then handle redirect results
    const timeoutId = setTimeout(handleRedirectResult, 500);

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
            // Create profile with authentication provider information
            const userInfo = {
              name: firebaseUser.displayName || 
                    firebaseUser.email?.split('@')[0] ||
                    `User ${firebaseUser.uid.slice(-6)}`,
              email: firebaseUser.email || undefined,
            };
            
            try {
              await createUserProfile(firebaseUser.uid, userInfo);
              
              // Wait a moment and try again
              await new Promise(resolve => setTimeout(resolve, 1000));
              profile = await getUserProfile(firebaseUser.uid);
            } catch (error) {
              console.warn('Profile creation failed:', error);
            }
            
            // Always ensure we have a profile object to prevent undefined state
            if (!profile) {
              console.warn('Failed to create user profile, using fallback profile');
              profile = {
                id: firebaseUser.uid,
                name: userInfo.name,
                email: userInfo.email,
                createdAt: new Date(),
                updatedAt: new Date(),
              } as any;
            }
          }
          
          console.log('User profile set:', profile ? (profile as any).name : 'none');
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

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, []);

  return {
    user,
    userProfile,
    loading,
    error,
    signInWithGoogle,
    signInWithApple,
    signInAnonymous,
    signOut,
    isSignedIn: !!user && !user.isAnonymous,
  };
};