import { useState, useCallback, useEffect } from 'react';
import { useChat } from '../hooks/useChat';
import { ChatArea } from '../components/ChatArea';
import { MessageInput } from '../components/MessageInput';
import { ProgressSidebar } from '../components/ProgressSidebar';
import { SessionSummary } from '../components/SessionSummary';
import { MasteryBadge } from '../components/MasteryBadge';
import { PhaseIndicator } from '../components/PhaseIndicator';
import { AboutModal } from '../components/AboutModal';
import { ProgressModal } from '../components/ProgressModal';
import { InventoryModal } from '../components/InventoryModal';
import { BossHPBar } from '../components/BossHPBar';
import { WallDemolition } from '../components/WallDemolition';
import { LootDrop } from '../components/LootDrop';
import { StreakCounter } from '../components/StreakCounter';
import { PixelConfetti } from '../components/PixelConfetti';
import { setSoundEnabled, playBossDamage, playBossDefeated, playLootDrop, playCounterattack, playWallBlock } from '../utils/sounds';
import '../styles/adventure.css';

export function ChatPage() {
  const { messages, progress, isLoading, sendMessage, language, setLanguage, adventureMode, setAdventureMode, lastAdventureEvent } = useChat();
  const [masteryBadgeConcept, setMasteryBadgeConcept] = useState<string | null>(null);
  const [listeningMode, setListeningMode] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [showCounterattack, setShowCounterattack] = useState(false);
  const [showLoot, setShowLoot] = useState(false);
  const [showScreenFlash, setShowScreenFlash] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [streak, setStreak] = useState(0);

  const handleDismissBadge = useCallback(() => setMasteryBadgeConcept(null), []);

  // Toggle sound
  const toggleSound = useCallback(() => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
  }, [soundOn]);

  // React to adventure events — play sounds & trigger animations
  useEffect(() => {
    if (!lastAdventureEvent || !adventureMode) return;
    const ev = lastAdventureEvent.event;

    if (ev === 'boss_damage') {
      playBossDamage();
    } else if (ev === 'boss_defeated') {
      playBossDefeated();
      setTimeout(() => playLootDrop(), 600); // loot sound after victory jingle
      setShowLoot(true);
      setShowScreenFlash(true);
      setTimeout(() => setShowLoot(false), 2500);
      setTimeout(() => setShowScreenFlash(false), 200);
      setStreak(s => s + 1);
    } else if (ev === 'boss_counterattack') {
      playCounterattack();
      setShowCounterattack(true);
      setTimeout(() => setShowCounterattack(false), 300);
      setStreak(0);
    } else if (ev === 'wall_block_destroyed') {
      playWallBlock();
    } else if (ev === 'wall_destroyed') {
      playBossDefeated();
    } else if (ev === 'loot_drop') {
      playLootDrop();
      setShowLoot(true);
      setTimeout(() => setShowLoot(false), 2500);
    }
  }, [lastAdventureEvent, adventureMode]);

  const showBossBar = adventureMode && progress?.currentPhase === 'learning_loop' && lastAdventureEvent;
  const showWall = adventureMode && progress?.currentPhase === 'validation' && lastAdventureEvent;

  return (
    <div className={`h-dvh flex flex-col overflow-x-hidden transition-all duration-300 ${
      adventureMode
        ? 'adventure-mode'
        : 'bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50'
    }`}>
      {/* Screen flash on boss defeated */}
      {showScreenFlash && <div className="fixed inset-0 bg-white/50 pointer-events-none z-50" />}

      {/* Counter-attack vignette */}
      {showCounterattack && <div className="counterattack-vignette" />}

      {/* Confetti on streak milestones */}
      <PixelConfetti show={showConfetti} />

      {/* Loot drop overlay */}
      <LootDrop loot={lastAdventureEvent?.loot || null} show={showLoot} />

      {/* Header */}
      <header className={`border-b px-4 sm:px-6 py-3 flex items-center justify-between ${
        adventureMode
          ? 'adventure-header'
          : 'border-amber-200/60 bg-white/70 backdrop-blur-sm'
      }`}>
        <div className="flex items-center gap-3">
          <span className="text-2xl" role="img" aria-label="brain">{adventureMode ? '\u2694\uFE0F' : '\uD83E\uDDE0'}</span>
          <h1 className={`text-lg font-bold hidden sm:block ${adventureMode ? '' : 'text-amber-900'}`}
            style={adventureMode ? { fontFamily: "'Press Start 2P', cursive", fontSize: '12px', color: '#e0e0e0' } : undefined}
          >
            {adventureMode ? 'DUNGEON' : 'Master Anything'}
          </h1>
          <button
            onClick={() => setShowAbout(true)}
            className={`w-7 h-7 rounded-full text-xs font-bold transition-colors ${
              adventureMode
                ? 'border-2 border-[#2a2a4a] text-[#6a6a8a] hover:border-[#e94560]'
                : 'bg-amber-100 border border-amber-300 text-amber-700 hover:bg-amber-200'
            }`}
            style={adventureMode ? { borderRadius: '2px', fontFamily: "'Press Start 2P', cursive", fontSize: '8px' } : undefined}
            title={language === 'fr' ? 'A propos' : 'About'}
          >
            ?
          </button>
          {progress && !adventureMode && (
            <PhaseIndicator phase={progress.currentPhase} step={progress.currentStep} />
          )}
          {adventureMode && <StreakCounter streak={streak} onMilestone={() => { setShowConfetti(true); setTimeout(() => setShowConfetti(false), 1800); }} />}
        </div>
        <div className="flex items-center gap-3">
          {progress?.currentConcept && !adventureMode && (
            <span className="text-sm text-amber-700/70 hidden sm:block">{progress.currentConcept}</span>
          )}
          <button
            onClick={() => setShowProgress(true)}
            className={`lg:hidden w-7 h-7 text-xs font-bold transition-colors ${
              adventureMode
                ? 'border-2 border-[#2a2a4a] text-[#6a6a8a] hover:border-[#00ff88]'
                : 'rounded-full bg-emerald-100 border border-emerald-300 text-emerald-700 hover:bg-emerald-200'
            }`}
            style={adventureMode ? { borderRadius: '2px' } : undefined}
            title={language === 'fr' ? 'Progression' : 'Progress'}
          >
            %
          </button>
          {adventureMode && (
            <>
              <button
                onClick={() => setShowInventory(true)}
                className="w-7 h-7 border-2 border-[#2a2a4a] text-[#ffbd39] text-xs font-bold hover:border-[#ffbd39] transition-colors"
                style={{ borderRadius: '2px' }}
                title={language === 'fr' ? 'Inventaire' : 'Inventory'}
              >
                B
              </button>
              <button
                onClick={toggleSound}
                className="w-7 h-7 border-2 border-[#2a2a4a] text-xs hover:border-[#e94560] transition-colors"
                style={{ borderRadius: '2px', color: soundOn ? '#00ff88' : '#6a6a8a' }}
                title={soundOn ? 'Mute' : 'Unmute'}
              >
                {soundOn ? '\uD83D\uDD0A' : '\uD83D\uDD07'}
              </button>
            </>
          )}
          <button
            onClick={() => setAdventureMode(!adventureMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all ${
              adventureMode
                ? 'adventure-toggle text-white'
                : 'rounded-full bg-white/80 border border-amber-200 text-amber-700 hover:bg-amber-50'
            }`}
          >
            {adventureMode ? '\u2694\uFE0F RPG' : '\uD83D\uDCD6 Study'}
          </button>
          {!adventureMode && (
            <button
              onClick={() => setListeningMode(!listeningMode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                listeningMode
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-white/80 border border-amber-200 text-amber-700 hover:bg-amber-50'
              }`}
            >
              {listeningMode ? '\uD83C\uDFA7 Listening' : '\uD83D\uDCD6 Reading'}
            </button>
          )}
        </div>
      </header>

      {/* Boss HP Bar / Wall */}
      {showBossBar && (
        <BossHPBar
          bossName={progress?.currentConcept || 'BOSS'}
          hp={lastAdventureEvent?.boss_hp ?? 100}
          event={lastAdventureEvent}
          roomProgress={lastAdventureEvent?.room_progress || '0/0'}
          bossesSlain={Object.values(progress?.conceptScores || {}).filter(s => s.overall >= 85).length}
        />
      )}
      {showWall && (() => {
        const parts = (lastAdventureEvent?.wall_progress || '0/0').split('/');
        const destroyed = parseInt(parts[0] || '0');
        const total = parseInt(parts[1] || '0') || progress?.totalConcepts || 0;
        return (
          <WallDemolition
            totalBlocks={total}
            blocksRemaining={total - destroyed}
            event={lastAdventureEvent}
          />
        );
      })()}

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat column */}
        <div className="flex-1 flex flex-col min-h-0">
          <ChatArea
            messages={messages}
            isLoading={isLoading}
            onSend={sendMessage}
            listeningMode={listeningMode}
            language={language}
            onLanguageChange={setLanguage}
            adventureMode={adventureMode}
          />
          {progress && !adventureMode && <SessionSummary progress={progress} />}
          <MessageInput
            onSend={sendMessage}
            disabled={isLoading || !language}
            listeningMode={listeningMode}
            language={language}
            adventureMode={adventureMode}
          />
        </div>

        {/* Sidebar */}
        {!adventureMode && <ProgressSidebar progress={progress} />}
      </div>

      <AboutModal show={showAbout} onClose={() => setShowAbout(false)} language={language} />
      <ProgressModal show={showProgress} onClose={() => setShowProgress(false)} progress={progress} language={language} />
      <InventoryModal
        show={showInventory}
        onClose={() => setShowInventory(false)}
        inventory={progress?.inventory || []}
        language={language}
        adventureMode={adventureMode}
      />

      {/* Mastery celebration overlay */}
      <MasteryBadge
        concept={masteryBadgeConcept || ''}
        show={!!masteryBadgeConcept}
        onDismiss={handleDismissBadge}
      />
    </div>
  );
}
