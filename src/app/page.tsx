'use client';

import { useState } from 'react';
import { ChatContainer } from '@/components/chat/ChatContainer';
import { ChatSidebar } from '@/components/ui/ChatSidebar';
import { FirebaseChatSidebar } from '@/components/ui/FirebaseChatSidebar';
import { ConfigModal } from '@/components/ui/ConfigModal';
import { AuthPage } from '@/components/auth/AuthPage';
import { useFirebase } from '@/contexts/FirebaseContext';
import { FirebaseTest } from '@/components/debug/FirebaseTest';
import { FirebaseDebug } from '@/components/debug/FirebaseDebug';
import { EnvDebug } from '@/components/debug/EnvDebug';
import { SimpleFirebaseTest } from '@/components/debug/SimpleFirebaseTest';
import { DirectFirebaseTest } from '@/components/debug/DirectFirebaseTest';
import { WorkingFirebaseTest } from '@/components/debug/WorkingFirebaseTest';

export default function Home() {
  const [showConfig, setShowConfig] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // Feature flag: Switch between Firebase and Redux
  const USE_FIREBASE = true; // Set to false to use Redux instead

  // Always call useFirebase hook (Rules of Hooks requirement)
  const firebase = useFirebase();
  
  // Get Firebase authentication state based on feature flag
  const { isSignedIn, authLoading } = USE_FIREBASE ? firebase : { isSignedIn: true, authLoading: false };

  // Show loading spinner while checking authentication
  if (USE_FIREBASE && authLoading) {
    return (
      <main className="h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </main>
    );
  }

  // Show sign-in page if using Firebase and not authenticated
  if (USE_FIREBASE && !isSignedIn) {
    return <AuthPage />;
  }

  return (
    <main className="h-screen flex overflow-hidden">
      {/* Sidebar */}
      {USE_FIREBASE ? (
        <FirebaseChatSidebar 
          onConfigOpen={() => setShowConfig(true)}
          isMobileOpen={isMobileSidebarOpen}
          onMobileClose={() => setIsMobileSidebarOpen(false)}
          onCollapsedChange={setIsSidebarCollapsed}
        />
      ) : (
        <ChatSidebar 
          onConfigOpen={() => setShowConfig(true)}
          isMobileOpen={isMobileSidebarOpen}
          onMobileClose={() => setIsMobileSidebarOpen(false)}
        />
      )}
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <ChatContainer 
          onMobileSidebarOpen={() => setIsMobileSidebarOpen(true)}
          isSidebarCollapsed={isSidebarCollapsed}
          isMobileSidebarOpen={isMobileSidebarOpen}
        />
      </div>

      {/* Configuration Modal */}
      <ConfigModal
        isOpen={showConfig}
        onClose={() => setShowConfig(false)}
      />

    </main>
  );
}