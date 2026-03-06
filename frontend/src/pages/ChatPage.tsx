import { useState, useCallback } from 'react';
import { useChat } from '../hooks/useChat';
import { ChatArea } from '../components/ChatArea';
import { MessageInput } from '../components/MessageInput';
import { ProgressSidebar } from '../components/ProgressSidebar';
import { SessionSummary } from '../components/SessionSummary';
import { MasteryBadge } from '../components/MasteryBadge';
import { PhaseIndicator } from '../components/PhaseIndicator';

export function ChatPage() {
  const { messages, progress, isLoading, sendMessage } = useChat();
  const [masteryBadgeConcept, setMasteryBadgeConcept] = useState<string | null>(null);

  const handleDismissBadge = useCallback(() => setMasteryBadgeConcept(null), []);

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 px-6 py-3 flex items-center justify-between bg-white">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-gray-800">Master Anything</h1>
          {progress && (
            <PhaseIndicator phase={progress.currentPhase} step={progress.currentStep} />
          )}
        </div>
        {progress?.currentConcept && (
          <span className="text-sm text-gray-500">{progress.currentConcept}</span>
        )}
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat column */}
        <div className="flex-1 flex flex-col">
          <ChatArea messages={messages} isLoading={isLoading} />
          {progress && <SessionSummary progress={progress} />}
          <MessageInput onSend={sendMessage} disabled={isLoading} />
        </div>

        {/* Sidebar */}
        <ProgressSidebar progress={progress} />
      </div>

      {/* Mastery celebration overlay */}
      <MasteryBadge
        concept={masteryBadgeConcept || ''}
        show={!!masteryBadgeConcept}
        onDismiss={handleDismissBadge}
      />
    </div>
  );
}
