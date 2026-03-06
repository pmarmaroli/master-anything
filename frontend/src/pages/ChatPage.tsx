import { useState, useCallback } from 'react';
import { useChat } from '../hooks/useChat';
import { ChatArea } from '../components/ChatArea';
import { MessageInput } from '../components/MessageInput';
import { ProgressSidebar } from '../components/ProgressSidebar';
import { SessionSummary } from '../components/SessionSummary';
import { MasteryBadge } from '../components/MasteryBadge';
import { PhaseIndicator } from '../components/PhaseIndicator';

export function ChatPage() {
  const { messages, progress, isLoading, sendMessage, language, setLanguage } = useChat();
  const [masteryBadgeConcept, setMasteryBadgeConcept] = useState<string | null>(null);
  const [listeningMode, setListeningMode] = useState(false);

  const handleDismissBadge = useCallback(() => setMasteryBadgeConcept(null), []);

  return (
    <div className="h-dvh flex flex-col bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      {/* Header */}
      <header className="border-b border-amber-200/60 px-4 sm:px-6 py-3 flex items-center justify-between bg-white/70 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <span className="text-2xl" role="img" aria-label="brain">🧠</span>
          <h1 className="text-lg font-bold text-amber-900 hidden sm:block">Master Anything</h1>
          {progress && (
            <PhaseIndicator phase={progress.currentPhase} step={progress.currentStep} />
          )}
        </div>
        <div className="flex items-center gap-3">
          {progress?.currentConcept && (
            <span className="text-sm text-amber-700/70 hidden sm:block">{progress.currentConcept}</span>
          )}
          <button
            onClick={() => setListeningMode(!listeningMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              listeningMode
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-white/80 border border-amber-200 text-amber-700 hover:bg-amber-50'
            }`}
          >
            {listeningMode ? '🎧 Listening' : '📖 Reading'}
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat column */}
        <div className="flex-1 flex flex-col">
          <ChatArea messages={messages} isLoading={isLoading} onSend={sendMessage} listeningMode={listeningMode} language={language} onLanguageChange={setLanguage} />
          {progress && <SessionSummary progress={progress} />}
          <MessageInput onSend={sendMessage} disabled={isLoading} listeningMode={listeningMode} language={language} />
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
