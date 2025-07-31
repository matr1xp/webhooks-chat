'use client';

import { ChevronDown, LogOut, Settings, User } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useFirebase } from '@/contexts/FirebaseContext';
import { useUserPhotoCache } from '@/hooks/useUserPhotoCache';

interface UserProfileDropdownProps {
  className?: string;
}

export function UserProfileDropdown({ 
  className 
}: UserProfileDropdownProps) {
  const { user, userProfile, signOut } = useFirebase();
  const { getCachedPhoto } = useUserPhotoCache();
  const [isOpen, setIsOpen] = useState(false);
  const [cachedAvatar, setCachedAvatar] = useState<string | undefined>(undefined);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isOpen]);

  // Load and cache user photo when user data changes
  useEffect(() => {
    const loadUserPhoto = async () => {
      if (user?.photoURL && user?.uid) {
        try {
          const cached = await getCachedPhoto(user.uid, user.photoURL);
          setCachedAvatar(cached);
        } catch (error) {
          console.warn('Failed to load cached photo:', error);
          // Don't fallback to original URL to avoid 429 errors - use placeholder instead
          setCachedAvatar(undefined);
        }
      } else {
        setCachedAvatar(undefined);
      }
    };

    loadUserPhoto();
  }, [user?.photoURL, user?.uid, getCachedPhoto]);

  // Handle sign out with actual Firebase function
  const handleSignOut = async () => {
    try {
      await signOut();
      setIsOpen(false);
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  const menuItems = [
    { 
      icon: User, 
      label: 'Profile Settings', 
      onClick: () => {
        console.log('Profile Settings clicked');
        setIsOpen(false);
      }
    },
    { 
      icon: Settings, 
      label: 'Account', 
      onClick: () => {
        console.log('Account clicked');
        setIsOpen(false);
      }
    },
    { 
      icon: LogOut, 
      label: 'Sign Out', 
      onClick: handleSignOut
    }
  ];

  // Get actual user data from Firebase
  const userName = user?.displayName || userProfile?.profile?.name || 'Guest';
  const avatar = cachedAvatar;

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      {/* Profile Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors touch-manipulation',
          'hover:bg-slate-100 dark:hover:bg-slate-800',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50',
          'active:scale-95',
          isOpen && 'bg-slate-100 dark:bg-slate-800'
        )}
      >
        {/* Avatar */}
        <div className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center overflow-hidden',
          avatar 
            ? 'bg-transparent border-2 border-slate-300 dark:border-slate-600' 
            : 'bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm font-medium'
        )}>
          {avatar ? (
            <Image 
              src={avatar} 
              alt={userName} 
              width={32}
              height={32}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <span>{userName.charAt(0).toUpperCase()}</span>
          )}
        </div>

        {/* User Name */}
        <span className="text-sm font-medium hidden sm:inline text-slate-700 dark:text-slate-200">
          {userName}
        </span>

        {/* Dropdown Arrow */}
        <ChevronDown 
          className={cn(
            'w-4 h-4 transition-transform text-slate-500 dark:text-slate-400',
            isOpen && 'rotate-180'
          )} 
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 py-1 rounded-lg shadow-lg border z-50 duration-200 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
          {menuItems.map((item, index) => (
            <button
              key={index}
              onClick={item.onClick}
              className={cn(
                'w-full flex items-center space-x-3 px-4 py-2 text-sm text-left transition-colors touch-manipulation',
                'hover:bg-slate-100 dark:hover:bg-slate-700',
                'active:bg-slate-200 dark:active:bg-slate-600',
                'text-slate-700 dark:text-slate-200'
              )}
            >
              <item.icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}