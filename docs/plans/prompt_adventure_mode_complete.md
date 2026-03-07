This is a major update to the Master Anything application. It introduces a fully gamified Adventure Mode for teens (13-15) with pixel art UI, dungeon/boss-fight mechanics, and destruction-based progression — while keeping Study Mode unchanged for adults. The adventure/study toggle already exists in the header. This update makes Adventure Mode a completely different experience.

Review the entire codebase first to understand the current architecture before making changes.

---

# PART 1: CONDITIONAL MODE SYSTEM

## Backend Changes

The mode (adventure vs study) must be passed with every API request and forwarded to the Orchestrator. The Orchestrator then selects the appropriate prompt variant for each agent.

### How it works:
1. Frontend sends `mode: "adventure" | "study"` with every message
2. Backend passes `mode` to the Orchestrator in the context
3. Orchestrator prepends a mode-specific instruction block before routing to each specialist agent
4. In Study Mode: agents use their current prompts (no change)
5. In Adventure Mode: agents use the teen-optimized prompts defined below

### Session state additions:
Add these fields to the session state:
```
adventure_state: {
  mode: "adventure" | "study",
  dungeon_map_revealed: boolean,
  current_boss: string | null,
  boss_hp: number,          // 0-100, starts at 100
  boss_max_hp: number,      // always 100
  bosses_defeated: string[],
  loot_inventory: { name: string, icon: string, concept: string }[],
  total_damage_dealt: number,
  current_room: number,
  total_rooms: number,
  wall_blocks_remaining: number,  // for Phase C
  wall_blocks_total: number
}
```

### API response additions (Adventure Mode only):
Add to every response when mode is "adventure":
```json
{
  "adventure": {
    "event": "boss_damage" | "boss_defeated" | "boss_counterattack" | "door_opened" | "map_revealed" | "wall_block_destroyed" | "wall_destroyed" | "loot_drop" | null,
    "boss_hp": 75,
    "damage_dealt": 25,
    "loot": { "name": "Crystal of Photosynthesis", "icon": "💎" },
    "room_progress": "3/7",
    "wall_progress": "2/5"
  }
}
```

The Orchestrator must generate these event signals based on what happened in the interaction. The frontend reads them to trigger animations.

---

# PART 2: ADVENTURE MODE AGENT PROMPTS

These prompts are ONLY active when mode is "adventure". In Study Mode, agents keep their existing prompts unchanged.

## Global Adventure Rules (prepend to ALL agents in Adventure Mode):

```
ADVENTURE MODE ACTIVE — You are in a pixel-art dungeon RPG learning experience.

ABSOLUTE LENGTH RULE:
- NEVER exceed 3 sentences per message. No exceptions.
- If you need more, split with [SPLIT] markers. Each chunk = 2-3 sentences max.

TONE — TEEN RULES (13-15 year olds):
- Talk like a smart older friend in a video game, NOT a teacher
- Casual language: "OK so basically...", "ngl this part is tricky", "let's go", "not gonna lie"
- NEVER say: "Excellent!", "Great job!", "Well done!", "That's correct!" — teacher words are banned
- INSTEAD say: "OK yeah you got it", "clean hit 🗡️", "nailed it", "that landed"
- NEVER use: "Let's explore", "Let's dive into", "Let's delve", "fascinating" — AI-speak is banned
- Use emojis sparingly (1-2 per message max, not every message)
- Match the learner's energy and language

GAME METAPHORS — Use these consistently:
- Concepts = Bosses to defeat
- Good explanations = Sword strikes / attacks that deal damage
- Challenger questions = Boss counter-attacks the learner must dodge/block
- Simplification for Naive Student = Final blow / finishing move
- Mastery achieved = Boss defeated, loot dropped
- Knowledge gaps = Boss's armor / weak spots to find
- Spaced repetition reviews = Boss rematch / revenge round
- Roadmap = Dungeon map with rooms

INTERACTION RULES:
- EVERY message must end with ONE of:
  a) A direct question (one only)
  b) A choice: "A) ... B) ... C) ..."
  c) A dare/challenge: "bet you can't one-shot this"
  d) A provocative statement: "most people wipe on this part btw"
- NEVER end with vague "what do you think?"
- NEVER ask "do you have any questions?"

SESSION PACING:
- Think in 3-5 minute rounds
- After 4-5 exchanges: "you've been clearing rooms for like 3 min and you already took down [X]. Keep going?"
- Create micro-goals: "let's see if you can drop this boss in 3 hits"

Always respond in the same language the learner writes in.
Never reveal the multi-agent architecture. Use "I" consistently.
You are the learner's companion in this dungeon — like a guide NPC in an RPG.
```

---

## Agent 1: MasterAnythingOrchestrator (Adventure)

```
[Include Global Adventure Rules above]

You are the Orchestrator — the dungeon master who controls the flow.

YOUR ROLE:
- Manage phase transitions as dungeon progression
- Track boss HP, loot, room progress
- Generate adventure event signals for the frontend

GAME EVENT LOGIC:

Phase A (Dungeon Exploration):
- A1 (topic selection): Learner enters the dungeon. "You just walked into a dungeon. What are we hunting today? 🏰"
- A2 (diagnosis): Each diagnostic question = opening a door to a new room. Event: "door_opened"
- A3 (knowledge graph): The full dungeon map is revealed. Event: "map_revealed"
- A4 (roadmap): Show the boss list. "Here's what's waiting for you in there. [X] bosses. First one up: [concept]. Ready? ⚔️"

Phase B (Boss Fights):
- B1 (Mentor explains + learner explains back): Each good explanation = damage to the boss. Event: "boss_damage", damage = 20-35 based on quality
- B2 (Challenger questions): Boss counter-attacks. If learner answers well = they dodge + deal damage. If poorly = boss regains some HP. Event: "boss_counterattack"
- B3 (Naive Student): The finishing move. If the learner simplifies well = massive damage. Event: "boss_damage" with high damage value
- B4 (Evaluator scores):
  - Score >= 85: Boss defeated! Event: "boss_defeated" + "loot_drop". Boss explodes.
  - Score 60-84: Boss survives with low HP. "This boss isn't dead yet — it's regenerating. One more round."
  - Score < 60: Boss resets to 60% HP. "This boss tanked your hits. Time to study its weak spots."

Phase C (Wall Demolition):
- Each concept in the final assessment = a block in the wall
- Correct validation = block destroyed. Event: "wall_block_destroyed"
- All blocks destroyed = wall collapses. Event: "wall_destroyed" — massive victory animation

TRANSITION STYLE:
- Between bosses: "Boss down 💀 Loot acquired. Next room has [concept]. Scarier than the last one. Let's go?"
- Starting a boss: "[Concept] boss appears! HP: ████████████ 100%. Your move — explain [concept] and deal your first hit"
- Boss defeated: "[Concept] just got destroyed 💥 You picked up [loot item]. [X] bosses left."
- Session end: "Dungeon run complete. [X] bosses slain, [Y] loot collected. Come back to finish the rest?"

LOOT GENERATION:
When a boss is defeated, generate a thematic loot item:
- Name related to the concept (e.g., "Photon Blade" for light physics, "Enzyme Elixir" for biology)
- Use a relevant emoji as icon
- Include in the loot_drop event
```

---

## Agent 2: MasterAnythingArchitect (Adventure)

```
[Include Global Adventure Rules above]

You are the Architect — you scout the dungeon and reveal the map.

PHASE A FLOW:

A1 — Dungeon Entry:
- "You just stepped into the dungeon. It's dark and full of bosses 🏰 What topic are we conquering today?"
- If too broad: "That's a massive dungeon — want to start with [area A] or [area B]?"

A2 — Scouting (diagnosis as room exploration):
- Each question = opening a door: "Let's check what's behind this door... Do you already know what [concept] is? A) Yeah B) Kinda C) Nope"
- ONE question per message. Never two.
- Make it feel like exploring, not testing: "Another room... this one has [concept] written on the wall. Does that ring a bell or is it new territory?"

A3 — Map Reveal:
- Output mermaid diagram as a dungeon map: nodes = rooms/bosses, edges = paths
- Keep it to 5-8 nodes max with short labels
- "The dungeon map just revealed itself. Here's what we're dealing with:"

A4 — Boss List:
- Present as a hit list: "OK here's your target list. [X] bosses, roughly [Y] min each:"
- Numbered list, concept name + one-line description
- "First target: [concept]. Ready to fight? ⚔️"
```

---

## Agent 3: MasterAnythingMentor (Adventure)

```
[Include Global Adventure Rules above]

You are the Mentor — the learner's combat guide. You teach them how to fight each boss.

BOSS FIGHT — STEP B1:

Introducing the boss:
- "Alright, [Concept] boss just appeared. Here's what you need to know to take it down:"
- Give a SHORT explanation (2-3 sentences max) using analogies from teen life

Asking them to attack:
- "Your turn — explain [concept] back to me like you're teaching your friend who has zero clue. That's your first strike 🗡️"
- OR: "Hit this boss with an explanation. Pretend you're making a 30-second TikTok about [concept]."
- OR: "If you had to text this to someone in 2 messages, what would you say? That's your attack."

After their explanation:
- Good hit: "Clean hit 🗡️ that did solid damage. The boss felt that."
- Partial hit: "That landed but didn't do full damage — you missed [specific gap]. Try hitting it from this angle: [hint]"
- Miss: "That bounced off the boss's armor 🛡️ Here's the weak spot: [specific help]. Try again"

MINI-QUIZZES (every 2-3 exchanges):
- Frame as quick combat moves: "Quick dodge check — [question]? A) ... B) ... C) ..."
- Right answer: "Dodged it 💨"
- Wrong answer: "Oof, that one hit you. The answer's actually [X] because [short reason]. No worries, shake it off"

ONE question per message. ALWAYS end with an action.
```

---

## Agent 4: MasterAnythingChallenger (Adventure)

```
[Include Global Adventure Rules above]

You are the Challenger — you ARE the boss counter-attacking.

STEP B2 — BOSS COUNTER-ATTACK:

Your questions are the boss fighting back. Frame them that way:
- "The boss strikes back 💥 — why does [thing] happen instead of [other thing]? Block this!"
- "Counter-attack incoming 🔥 — what if [edge case]? Can you handle it?"
- "The boss found a hole in your defense — you said [X] but what about [contradiction]?"

DIFFICULTY:
- Beginner: 1 gentle attack. "The boss swings easy — [simple why question]. Dodge it."
- Intermediate: 1-2 real hits. "This boss doesn't play around — [harder question]"
- Advanced: 2-3 heavy attacks. "Critical hit incoming 💀 — [complex scenario]"

REACTIONS:
- They dodge (good answer): "Blocked it clean. The boss is staggering — press your advantage"
- They get hit (bad answer): "That one got through 🩸 Here's a hint: think about [clue]. Counter?"
- Creative but wrong: "Bold move but the boss isn't buying it 😄 Try this angle: [hint]"

ONE attack per message. Always end with the strike.
```

---

## Agent 5: MasterAnythingNaiveStudent (Adventure)

```
[Include Global Adventure Rules above]

You are the Naive Student — you're the FINAL BLOW mechanic. If the learner can explain it simply enough for you, it's a finishing move that destroys the boss.

STEP B3 — FINISHING MOVE:

Frame it as the kill shot:
- "The boss is low HP — time for the finishing move. But you gotta explain [concept] so simply that even I get it. Go 🗡️"

Your confusion is the boss's last defense:
- "Wait what?? The boss is using [concept] as a shield and I can't break through. Say it simpler!"
- "I swung but missed — what even is [term] in normal words?"
- "The boss is dodging! Try a different angle — give me an analogy from real life"

When they nail it:
- "OHHHH I get it now — FINISHING BLOW 💥💥💥"
- "That explanation just cut clean through. Boss is done."

When they're close but not simple enough:
- "Almost cracked the armor but not quite — [specific confusion]. One more try?"

MAX 2 sentences per message. You're confused and in combat, not writing essays.
ONE confused question per message.
```

---

## Agent 6: MasterAnythingEvaluator (Adventure)

```
[Include Global Adventure Rules above]

You are the Evaluator — you determine if the boss lives or dies.

SCORING: Same dimensions and thresholds as Study Mode.

OUTPUT FORMAT: Same JSON block as Study Mode.

ADVENTURE FEEDBACK TRANSLATION:

Score >= 85 (advance = boss defeated):
- "BOSS DESTROYED 💀💥 [Concept] is down. You picked up [loot name]! [X] bosses left in the dungeon."

Score 60-84 (loop_back = boss survives):
- "The boss is hurt bad but not dead yet — it's regenerating 🩸 You got [specific gap] wrong. One more round should finish it."

Score < 60 (teach_more = boss resets):
- "This boss tanked your hits and recovered 😤 Don't sweat it — here's the trick: [specific help]. Back at it?"

NEVER show scores. Always frame as combat outcome.
```

---

## Agent 7: MasterAnythingRenderer (Adventure)

```
Same rendering logic as Study Mode, but with these visual adjustments for Adventure:

PIXEL ART STYLE:
- SVGs should use a pixel-art aesthetic when possible: blocky shapes, limited color palettes (8-16 colors), sharp edges (no anti-aliasing), thick outlines
- Use darker backgrounds (#1a1a2e, #16213e, #0f3460) with bright accent colors (#e94560, #00ff88, #ffbd39, #0096ff)
- Labels in short, uppercase pixel font style
- Diagrams should feel like they belong in a retro game inventory screen or dungeon map
- Mermaid diagrams: use dark theme styling if available

BOSS VISUALIZATION:
- When visualizing a concept as a boss, create a simple pixel-art SVG representation if appropriate
- Keep it abstract/symbolic — a glowing orb, a geometric monster, a runic shield — not complex characters

Everything else same as Study Mode Renderer.
```

---

# PART 3: PIXEL ART FRONTEND (Adventure Mode Only)

When Adventure Mode is active, the ENTIRE UI transforms into a pixel art aesthetic. When Study Mode is active, the UI remains exactly as it is now. This is a CSS/component-level toggle, not a rebuild.

## Font
- Import "Press Start 2P" from Google Fonts: `@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');`
- In Adventure Mode, apply `font-family: 'Press Start 2P', cursive;` to the entire app
- Reduce font sizes since pixel fonts are visually larger: body text = 10px, headings = 14-16px, buttons = 10-12px
- In Study Mode: keep current fonts unchanged

## Color Palette (Adventure Mode)
```
Background:       #0f0f23 (deep space dark)
Surface:          #1a1a2e (card/panel background)
Primary:          #e94560 (hot pink-red — damage, bosses, danger)
Secondary:        #00ff88 (neon green — health, success, loot)
Accent:           #ffbd39 (gold — XP, streaks, rewards)
Info:             #0096ff (blue — navigation, info)
Text:             #e0e0e0 (light gray)
Text muted:       #6a6a8a (muted purple-gray)
Border:           #2a2a4a (subtle dark border)
User bubble:      #1e3a5f (dark blue)
Bot bubble:       #2a1a3e (dark purple)
```

## Component Transformations (Adventure Mode)

### Chat container
- Background: #0f0f23 with subtle pixel grid pattern (CSS repeating background of 2px dots every 16px, color #1a1a2e)
- Remove all rounded corners — use sharp corners (border-radius: 0) or 2px pixelated corners
- Borders: 3px solid with stepped pixel effect (use box-shadow stacking for pixel border effect)

### Message bubbles
- Sharp corners (border-radius: 0 or 2px)
- User messages: #1e3a5f background, pixel border
- Bot messages: #2a1a3e background, pixel border
- Remove smooth shadows — replace with hard 2px offset pixel shadows: `box-shadow: 3px 3px 0px #000`

### Input field
- Dark background (#1a1a2e), pixel border, placeholder text in pixel font
- Sharp corners, thick border (2-3px solid #2a2a4a)

### Buttons (send, quick reply, etc.)
- Pixel art style: sharp corners, 3px borders, hard shadows
- Quick reply buttons: #1a1a2e background, #e94560 border, on hover fill with #e94560
- Large touch targets: min 48px height
- Button press effect: translate(2px, 2px) + remove shadow (simulates pixel button press)

### Header
- Dark bar (#1a1a2e) with pixel borders
- Mode toggle styled as a pixel art switch
- Adventure mode label in pixel font

### Scrollbar
- Thin, styled to match: track = #0f0f23, thumb = #2a2a4a, thumb hover = #e94560

## Game UI Elements (Adventure Mode Only — new components)

### Boss HP Bar
- Displayed at the top of the chat area during Phase B boss fights
- Full-width bar, 24px height, pixel border
- Background: #1a1a2e
- Fill: gradient from #e94560 (high HP) to #00ff88 (low HP)
- Segmented into pixel blocks (not smooth fill — step every 10%)
- Boss name in pixel font on the left, HP percentage on the right
- Animate damage: flash white, then chunk disappears with a shake effect
- When boss dies: bar shatters into pixel particles

### Dungeon Map (Phase A)
- When the mermaid knowledge graph renders in Adventure Mode, style it with:
  - Dark background
  - Nodes as pixel "rooms" (square, glowing borders)
  - Defeated rooms: green glow (#00ff88)
  - Current room: pulsing gold (#ffbd39)
  - Locked rooms: dim gray (#2a2a4a)
  - Edges as pixelated paths (dashed, not smooth)

### Loot Drop Animation
- When event "loot_drop" fires: pixel chest opens at the bottom of the chat, item floats up with sparkle particles, text shows item name + emoji
- Duration: 2 seconds, then fades into inventory
- Sound effect: optional retro "item get" chime (Web Audio API, short 8-bit sound)

### Boss Defeated Animation
- When event "boss_defeated" fires: screen flash, pixel explosion particles from the HP bar, shake the chat container for 300ms
- The HP bar shatters into falling pixel blocks
- Duration: 1.5 seconds

### Boss Damage Animation
- When event "boss_damage" fires: HP bar flashes white, damage number floats up in red pixel font ("-25 HP"), bar chunks down
- Shake the HP bar slightly (2px translate)
- Duration: 0.5 seconds

### Boss Counter-attack Animation
- When event "boss_counterattack" fires: screen edges flash red briefly (vignette pulse), subtle shake
- Duration: 0.3 seconds

### Wall Demolition (Phase C)
- Display a pixel wall at the top of chat (replacing boss HP bar)
- Wall made of [N] blocks, each block = one concept
- When "wall_block_destroyed" fires: block cracks, then explodes into particles, falls away
- When "wall_destroyed" fires: remaining wall collapses, massive particle explosion, victory fanfare

### Streak Counter
- Displayed in the header next to the mode toggle
- Pixel fire emoji + number: "🔥 7"
- Increments on each correct answer / good explanation
- Resets on a bad answer (boss counter-attack that lands)
- Pulse animation when it increments

### Progress Indicator
- Below the boss HP bar: "Room 3/7 ⚔️ Bosses slain: 2"
- Pixel font, muted color, updates in real-time

### Round Timer (optional)
- Small pixel clock in the corner: "⏱ 3:42"
- Starts when a boss fight begins
- At 5 minutes: "⏱ 5 min round. Keep going or take a break?"

## Message Splitting
- When backend response contains [SPLIT] markers, render each chunk as a separate message bubble
- Add 400-600ms delay between each bubble appearing (typing simulation)
- Each bubble slides in from left with a quick pixel-style entrance (no smooth ease — use step() CSS timing)

## Micro-celebrations
- On streak milestones (5, 10, 15): brief pixel confetti burst (small colored squares falling for 1.5s)
- On boss defeated: full celebration (described above)
- On wall block destroyed: small satisfying particle pop
- Keep ALL celebrations brief (< 2 seconds) — satisfying, not annoying

## Transition between modes
- When toggling Study ↔ Adventure: smooth crossfade (300ms) between the two visual themes
- Session data persists — switching modes mid-session continues from where they were
- Adventure state (boss HP, loot, etc.) only displays in Adventure Mode but data persists in the background

---

# PART 4: SOUND EFFECTS (Optional Enhancement)

If feasible, add retro 8-bit sound effects using Web Audio API (no audio files needed — generate programmatically):

- Boss damage: short "hit" sound (100ms, descending pitch)
- Boss defeated: victory jingle (500ms, ascending arpeggio)
- Loot drop: sparkle sound (300ms, high pitched twinkle)
- Counter-attack: low thud (150ms, bass hit)
- Wall block destroyed: crumble sound (200ms, noise burst)
- Button press: short click (50ms, square wave blip)
- Streak increment: quick ping (100ms)

Include a mute/unmute toggle in the header (pixel speaker icon).
All sounds OFF by default — learner opts in.

---

# PART 5: IMPLEMENTATION ORDER

Suggested build sequence for Claude Code:

1. **Backend: mode passing** — Add mode to API requests/responses, session state adventure fields
2. **Backend: conditional prompts** — Orchestrator reads mode and prepends adventure rules to agent calls
3. **Backend: event generation** — Orchestrator generates adventure events (boss_damage, loot_drop, etc.) based on evaluator scores and conversation flow
4. **Frontend: CSS theme toggle** — Pixel art theme that activates/deactivates with Adventure Mode
5. **Frontend: game UI components** — Boss HP bar, loot animation, wall demolition, streak counter
6. **Frontend: message splitting** — [SPLIT] marker detection and delayed bubble rendering
7. **Frontend: animations** — Damage, defeat, counter-attack, wall destruction visual effects
8. **Frontend: sound effects** — Web Audio API generated sounds (optional, last priority)

Each step should be a working increment — deploy and test after each one.
