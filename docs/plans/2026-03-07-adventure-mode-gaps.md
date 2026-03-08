# Adventure Mode Gaps Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the 2 missing Adventure Mode features: pixel chest opening animation in LootDrop, and a Round Timer component.

**Architecture:** Both are self-contained frontend additions. LootDrop.tsx gets a 3-phase animation sequence (chest closed → chest open → item rises). RoundTimer.tsx is a new component rendered in ChatPage alongside BossHPBar during Phase B, counting up from boss-fight start with a 5-min warning.

**Tech Stack:** React, TypeScript, CSS keyframe animations (steps() timing for pixel art feel), Web Audio API (already wired via sounds.ts)

---

### Task 1: Pixel chest opening animation in LootDrop

**Files:**
- Modify: `frontend/src/components/LootDrop.tsx`
- Modify: `frontend/src/styles/adventure.css`

**Context:**
Current `LootDrop.tsx` shows sparkles + item icon immediately. The spec says: "pixel chest opens, item floats up with sparkles, 2s duration, then fades into inventory".

The animation has 3 phases:
- 0–0.4s: closed chest emoji 📦 displayed, scales in
- 0.4–0.8s: open chest emoji 📫 displayed, shakes
- 0.8–2.5s: item icon + name float up with sparkles (existing behavior)

**Step 1: Add CSS keyframes for chest phases**

In `frontend/src/styles/adventure.css`, add after the existing `@keyframes loot-rise` block:

```css
@keyframes chest-appear {
  0%   { transform: scale(0) rotate(-10deg); opacity: 0; }
  60%  { transform: scale(1.2) rotate(4deg); opacity: 1; }
  100% { transform: scale(1) rotate(0deg);  opacity: 1; }
}

@keyframes chest-shake {
  0%, 100% { transform: translateX(0); }
  20%       { transform: translateX(-4px); }
  40%       { transform: translateX(4px); }
  60%       { transform: translateX(-3px); }
  80%       { transform: translateX(3px); }
}

.animate-chest-appear { animation: chest-appear 0.4s steps(6) forwards; }
.animate-chest-shake  { animation: chest-shake 0.4s steps(4) forwards; }
```

**Step 2: Rewrite LootDrop.tsx with 3-phase animation**

Replace the entire file:

```tsx
import { useEffect, useState } from 'react';

interface LootDropProps {
  loot: { name: string; icon: string } | null;
  show: boolean;
}

type Phase = 'hidden' | 'chest-closed' | 'chest-open' | 'item-rise';

export function LootDrop({ loot, show }: LootDropProps) {
  const [phase, setPhase] = useState<Phase>('hidden');

  useEffect(() => {
    if (!show || !loot) {
      setPhase('hidden');
      return;
    }

    setPhase('chest-closed');
    const t1 = setTimeout(() => setPhase('chest-open'), 400);
    const t2 = setTimeout(() => setPhase('item-rise'), 800);
    const t3 = setTimeout(() => setPhase('hidden'), 2800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [show, loot]);

  if (phase === 'hidden' || !loot) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-end justify-center pb-32">
      <div className="text-center">

        {/* Phase 1: closed chest */}
        {phase === 'chest-closed' && (
          <div className="animate-chest-appear text-6xl mb-2">📦</div>
        )}

        {/* Phase 2: open chest shaking */}
        {phase === 'chest-open' && (
          <div className="animate-chest-shake text-6xl mb-2">📫</div>
        )}

        {/* Phase 3: item rises with sparkles */}
        {phase === 'item-rise' && (
          <div className="animate-loot-rise">
            <div className="relative">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1.5 h-1.5 animate-sparkle"
                  style={{
                    backgroundColor: ['#ffbd39', '#00ff88', '#0096ff', '#e94560'][i % 4],
                    left: `${50 + Math.cos(i * 60 * Math.PI / 180) * 40}%`,
                    top:  `${50 + Math.sin(i * 60 * Math.PI / 180) * 40}%`,
                    animationDelay: `${i * 0.1}s`,
                  }}
                />
              ))}
              <div className="text-5xl mb-2">{loot.icon}</div>
            </div>
            <div
              className="px-4 py-2"
              style={{
                fontFamily: "'Press Start 2P', cursive",
                fontSize: '10px',
                color: '#ffbd39',
                textShadow: '2px 2px 0px #000',
              }}
            >
              {loot.name}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
```

**Step 3: Verify visually**

Run `cd frontend && npm run dev`, switch to Adventure Mode, trigger a boss defeat. Confirm:
- Closed chest appears and scales in (0–0.4s)
- Open chest replaces it and shakes (0.4–0.8s)
- Item icon + name float up with sparkles (0.8–2.8s)
- Everything disappears cleanly

**Step 4: Commit**

```bash
git add frontend/src/components/LootDrop.tsx frontend/src/styles/adventure.css
git commit -m "feat: add pixel chest opening animation to loot drop sequence"
```

---

### Task 2: Round Timer component

**Files:**
- Create: `frontend/src/components/RoundTimer.tsx`
- Modify: `frontend/src/pages/ChatPage.tsx`

**Context:**
Spec: "Small pixel clock in the corner: ⏱ 3:42. Starts when a boss fight begins. At 5 minutes: '⏱ 5 min round. Keep going or take a break?'"

- Timer starts (resets to 0) when `showBossBar` becomes true (Phase B begins)
- Timer stops/hides when `showBossBar` becomes false
- At 5:00 a warning message appears (inline in the component, dismissible)
- Positioned: fixed bottom-right corner, above the input area, only in adventure mode

**Step 1: Create RoundTimer.tsx**

```tsx
import { useEffect, useRef, useState } from 'react';

interface RoundTimerProps {
  active: boolean;
  language?: string;
}

export function RoundTimer({ active, language }: RoundTimerProps) {
  const [seconds, setSeconds] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [warningDismissed, setWarningDismissed] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset and start/stop timer based on active state
  useEffect(() => {
    if (active) {
      setSeconds(0);
      setShowWarning(false);
      setWarningDismissed(false);
      intervalRef.current = setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setSeconds(0);
      setShowWarning(false);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [active]);

  // Show 5-min warning
  useEffect(() => {
    if (seconds === 300 && !warningDismissed) {
      setShowWarning(true);
    }
  }, [seconds, warningDismissed]);

  if (!active) return null;

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
  const isLong = seconds >= 300;

  const warningText = language === 'fr'
    ? '5 min. Continuer ou pause ?'
    : '5 min round. Keep going or take a break?';

  return (
    <div
      className="fixed bottom-20 right-4 z-40 pointer-events-auto"
      style={{ fontFamily: "'Press Start 2P', cursive" }}
    >
      {showWarning && (
        <div
          className="mb-2 px-3 py-2 text-center"
          style={{
            background: '#1a1a2e',
            border: '2px solid #ffbd39',
            boxShadow: '3px 3px 0px #000',
            fontSize: '7px',
            color: '#ffbd39',
            maxWidth: '160px',
            lineHeight: '1.6',
          }}
        >
          {warningText}
          <button
            onClick={() => { setShowWarning(false); setWarningDismissed(true); }}
            style={{
              display: 'block',
              margin: '6px auto 0',
              background: '#e94560',
              border: 'none',
              color: '#fff',
              fontFamily: "'Press Start 2P', cursive",
              fontSize: '6px',
              padding: '3px 6px',
              cursor: 'pointer',
              boxShadow: '2px 2px 0px #000',
            }}
          >
            OK
          </button>
        </div>
      )}
      <div
        style={{
          background: '#1a1a2e',
          border: `2px solid ${isLong ? '#e94560' : '#2a2a4a'}`,
          boxShadow: '3px 3px 0px #000',
          padding: '4px 8px',
          fontSize: '9px',
          color: isLong ? '#e94560' : '#6a6a8a',
        }}
      >
        ⏱ {timeStr}
      </div>
    </div>
  );
}
```

**Step 2: Wire RoundTimer into ChatPage.tsx**

Add import after the PixelConfetti import line:
```tsx
import { RoundTimer } from '../components/RoundTimer';
```

Add the component in the JSX, just before the closing `</div>` of the outermost container (after the `<InventoryModal>` block):
```tsx
{/* Round timer — adventure mode boss fights only */}
<RoundTimer active={!!showBossBar} language={language} />
```

**Step 3: Verify visually**

Run `npm run dev`, switch Adventure Mode, start a boss fight:
- Timer appears bottom-right: `⏱ 0:00` counting up
- Timer disappears when phase changes away from learning_loop
- Timer resets to 0:00 when a new boss fight starts
- At 5:00 the warning popup appears with an OK button to dismiss
- After 5:00 the time turns red

**Step 4: Commit**

```bash
git add frontend/src/components/RoundTimer.tsx frontend/src/pages/ChatPage.tsx
git commit -m "feat: add round timer to adventure mode boss fights with 5-min warning"
```

---

### Task 3: Build verification + deploy

**Step 1: TypeScript check**
```bash
cd frontend && npx tsc --noEmit
```
Expected: no errors.

**Step 2: Vite build**
```bash
cd frontend && npm run build
```
Expected: `✓ built in Xs` (chunk size warning is pre-existing, not a blocker).

**Step 3: Deploy**
```bash
cd backend && az webapp up --name masteranything --resource-group vocametrix-azure-sponsorship --runtime "NODE:20-lts"
```
Expected: `Site started successfully`.

**Step 4: Final commit (gitignore + context_summary cleanup)**
```bash
cd .. && git add .gitignore
git commit -m "chore: ignore DEPLOYMENT.local.md"
```
