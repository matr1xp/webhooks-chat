'use client';

import { useState } from 'react';
import { ChatContainer } from '@/components/chat/ChatContainer';
import { ChatSidebar } from '@/components/ui/ChatSidebar';
import { ConfigModal } from '@/components/ui/ConfigModal';

export default function Home() {
  const [showConfig, setShowConfig] = useState(false);

  return (
    <main className="h-screen flex overflow-hidden">
      {/* Sidebar */}
      <ChatSidebar onConfigOpen={() => setShowConfig(true)} />
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <ChatContainer />
      </div>

      {/* Configuration Modal */}
      <ConfigModal
        isOpen={showConfig}
        onClose={() => setShowConfig(false)}
      />
    </main>
  );
}