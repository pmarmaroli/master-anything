# Renderer Agent — Library-Based Visual Rendering Design

**Date:** 2026-03-07
**Status:** Approved

## Problem

The Renderer Agent generates raw SVG from scratch. LLMs cannot reliably compute coordinates, proportions, or standardized symbols, so geometry diagrams have wrong angles, circuits have misplaced components, and molecular structures are inaccurate.

## Solution

Replace raw SVG generation with structured library API calls. The Renderer Agent outputs JavaScript code or JSON that a specialized library renders correctly. The library handles all visual math.

## Architecture

```
Mentor response → shouldCallRenderer() → callRenderer()
    → Renderer Agent (Azure AI)
    → outputs: ```jsxgraph | ```circuit | ```kekule | ```matterjs | ```mermaid
    → appended to mentor response → streamed to frontend
    → ChatArea.tsx MarkdownContent detects language tag
    → routes to: JSXGraphRenderer | CircuitRenderer | KekuleRenderer | MatterJSRenderer | MermaidDiagram
```

No changes to the streaming pipeline, session management, or agent orchestration.

## Domain → Library Map

| Domain | Library | Output format |
|--------|---------|---------------|
| Geometry, trig, calculus, optics | JSXGraph | `jsxgraph` JS block |
| Molecules, chemical structures | Kekule.js | `kekule` JS block |
| Physics simulations | Matter.js | `matterjs` JS block |
| Circuit schematics, logic gates | Custom JSON | `circuit` JSON block |
| Flowcharts, timelines, mind maps | Mermaid | `mermaid` block (unchanged) |
| Data charts | Recharts/JSX | `jsx` block (unchanged) |

## Backend Changes

### `backend/src/agents/renderer.ts`
Full replacement of system prompt. New prompt:
- Lists domain → library → output format table
- Forbids raw SVG with manual coordinates
- Shows examples for each format
- Keeps `[NO_RENDER]` escape hatch
- Keeps adventure mode pixel-art style note

### `backend/src/services/orchestrator.service.ts`
Update `shouldCallRenderer()` skip condition from:
```ts
if (/```(mermaid|svg)/.test(response)) return false;
```
to:
```ts
if (/```(mermaid|svg|jsxgraph|circuit|kekule|matterjs)/.test(response)) return false;
```

Update `callRenderer()` input message to mention the new formats.

## Frontend Changes

### New components

**`JSXGraphRenderer.tsx`**
- Detects `language-jsxgraph` code blocks
- npm: `jsxgraph` (includes CSS)
- Generates unique div ID, executes JS in scoped function replacing `'box'` with the ID
- Interactive by default (draggable, zoomable)
- Aspect ratio 1:1, max-width 100%

**`CircuitRenderer.tsx`**
- Detects `language-circuit` code blocks
- No external library — pure SVG built from JSON description
- Grid layout: each component occupies a cell
- Inline SVG symbols for: resistor, capacitor, battery, ground, diode, LED, switch, inductor, op-amp, AND/OR/NOT/NAND/NOR/XOR gates, junction dot
- Connections rendered as right-angle wires between component ports
- `overflow-x-auto` for complex circuits

**`KekuleRenderer.tsx`**
- Detects `language-kekule` code blocks
- npm: `kekule`
- Executes JS in scoped context, renders 2D molecule viewer into div

**`MatterJSRenderer.tsx`**
- Detects `language-matterjs` code blocks
- npm: `matter-js` + `@types/matter-js`
- Canvas-based physics simulation
- Play/pause/reset controls
- Touch-friendly

### Modified: `ChatArea.tsx`
Extend `MarkdownContent` code handler to detect new language tags and route to respective components. Order of detection:
1. mermaid (existing)
2. svg (existing)
3. jsxgraph (new)
4. circuit (new)
5. kekule (new)
6. matterjs (new)

## Implementation Order (Approach B — Incremental)

1. JSXGraph + backend prompt update (highest impact, covers math/geometry/optics)
2. Circuit JSON renderer (high demand for electronics topics)
3. Kekule.js (chemistry molecules)
4. Matter.js (physics simulations)
5. Biology templates — **out of scope**, requires human-authored SVG assets

## Out of Scope

- Biology label renderer (`biolabel`) — needs curated base SVG illustrations
- Recharts/JSX renderer — already working
- Mermaid renderer — already working, no change needed

## npm Packages Required

```
frontend:
  jsxgraph
  kekule
  matter-js
  @types/matter-js
```
