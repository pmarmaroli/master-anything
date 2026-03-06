import { useState, useCallback } from 'react';
import { useChat } from '../hooks/useChat';
import { ChatArea } from '../components/ChatArea';
import { MessageInput } from '../components/MessageInput';
import { ProgressSidebar } from '../components/ProgressSidebar';
import { SessionSummary } from '../components/SessionSummary';
import { MasteryBadge } from '../components/MasteryBadge';
import { PhaseIndicator } from '../components/PhaseIndicator';
import { AboutModal } from '../components/AboutModal';
import { ProgressModal } from '../components/ProgressModal';

export function ChatPage() {
  const { messages, progress, isLoading, sendMessage, language, setLanguage } = useChat();
  const [masteryBadgeConcept, setMasteryBadgeConcept] = useState<string | null>(null);
  const [listeningMode, setListeningMode] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showProgress, setShowProgress] = useState(false);

  const handleDismissBadge = useCallback(() => setMasteryBadgeConcept(null), []);

  return (
    <div className="h-dvh flex flex-col bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 overflow-x-hidden">
      {/* Header */}
      <header className="border-b border-amber-200/60 px-4 sm:px-6 py-3 flex items-center justify-between bg-white/70 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <span className="text-2xl" role="img" aria-label="brain">🧠</span>
          <h1 className="text-lg font-bold text-amber-900 hidden sm:block">Master Anything</h1>
          <button
            onClick={() => setShowAbout(true)}
            className="w-7 h-7 rounded-full bg-amber-100 border border-amber-300 text-amber-700 text-xs font-bold hover:bg-amber-200 transition-colors"
            title={language === 'fr' ? 'A propos' : 'About'}
          >
            ?
          </button>
          {progress && (
            <PhaseIndicator phase={progress.currentPhase} step={progress.currentStep} />
          )}
        </div>
        <div className="flex items-center gap-3">
          {progress?.currentConcept && (
            <span className="text-sm text-amber-700/70 hidden sm:block">{progress.currentConcept}</span>
          )}
          <button
            onClick={() => setShowProgress(true)}
            className="lg:hidden w-7 h-7 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-700 text-xs font-bold hover:bg-emerald-200 transition-colors"
            title={language === 'fr' ? 'Progression' : 'Progress'}
          >
            %
          </button>
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
          <MessageInput onSend={sendMessage} disabled={isLoading || !language} listeningMode={listeningMode} language={language} />
        </div>

        {/* Sidebar */}
        <ProgressSidebar progress={progress} />
      </div>

      <AboutModal show={showAbout} onClose={() => setShowAbout(false)} language={language} />
      <ProgressModal show={showProgress} onClose={() => setShowProgress(false)} progress={progress} language={language} />

      {/* Mastery celebration overlay */}
      <MasteryBadge
        concept={masteryBadgeConcept || ''}
        show={!!masteryBadgeConcept}
        onDismiss={handleDismissBadge}
      />
    </div>
  );
}
