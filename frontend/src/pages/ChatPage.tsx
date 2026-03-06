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
    <div className="h-screen flex flex-col bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      {/* Header */}
      <header className="border-b border-amber-200/60 px-6 py-3 flex items-center justify-between bg-white/70 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <span className="text-2xl" role="img" aria-label="brain">🧠</span>
          <h1 className="text-lg font-bold text-amber-900">Master Anything</h1>
          {progress && (
            <PhaseIndicator phase={progress.currentPhase} step={progress.currentStep} />
          )}
        </div>
        {progress?.currentConcept && (
          <span className="text-sm text-amber-700/70">{progress.currentConcept}</span>
        )}
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat column */}
        <div className="flex-1 flex flex-col">
          <ChatArea messages={messages} isLoading={isLoading} onSend={sendMessage} />
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
