'use client';

import { useState } from 'react';
import { useFirebase } from '@/contexts/FirebaseContext';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { Chrome, Loader2, ShieldCheck } from 'lucide-react';
import Image from 'next/image';

interface GoogleSignInProps {
  className?: string;
}

export function GoogleSignIn({ className }: GoogleSignInProps) {
  const { signInWithGoogle, signInAnonymous, authLoading, authError } = useFirebase();
  const { theme } = useTheme();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [showFallback, setShowFallback] = useState(false);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Sign-in error:', error);
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
      console.error('Anonymous sign-in error:', error);
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
                  alt="WebhookIQ Logo"
                  width={64}
                  height={64}
                  className="rounded-2xl shadow-lg"
                  style={{ width: 'auto', height: '64px' }}
                />
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white dark:border-slate-900 shadow-sm"></div>
              </div>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-bold mb-2" style={{ 
              color: theme === 'light' ? '#0f172a' : '#f1f5f9' 
            }}>
              Welcome to WebhookIQ
            </h1>
            
            <p className="text-sm sm:text-base" style={{ 
              color: theme === 'light' ? '#64748b' : '#94a3b8' 
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
            style={{ 
              color: theme === 'light' ? '#374151' : '#e2e8f0' 
            }}
          >
            {authLoading || isSigningIn ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <Chrome className="w-5 h-5 text-[#4285f4]" />
                <span>Continue with Google</span>
              </>
            )}
          </button>

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
                  color: theme === 'light' ? '#6b7280' : '#9ca3af' 
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
                color: theme === 'light' ? '#9ca3af' : '#6b7280' 
              }}>
                Limited features • Data may not persist
              </p>
            </div>
          )}

          {/* Security Badge */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-center space-x-2 text-xs" style={{ 
              color: theme === 'light' ? '#6b7280' : '#9ca3af' 
            }}>
              <ShieldCheck className="w-4 h-4 text-green-500" />
              <span>Secured by Firebase Authentication</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs" style={{ 
            color: theme === 'light' ? '#9ca3af' : '#6b7280' 
          }}>
            Your data is encrypted and stored securely. We never share your information.
          </p>
        </div>
      </div>
    </div>
  );
}