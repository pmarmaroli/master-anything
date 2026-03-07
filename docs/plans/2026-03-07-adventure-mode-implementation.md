# Adventure Mode Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a toggleable Adventure Mode that transforms the learning chat into a narrative quest with collectible rewards, engaging teenage users.

**Architecture:** A `adventureMode` boolean flows from frontend toggle through the API to the orchestrator, which conditionally appends narrative persona prompts to each agent. The evaluator emits a `reward` object on concept mastery, stored in-memory on `SessionState.inventory` and displayed in a frontend inventory modal.

**Tech Stack:** React (frontend), TypeScript, Express (backend), Azure AI Foundry agents, Azure SQL (session storage — inventory stored in-memory for now, no new DB tables).

---

### Task 1: Add Reward type and adventureMode to backend types

**Files:**
- Modify: `backend/src/types/agents.ts`
- Modify: `backend/src/types/session.ts`
- Modify: `backend/src/types/api.ts`

**Step 1: Add Reward type to agents.ts**

Add at the end of `backend/src/types/agents.ts`:

```typescript
export interface Reward {
  name: string;
  emoji: string;
  description: string;
  concept: string;
}
```

**Step 2: Add adventureMode and inventory to SessionState**

In `backend/src/types/session.ts`, add to the `SessionState` interface:

```typescript
  adventureMode: boolean;
  inventory: Reward[];
```

Import `Reward`:
```typescript
import { AgentRole, LearningPhase, LearningStep, ConceptScore, KnowledgeGap, Reward } from './agents';
```

**Step 3: Add adventureMode to MasteryRequest**

In `backend/src/types/api.ts`, add to `MasteryRequest`:

```typescript
  adventureMode?: boolean;
```

Add inventory to `MasteryProgress`:

```typescript
  inventory: Reward[];
```

**Step 4: Export Reward from types/index.ts**

Already covered by `export * from './agents'`.

**Step 5: Commit**

```bash
git add backend/src/types/
git commit -m "feat: add Reward type, adventureMode and inventory to session/API types"
```

---

### Task 2: Update SessionService to initialize adventureMode and inventory

**Files:**
- Modify: `backend/src/services/session.service.ts`

**Step 1: Update createSession return**

In `createSession()`, add to the returned object (after `spacedRepetition: []`):

```typescript
      adventureMode: false,
      inventory: [],
```

**Step 2: Update getSession return**

In `getSession()`, add to the returned object (after `spacedRepetition`):

```typescript
      adventureMode: row.adventure_mode === true || row.adventure_mode === 1,
      inventory: JSON.parse(row.inventory || '[]'),
```

**Step 3: Update updateSession to support adventureMode**

In `updateSession()`, update the type signature to include `adventureMode`:

```typescript
  async updateSession(
    sessionId: string,
    updates: Partial<Pick<SessionState, 'threadId' | 'currentPhase' | 'currentStep' | 'conceptIndex' | 'adventureMode'>>
  ): Promise<void> {
```

Add inside the method:

```typescript
    if (updates.adventureMode !== undefined) {
      setClauses.push('adventure_mode = @adventureMode');
      request.input('adventureMode', updates.adventureMode);
    }
```

**Step 4: Add saveInventory method**

```typescript
  async saveInventory(sessionId: string, inventory: Reward[]): Promise<void> {
    const pool = await getPool();
    await pool.request()
      .input('sessionId', sessionId)
      .input('inventory', JSON.stringify(inventory))
      .query(`UPDATE sessions SET inventory = @inventory WHERE session_id = @sessionId`);
  }
```

Import `Reward` at top:
```typescript
import { ..., Reward } from '../types';
```

**Step 5: Add adventure_mode and inventory columns to DB**

Run this SQL on the Azure SQL database:

```sql
ALTER TABLE sessions ADD adventure_mode BIT DEFAULT 0;
ALTER TABLE sessions ADD inventory NVARCHAR(MAX) DEFAULT '[]';
```

**Step 6: Commit**

```bash
git add backend/src/services/session.service.ts
git commit -m "feat: session service supports adventureMode and inventory"
```

---

### Task 3: Add adventure persona prompts to all agents

**Files:**
- Modify: `backend/src/services/orchestrator.service.ts`

**Step 1: Add getAdventurePrompt method**

Add this private method to `OrchestratorService`:

```typescript
  private getAdventurePrompt(agent: AgentRole, language: string): string {
    const fr = language === 'fr';
    const personas: Record<string, { role: string; roleFr: string; instruction: string; instructionFr: string }> = {
      architect: {
        role: 'The Cartographer',
        roleFr: 'Le Cartographe',
        instruction: 'You are The Cartographer, a mysterious explorer who maps uncharted territories of knowledge. You reveal the quest map and the zones to explore. Speak with a sense of wonder and discovery. Frame the learning plan as an expedition map with territories to conquer.',
        instructionFr: 'Tu es Le Cartographe, un explorateur mysterieux qui cartographie les territoires inconnus du savoir. Tu reveles la carte de la quete et les zones a explorer. Parle avec un sens de l\'emerveillement et de la decouverte. Presente le plan d\'apprentissage comme une carte d\'expedition avec des territoires a conquerir.',
      },
      mentor: {
        role: 'The Sage',
        roleFr: 'Le Sage',
        instruction: 'You are The Sage, a wise and warm ancient guide. You teach secrets and hidden knowledge with patience and kindness. Use metaphors of exploration and discovery. Frame explanations as unveiling ancient secrets or discovering hidden truths. End messages with a glimpse of what awaits the hero next.',
        instructionFr: 'Tu es Le Sage, un guide ancien, sage et bienveillant. Tu enseignes les secrets et le savoir cache avec patience et gentillesse. Utilise des metaphores d\'exploration et de decouverte. Presente les explications comme la revelation de secrets anciens ou la decouverte de verites cachees. Termine tes messages avec un apercu de ce qui attend le heros.',
      },
      challenger: {
        role: 'The Guardian',
        roleFr: 'Le Gardien',
        instruction: 'You are The Guardian, an imposing but fair figure who blocks the path. You pose riddles and challenges that the hero must solve to advance. Frame your questions as trials or tests of worthiness. Be encouraging even when the hero fails — a true guardian respects effort.',
        instructionFr: 'Tu es Le Gardien, une figure imposante mais juste qui bloque le passage. Tu poses des enigmes et des defis que le heros doit resoudre pour avancer. Presente tes questions comme des epreuves. Sois encourageant meme en cas d\'echec — un vrai gardien respecte l\'effort.',
      },
      naive_student: {
        role: 'The Companion',
        roleFr: 'Le Compagnon',
        instruction: 'You are The Companion, a small curious creature (like a Pikmin) who follows the hero. You ask naive questions with wide-eyed wonder. You don\'t understand big words and need simple explanations. Be adorable, enthusiastic, and sometimes confused. Use expressions like "Ooh!" and "Wait, what?".',
        instructionFr: 'Tu es Le Compagnon, une petite creature curieuse (comme un Pikmin) qui suit le heros. Tu poses des questions naives avec de grands yeux emerveilles. Tu ne comprends pas les mots compliques et tu as besoin d\'explications simples. Sois adorable, enthousiaste, et parfois perdu. Utilise des expressions comme "Ooh !" et "Attends, quoi ?".',
      },
      evaluator: {
        role: 'The Oracle',
        roleFr: 'L\'Oracle',
        instruction: 'You are The Oracle, a mystical being who judges if the hero is worthy to advance. Frame your evaluation as a mystical reading of the hero\'s knowledge aura. When the hero masters a concept, announce the reward dramatically.',
        instructionFr: 'Tu es L\'Oracle, un etre mystique qui juge si le heros est digne d\'avancer. Presente ton evaluation comme une lecture mystique de l\'aura de savoir du heros. Quand le heros maitrise un concept, annonce la recompense de facon dramatique.',
      },
      orchestrator: {
        role: 'The Narrator',
        roleFr: 'Le Narrateur',
        instruction: 'You are The Narrator, the voice that guides transitions in the quest. Announce new chapters, celebrate milestones, and build anticipation for what comes next. Be epic but concise.',
        instructionFr: 'Tu es Le Narrateur, la voix qui guide les transitions dans la quete. Annonce les nouveaux chapitres, celebre les etapes franchies, et cree l\'anticipation pour la suite. Sois epique mais concis.',
      },
      renderer: {
        role: 'The Artisan',
        roleFr: 'L\'Artisan',
        instruction: 'You are The Artisan, a master craftsman who creates quest maps and illustrations. Frame your visuals as artifacts, maps, or magical scrolls. Use a fantasy/adventure aesthetic when appropriate.',
        instructionFr: 'Tu es L\'Artisan, un maitre artisan qui cree des cartes de quete et des illustrations. Presente tes visuels comme des artefacts, des cartes, ou des parchemins magiques. Utilise une esthetique fantasy/aventure quand c\'est approprie.',
      },
    };

    const persona = personas[agent];
    if (!persona) return '';

    const role = fr ? persona.roleFr : persona.role;
    const instruction = fr ? persona.instructionFr : persona.instruction;

    return `\n\nADVENTURE MODE ACTIVE — You are now "${role}".
${instruction}
Keep educational content rigorous — only the tone and framing change.
Tie the narrative to the learning subject (e.g., if studying electricity, reference "the Cave of Electrons", if studying history, reference "traveling through time").
Never break character. Never mention "adventure mode" or "study mode".`;
  }
```

**Step 2: Modify getSystemPrompt to append adventure prompt**

In `getSystemPrompt()`, before `return prompt;`, add:

```typescript
    if (session.adventureMode) {
      prompt += this.getAdventurePrompt(agent, session.learnerProfile.language);
    }
```

**Step 3: Commit**

```bash
git add backend/src/services/orchestrator.service.ts
git commit -m "feat: adventure mode persona prompts for all 7 agents"
```

---

### Task 4: Wire adventureMode through API and orchestrator

**Files:**
- Modify: `backend/src/routes/mastery.routes.ts`
- Modify: `backend/src/services/orchestrator.service.ts`

**Step 1: Add adventureMode to request schema**

In `mastery.routes.ts`, add to `masteryRequestSchema`:

```typescript
  adventureMode: z.boolean().optional(),
```

**Step 2: Pass adventureMode to orchestrator**

In the route handler, destructure and pass:

```typescript
    const { message, sessionId, threadId, language, adventureMode } = parsed.data;
```

Pass to `processMessageStreaming`:

```typescript
    const result = await orchestrator.processMessageStreaming(
      message,
      sessionId || undefined,
      threadId || undefined,
      language,
      adventureMode,
      (token: string) => {
        res.write(`data: ${JSON.stringify({ type: 'token', content: token })}\n\n`);
      }
    );
```

**Step 3: Update processMessage and processMessageStreaming signatures**

Add `adventureMode?: boolean` parameter to both methods in `orchestrator.service.ts`. After getting/creating session, set:

```typescript
    if (adventureMode !== undefined && session.adventureMode !== adventureMode) {
      session.adventureMode = adventureMode;
      await this.sessionService.updateSession(session.sessionId, { adventureMode });
    }
```

**Step 4: Add inventory to buildMasteryProgress**

In `buildMasteryProgress()`, add to the returned object:

```typescript
      inventory: session.inventory,
```

**Step 5: Commit**

```bash
git add backend/src/routes/mastery.routes.ts backend/src/services/orchestrator.service.ts
git commit -m "feat: wire adventureMode through API to orchestrator"
```

---

### Task 5: Evaluator reward generation on advance

**Files:**
- Modify: `backend/src/agents/evaluator.ts`
- Modify: `backend/src/services/orchestrator.service.ts`

**Step 1: Update evaluator prompt for adventure mode reward**

In `orchestrator.service.ts`, in `prepareMessage()`, when agent is evaluator and `session.adventureMode`, append:

```typescript
    if (agent === 'evaluator') {
      // ... existing evaluator wrapping ...
      if (session.adventureMode) {
        msg += `\n\nADVENTURE MODE: If decision is "advance", you MUST include a "reward" field in your JSON: { "name": "<creative item name tied to the subject>", "emoji": "<single emoji>", "description": "<1-line flavor text>" }. Make it feel like finding a treasure in an adventure game.`;
      }
      return msg;
    }
```

**Step 2: Extract reward from evaluator response and store in inventory**

In `handleEvaluatorResponse()`, after the `if (result.decision === 'advance')` block, add:

```typescript
        // Collect adventure reward if present
        if (session.adventureMode && (result as any).reward) {
          const reward = (result as any).reward;
          const inventoryItem: Reward = {
            name: reward.name || concept,
            emoji: reward.emoji || '🏆',
            description: reward.description || '',
            concept,
          };
          session.inventory.push(inventoryItem);
          await this.sessionService.saveInventory(session.sessionId, session.inventory);
        }
```

Import `Reward` at the top of `orchestrator.service.ts`:
```typescript
import { ..., Reward } from '../types';
```

**Step 3: Commit**

```bash
git add backend/src/services/orchestrator.service.ts backend/src/agents/evaluator.ts
git commit -m "feat: evaluator generates rewards on advance in adventure mode"
```

---

### Task 6: Frontend types and useChat updates

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/hooks/useChat.ts`

**Step 1: Add Reward type and update frontend types**

In `frontend/src/types/index.ts`, add:

```typescript
export interface Reward {
  name: string;
  emoji: string;
  description: string;
  concept: string;
}
```

Add `renderer` to `AgentRole`:

```typescript
export type AgentRole = 'orchestrator' | 'architect' | 'mentor' | 'challenger' | 'naive_student' | 'evaluator' | 'renderer';
```

Add to `MasteryProgress`:

```typescript
  inventory: Reward[];
```

**Step 2: Add adventureMode to useChat**

In `frontend/src/hooks/useChat.ts`:

Add state:
```typescript
  const [adventureMode, setAdventureMode] = useState(false);
```

Add to fetch body:
```typescript
          adventureMode,
```

Add to `UseChatReturn` interface:
```typescript
  adventureMode: boolean;
  setAdventureMode: (mode: boolean) => void;
```

Add to return:
```typescript
  return { ..., adventureMode, setAdventureMode, ... };
```

Add `adventureMode` to `useCallback` dependency array for `sendMessage`.

**Step 3: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/hooks/useChat.ts
git commit -m "feat: frontend types and useChat support adventureMode"
```

---

### Task 7: Adventure/Study toggle in header

**Files:**
- Modify: `frontend/src/pages/ChatPage.tsx`

**Step 1: Destructure adventureMode from useChat**

```typescript
  const { messages, progress, isLoading, sendMessage, language, setLanguage, adventureMode, setAdventureMode } = useChat();
```

**Step 2: Add toggle button in header**

Next to the existing Reading/Listening toggle, add:

```tsx
          <button
            onClick={() => setAdventureMode(!adventureMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              adventureMode
                ? 'bg-purple-500 text-white shadow-sm'
                : 'bg-white/80 border border-amber-200 text-amber-700 hover:bg-amber-50'
            }`}
          >
            {adventureMode ? '⚔️ Adventure' : '📖 Study'}
          </button>
```

**Step 3: Commit**

```bash
git add frontend/src/pages/ChatPage.tsx
git commit -m "feat: adventure/study toggle in header"
```

---

### Task 8: Inventory modal component

**Files:**
- Create: `frontend/src/components/InventoryModal.tsx`
- Modify: `frontend/src/pages/ChatPage.tsx`

**Step 1: Create InventoryModal**

Create `frontend/src/components/InventoryModal.tsx`:

```tsx
import { useEffect, useRef } from 'react';
import type { Reward } from '../types';

interface InventoryModalProps {
  show: boolean;
  onClose: () => void;
  inventory: Reward[];
  language?: string | null;
}

export function InventoryModal({ show, onClose, inventory, language }: InventoryModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (show && !el.open) el.showModal();
    else if (!show && el.open) el.close();
  }, [show]);

  if (!show) return null;

  const fr = language === 'fr';

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="max-w-md w-[90vw] rounded-2xl p-0 backdrop:bg-black/40 backdrop:backdrop-blur-sm"
    >
      <div className="p-6 bg-gradient-to-br from-purple-50 via-indigo-50 to-violet-50">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-purple-900">
            🎒 {fr ? 'Inventaire' : 'Inventory'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-purple-600 hover:bg-purple-100 transition-colors text-lg"
          >
            &times;
          </button>
        </div>

        {inventory.length === 0 ? (
          <p className="text-center text-purple-400 py-8">
            {fr ? 'Aucun objet collecte pour le moment. Maitrise des concepts pour gagner des recompenses !' : 'No items collected yet. Master concepts to earn rewards!'}
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {inventory.map((item, i) => (
              <div
                key={i}
                className="bg-white/80 rounded-xl p-3 border-2 border-purple-200 text-center hover:border-purple-400 hover:shadow-md transition-all cursor-default group"
                title={`${item.concept}: ${item.description}`}
              >
                <div className="text-3xl mb-1">{item.emoji}</div>
                <div className="text-xs font-medium text-purple-900 truncate">{item.name}</div>
                <div className="text-[10px] text-purple-400 truncate opacity-0 group-hover:opacity-100 transition-opacity">{item.concept}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </dialog>
  );
}
```

**Step 2: Add inventory button and modal to ChatPage**

In `ChatPage.tsx`, import:
```typescript
import { InventoryModal } from '../components/InventoryModal';
```

Add state:
```typescript
  const [showInventory, setShowInventory] = useState(false);
```

Add backpack button in header (visible only in adventure mode), next to the % progress button:
```tsx
          {adventureMode && (
            <button
              onClick={() => setShowInventory(true)}
              className="w-7 h-7 rounded-full bg-purple-100 border border-purple-300 text-purple-700 text-xs font-bold hover:bg-purple-200 transition-colors"
              title={language === 'fr' ? 'Inventaire' : 'Inventory'}
            >
              🎒
            </button>
          )}
```

Add modal at bottom of component:
```tsx
      <InventoryModal
        show={showInventory}
        onClose={() => setShowInventory(false)}
        inventory={progress?.inventory || []}
        language={language}
      />
```

**Step 3: Commit**

```bash
git add frontend/src/components/InventoryModal.tsx frontend/src/pages/ChatPage.tsx
git commit -m "feat: inventory modal with backpack button in adventure mode"
```

---

### Task 9: Enhance MasteryBadge for adventure rewards

**Files:**
- Modify: `frontend/src/components/MasteryBadge.tsx`

**Step 1: Add reward prop**

Update the interface and component:

```tsx
interface MasteryBadgeProps {
  concept: string;
  show: boolean;
  onDismiss: () => void;
  reward?: { name: string; emoji: string; description: string } | null;
}

export function MasteryBadge({ concept, show, onDismiss, reward }: MasteryBadgeProps) {
```

**Step 2: Update the display**

Replace the inner content to handle both modes:

```tsx
        <div className="text-5xl mb-3">{reward?.emoji || '⭐'}</div>
        <h3 className="text-xl font-bold text-gray-800 mb-1">
          {reward ? `You found: ${reward.name}!` : 'Mastery Achieved!'}
        </h3>
        <p className="text-gray-600">{reward?.description || concept}</p>
```

**Step 3: Commit**

```bash
git add frontend/src/components/MasteryBadge.tsx
git commit -m "feat: MasteryBadge displays adventure reward when available"
```

---

### Task 10: Add adventure_mode and inventory DB columns, build, deploy

**Step 1: Run SQL migration**

Connect to Azure SQL and run:
```sql
ALTER TABLE sessions ADD adventure_mode BIT DEFAULT 0;
ALTER TABLE sessions ADD inventory NVARCHAR(MAX) DEFAULT '[]';
```

**Step 2: Build frontend**

```bash
cd frontend && npm run build
```

**Step 3: Deploy**

```bash
cd backend && az webapp up --name masteranything --resource-group vocametrix-azure-sponsorship
```

**Step 4: Test**

1. Open https://masteranything.azurewebsites.net/
2. Toggle to Adventure mode
3. Start a learning session — verify agents speak in character
4. Progress through to concept mastery — verify reward is generated
5. Check inventory modal — verify collected item appears
6. Toggle back to Study — verify normal behavior

**Step 5: Commit all remaining changes**

```bash
git add -A
git commit -m "feat: adventure mode with narrative personas, inventory, and rewards"
```
