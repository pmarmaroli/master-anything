# Renderer Libraries Implementation — Context Summary

**Date:** 2026-03-07
**Branch:** master (4 commits ahead of origin/master)
**Goal:** Replace raw SVG generation in the Renderer Agent with specialized JavaScript libraries (JSXGraph, Circuit JSON, smiles-drawer, Matter.js) that render visuals correctly.

---

## What We Did

### 1. Design & Planning (complete)
- Ran brainstorming skill → design approved by user
- Wrote design doc: `docs/plans/2026-03-07-renderer-libraries-design.md`
- Wrote implementation plan: `docs/plans/2026-03-07-renderer-libraries-plan.md`
- Approach B (incremental): JSXGraph → Circuit → Kekule → Matter.js

### 2. npm Packages Installed (complete, NOT yet committed)
In `frontend/`:
- `jsxgraph` v1.12.2 — geometry, math, optics diagrams
- `smiles-drawer` v2.1.7 — chemistry molecule rendering
- `matter-js` v0.20.0 — physics simulations
- `@types/matter-js` v0.20.2 — TypeScript types for matter-js

`frontend/package.json` and `frontend/package-lock.json` are modified but not staged.

### 3. Backend: Renderer Agent Prompt (committed: `05ba5dc`, `32fd8c0`)
- `backend/src/agents/renderer.ts` — fully replaced
- Old behavior: LLM generated raw SVG coordinates (inaccurate)
- New behavior: LLM outputs structured library API calls in typed code blocks:
  - ` ```jsxgraph ` — JSXGraph JavaScript for geometry/math/optics
  - ` ```kekule ` — SMILES string for chemistry molecules
  - ` ```matterjs ` — Matter.js JavaScript for physics simulations
  - ` ```circuit ` — JSON description for electronics schematics
  - ` ```mermaid ` — unchanged, already working
- Includes examples for each domain, explicit "NEVER generate raw SVG" rule
- Fixed: `currentConcept` fallback changed from `''` to `'Not yet defined'`

### 4. Backend: Orchestrator Service (committed: `b1dde98`)
- `backend/src/services/orchestrator.service.ts` — 2 line changes:
  1. `shouldCallRenderer()` regex updated from `/(mermaid|svg)/` to `/(mermaid|svg|jsxgraph|circuit|kekule|matterjs)/` — prevents double-rendering when a visual is already present
  2. `callRenderer()` input message updated to describe all library formats to the Renderer Agent
- `backend/src/__tests__/services/orchestrator.service.test.ts` — added 8 new tests for `shouldCallRenderer` covering all new block types (all 15 tests pass)

### 5. JSXGraph Frontend Renderer (committed: `baedaae`)
- `frontend/src/components/JSXGraphRenderer.tsx` — created and committed
  - Takes JSXGraph JS code as string
  - Creates stable unique board ID via `useRef`
  - Patches `'box'` → unique ID in code string
  - Executes code via `new Function('JXG', patched)`
  - Cleanup via `JXG.JSXGraph.freeBoard()` on unmount
  - 480px max-width, 1:1 aspect ratio, interactive (draggable/zoomable)
- `frontend/src/components/ChatArea.tsx` — JSXGraph import + `language-jsxgraph` detection added (committed as part of same commit)

### 6. Remaining Renderers (created by subagent, NOT yet committed)
All 3 files exist on disk but are untracked:

**`frontend/src/components/CircuitRenderer.tsx`**
- No external library — pure SVG generated from JSON
- Supports: resistor, capacitor, battery, ground, diode, LED, switch, inductor, generic labeled box
- Orthogonal wire routing between component ports
- Grid layout: each component at `[col, row]` position, 120px cell size

**`frontend/src/components/KekuleRenderer.tsx`**
- Uses `smiles-drawer` (dynamic import for code splitting)
- Input: SMILES string from `kekule` code blocks
- Renders to `<canvas>` element

**`frontend/src/components/MatterJSRenderer.tsx`**
- Imports `matter-js` directly
- Executes LLM code via `new Function('Matter', 'containerEl', code)`
- Reset button clears and re-runs the simulation
- `containerEl` is the div ref passed to `Matter.Render.create`

**`frontend/src/types/smiles-drawer.d.ts`** — TypeScript type declarations for smiles-drawer (no bundled types)

**`frontend/src/components/ChatArea.tsx`** — already has imports + detections for all 3 new renderers added (modified, not staged)

---

## Current Git State

```
4 commits ahead of origin/master:
  baedaae feat: add JSXGraphRenderer for geometry, math, and optics diagrams
  b1dde98 feat: update shouldCallRenderer to skip new library block types, update renderer input message
  32fd8c0 fix: use consistent fallback for currentConcept in renderer prompt
  05ba5dc feat: update Renderer Agent to output library API calls instead of raw SVG
```

**Uncommitted / untracked files:**
```
Modified (not staged):
  frontend/package.json
  frontend/package-lock.json
  frontend/src/components/ChatArea.tsx

Untracked:
  frontend/src/components/CircuitRenderer.tsx
  frontend/src/components/KekuleRenderer.tsx
  frontend/src/components/MatterJSRenderer.tsx
  frontend/src/types/smiles-drawer.d.ts
  docs/plans/2026-03-07-renderer-libraries-design.md
  docs/plans/2026-03-07-renderer-libraries-plan.md
```

---

## What Still Needs to Be Done

### Step 1: Verify TypeScript builds clean
```bash
cd frontend && npx tsc --noEmit
cd backend && npx tsc --noEmit
```

### Step 2: Run backend tests
```bash
cd backend && npm test
```
Expected: 15/15 pass (including the 8 new shouldCallRenderer tests)

### Step 3: Run Vite build check
```bash
cd frontend && npm run build
```
This catches bundler issues that `tsc --noEmit` misses (e.g., bad CSS imports, missing assets).

### Step 4: Commit everything remaining
```bash
git add frontend/package.json frontend/package-lock.json
git add frontend/src/components/CircuitRenderer.tsx
git add frontend/src/components/KekuleRenderer.tsx
git add frontend/src/components/MatterJSRenderer.tsx
git add frontend/src/components/ChatArea.tsx
git add frontend/src/types/smiles-drawer.d.ts
git add docs/plans/
git commit -m "feat: add CircuitRenderer, KekuleRenderer, MatterJSRenderer + wire all into ChatArea"
```

### Step 5: Push and open PR (or merge)
```bash
git push origin master
```
Or create a PR if working in a feature branch.

---

## Out of Scope (intentionally deferred)
- **Biology templates** (`biolabel` blocks) — requires human-authored base SVG illustrations for animal cell, plant cell, DNA, neuron, etc. Not feasible without asset creation.
- **Adventure mode pixel-art styling** for new renderers — can be added later via CSS/theming

---

## Key Files Reference
| File | Status | Purpose |
|------|--------|---------|
| `backend/src/agents/renderer.ts` | Committed | LLM prompt: library-dispatch |
| `backend/src/services/orchestrator.service.ts` | Committed | Skip-detection + renderer input |
| `backend/src/__tests__/services/orchestrator.service.test.ts` | Committed | Tests for shouldCallRenderer |
| `frontend/src/components/JSXGraphRenderer.tsx` | Committed | Geometry/math/optics renderer |
| `frontend/src/components/CircuitRenderer.tsx` | **Not committed** | Electronics schematic renderer |
| `frontend/src/components/KekuleRenderer.tsx` | **Not committed** | Chemistry molecule renderer |
| `frontend/src/components/MatterJSRenderer.tsx` | **Not committed** | Physics simulation renderer |
| `frontend/src/components/ChatArea.tsx` | **Not committed** | Routes code blocks to renderers |
| `frontend/src/types/smiles-drawer.d.ts` | **Not committed** | TS types for smiles-drawer |
| `frontend/package.json` | **Not committed** | New npm packages |
| `docs/plans/2026-03-07-renderer-libraries-design.md` | **Not committed** | Design doc |
| `docs/plans/2026-03-07-renderer-libraries-plan.md` | **Not committed** | Implementation plan |
