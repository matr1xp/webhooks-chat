'use client';

import { useState } from 'react';
import { useFirebase } from '@/contexts/FirebaseContext';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { LogIn, Loader2, ShieldCheck } from 'lucide-react';
import Image from 'next/image';

interface AuthPageProps {
  className?: string;
}

export function AuthPage({ className }: AuthPageProps) {
  const { signInWithGoogle, signInWithApple, signInAnonymous, authLoading, authError } = useFirebase();
  const { theme } = useTheme();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [showFallback, setShowFallback] = useState(false);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      setShowFallback(true);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleAppleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await signInWithApple();
    } catch (error) {
      setShowFallback(true);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleAnonymousSignIn = async () => {
    setIsSigningIn(true);
    try {
      await signInAnonymous();
    } catch (error) {
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className={cn(
      'min-h-screen flex items-center justify-center p-4',
      'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50',
      'dark:from-slate-950 dark:via-slate-900 dark:to-slate-800',
      className
    )}>
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDEyNywgMTI3LCAxMjcsIDAuMDMpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-40 dark:opacity-20"></div>
      
      <div className="relative z-10 w-full max-w-md">
        {/* Main Sign In Card */}
        <div className="backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 rounded-3xl shadow-2xl border border-white/20 dark:border-slate-700/50 p-8 sm:p-10">
          {/* Logo and Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <Image
                  src="/logo.png"
                  alt="ChatAI Logo"
                  width={64}
                  height={64}
                  className="rounded-2xl shadow-lg"
                  style={{ width: 'auto', height: '64px' }}
                />
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white dark:border-slate-900 shadow-sm"></div>
              </div>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-[#475569] dark:text-[#e2e8f0]">
              Welcome to ChatAI
            </h1>
            
            <p className="text-sm sm:text-base" style={{ 
              color: theme === 'light' ? '#475569' : '#94a3b8' 
            }}>
              Sign in to access your chat interface and n8n webhook integrations
            </p>
          </div>

          {/* Error Message */}
          {authError && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50">
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
                  <span className="text-white text-xs">!</span>
                </div>
                <p className="text-sm font-medium text-red-700 dark:text-red-300">
                  {authError}
                </p>
              </div>
              {authError.includes('not configured') && (
                <div className="mt-3 text-xs text-red-600 dark:text-red-400">
                  <p>Google Sign-In needs to be enabled in Firebase Console.</p>
                  <p className="mt-1">You can continue with anonymous access below.</p>
                </div>
              )}
            </div>
          )}

          {/* Sign In Buttons */}
          <div className="space-y-3">
            {/* Google Sign In Button */}
            <button
              onClick={handleSignIn}
              disabled={authLoading || isSigningIn}
              className={cn(
                'w-full flex items-center justify-center space-x-3 px-6 py-4 rounded-xl font-medium text-base transition-all duration-300',
                'bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600',
                'hover:bg-gray-50 dark:hover:bg-slate-700 hover:border-gray-400 dark:hover:border-slate-500',
                'focus:outline-none focus:ring-4 focus:ring-blue-500/25',
                'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-slate-800',
                'shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]'
              )}
            >
              {authLoading || isSigningIn ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5 text-[#153853] dark:text-[#e2e8f0]" />
                  <span className="text-[#153853] dark:text-[#e2e8f0]">
                    Continue with Google
                  </span>
                </>
              )}
            </button>

            {/* Apple Sign In Button */}
            <button
              onClick={handleAppleSignIn}
              disabled={authLoading || isSigningIn}
              className={cn(
                'w-full flex items-center justify-center space-x-3 px-6 py-4 rounded-xl font-medium text-base transition-all duration-300',
                'bg-black dark:bg-white border border-black dark:border-white',
                'hover:bg-gray-900 dark:hover:bg-gray-100 hover:border-gray-900 dark:hover:border-gray-100',
                'focus:outline-none focus:ring-4 focus:ring-gray-500/25',
                'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-black dark:disabled:hover:bg-white',
                'shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]'
              )}
            >
              {authLoading || isSigningIn ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-white dark:text-black" />
                  <span className="text-white dark:text-black">Signing in...</span>
                </>
              ) : (
                <>
                  {/* Apple logo SVG */}
                  <svg className="w-5 h-5 text-white dark:text-black" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                  <span className="text-white dark:text-black">
                    Continue with Apple
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Anonymous Fallback Button */}
          {(authError?.includes('not configured') || showFallback) && (
            <div className="mt-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-slate-600"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-3 bg-white dark:bg-slate-900 text-gray-500 dark:text-slate-400">
                    or
                  </span>
                </div>
              </div>
              
              <button
                onClick={handleAnonymousSignIn}
                disabled={authLoading || isSigningIn}
                className={cn(
                  'w-full mt-4 flex items-center justify-center space-x-3 px-6 py-3 rounded-xl font-medium text-sm transition-all duration-300',
                  'bg-gray-100 dark:bg-slate-700 border border-gray-200 dark:border-slate-600',
                  'hover:bg-gray-200 dark:hover:bg-slate-600 hover:border-gray-300 dark:hover:border-slate-500',
                  'focus:outline-none focus:ring-4 focus:ring-gray-500/25',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
                style={{ 
                  color: theme === 'light' ? '#4b5563' : '#9ca3af' 
                }}
              >
                {authLoading || isSigningIn ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Continue Anonymously</span>
                  </>
                )}
              </button>
              
              <p className="mt-2 text-xs text-center" style={{ 
                color: theme === 'light' ? '#6b7280' : '#9ca3af' 
              }}>
                Limited features • Data may not persist
              </p>
            </div>
          )}

          {/* Security Badge */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-center space-x-2 text-xs" style={{ 
              color: theme === 'light' ? '#4b5563' : '#9ca3af' 
            }}>
              <ShieldCheck className="w-4 h-4 text-green-500" />
              <span>Secured by Firebase Authentication</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs" style={{ 
            color: theme === 'light' ? '#6b7280' : '#9ca3af' 
          }}>
            Your data is encrypted and stored securely. We never share your information.
          </p>
        </div>
      </div>
    </div>
  );
}