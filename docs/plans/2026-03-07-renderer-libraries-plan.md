# Renderer Agent Library-Based Rendering — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace raw SVG generation in the Renderer Agent with specialized library API calls (JSXGraph, Circuit JSON, smiles-drawer, Matter.js), eliminating inaccurate LLM-drawn diagrams.

**Architecture:** The Renderer Agent's backend prompt is updated to output library-specific code blocks (`jsxgraph`, `circuit`, `kekule`, `matterjs`). New React components in the frontend detect these code block types and execute the library code to render visuals correctly. No changes to streaming pipeline, session management, or agent orchestration logic.

**Tech Stack:** JSXGraph (geometry/math/optics), smiles-drawer (chemistry SMILES strings in `kekule` blocks), Matter.js (physics simulations), custom SVG-from-JSON (circuit schematics), React 18, Vite, TypeScript.

---

### Task 1: Install frontend npm packages

**Files:**
- Modify: `frontend/package.json` (via npm install)

**Step 1: Install packages**

```bash
cd frontend && npm install jsxgraph smiles-drawer matter-js
cd frontend && npm install --save-dev @types/matter-js
```

**Step 2: Verify TypeScript build still passes**

```bash
cd frontend && npx tsc --noEmit
```

Expected: No new errors. If `@types/matter-js` conflicts with built-in types from matter-js itself (v0.19+ includes own types), uninstall it:
```bash
cd frontend && npm uninstall @types/matter-js
```

---

### Task 2: Update backend Renderer Agent prompt

**Files:**
- Modify: `backend/src/agents/renderer.ts`

**Step 1: Replace the entire file content**

```typescript
import { SessionState } from '../types';

export function getRendererPrompt(session: SessionState): string {
  const currentConcept = session.topicMap.concepts[session.conceptIndex] || '';

  return `You are the Renderer Agent. You generate STRUCTURED DATA that specialized libraries render visually. You NEVER generate raw SVG coordinates or paths — libraries handle all visual rendering.

CURRENT STATE:
- Topic: ${session.topicMap.rootTopic || 'Not yet defined'}
- Concept: ${currentConcept}
- Language: ${session.learnerProfile.language}

YOUR WORKFLOW:
1. Receive educational content from the mentor
2. Identify the correct domain and library
3. Generate the library-specific code or configuration
4. Return it wrapped in the appropriate code block

DOMAIN → LIBRARY MAPPING:

| Domain | Library | Output Format |
|--------|---------|---------------|
| Geometry, trigonometry, coordinate math, functions, calculus | JSXGraph | \`\`\`jsxgraph code block |
| Optics (ray tracing, lenses, mirrors) | JSXGraph | \`\`\`jsxgraph code block |
| Molecules, chemical structures, reactions | smiles-drawer | \`\`\`kekule code block (SMILES string only) |
| Physics simulations (gravity, pendulum, springs, collisions) | Matter.js | \`\`\`matterjs code block |
| Circuit schematics, electronics, logic gates | Circuit JSON | \`\`\`circuit code block |
| Flowcharts, timelines, mind maps, hierarchies, sequences | Mermaid | \`\`\`mermaid code block |

CRITICAL RULES:
- NEVER generate raw SVG with manual coordinates. Ever.
- NEVER guess pixel positions, angles, or proportions.
- For JSXGraph: write JavaScript using the JXG API. Always use 'box' as the board ID (the renderer replaces it automatically).
- For chemistry: output ONLY the SMILES string — nothing else. The renderer draws the molecule correctly.
- For circuits: output JSON describing components and connections — the renderer draws all symbols from a pre-built library.
- For Matter.js: write JavaScript using the Matter API. Use 'containerEl' as the element for Matter.Render.
- For Mermaid: use standard Mermaid syntax (already working well).
- Always include a 1-line caption before the code block.
- If content does not benefit from visualization: respond with [NO_RENDER]

JSXGRAPH EXAMPLES:

Right triangle with Pythagorean theorem:
\`\`\`jsxgraph
var board = JXG.JSXGraph.initBoard('box', {boundingbox: [-1, 6, 6, -1], axis: false, showNavigation: false});
var A = board.create('point', [0, 0], {name: 'A', size: 4, color: '#1e40af'});
var B = board.create('point', [4, 0], {name: 'B', size: 4, color: '#1e40af'});
var C = board.create('point', [0, 3], {name: 'C', size: 4, color: '#1e40af'});
board.create('polygon', [A, B, C], {fillColor: '#dbeafe', fillOpacity: 0.4, borders: {strokeColor: '#1e40af', strokeWidth: 2}});
board.create('angle', [B, A, C], {radius: 0.5, orthotype: 'square', fillColor: '#fef3c7'});
board.create('text', [1.8, -0.35], {text: 'a = 4', fontSize: 14, color: '#d97706'});
board.create('text', [-0.7, 1.4], {text: 'b = 3', fontSize: 14, color: '#16a34a'});
board.create('text', [2.2, 1.9], {text: 'c = 5', fontSize: 14, color: '#db2777'});
\`\`\`

Unit circle with sine and cosine:
\`\`\`jsxgraph
var board = JXG.JSXGraph.initBoard('box', {boundingbox: [-1.6, 1.6, 1.6, -1.6], axis: true, showNavigation: false});
board.create('circle', [[0,0], 1], {strokeColor: '#1e40af', strokeWidth: 2, fillColor: '#dbeafe', fillOpacity: 0.15});
var P = board.create('point', [Math.cos(0.9), Math.sin(0.9)], {name: 'P', size: 5, color: '#e94560'});
board.create('line', [[0,0], P], {straightFirst: false, straightLast: false, strokeColor: '#e94560', strokeWidth: 2});
board.create('line', [[Math.cos(0.9), 0], P], {straightFirst: false, straightLast: false, strokeColor: '#16a34a', strokeWidth: 2, dash: 2});
board.create('line', [[0,0], [Math.cos(0.9), 0]], {straightFirst: false, straightLast: false, strokeColor: '#d97706', strokeWidth: 2});
board.create('text', [Math.cos(0.9)/2, -0.15], {text: 'cos θ', color: '#d97706', fontSize: 13});
board.create('text', [Math.cos(0.9)+0.1, Math.sin(0.9)/2], {text: 'sin θ', color: '#16a34a', fontSize: 13});
\`\`\`

Sine function plot:
\`\`\`jsxgraph
var board = JXG.JSXGraph.initBoard('box', {boundingbox: [-7, 2, 7, -2], axis: true, showNavigation: false});
board.create('functiongraph', [function(x){ return Math.sin(x); }], {strokeColor: '#e94560', strokeWidth: 2.5});
board.create('functiongraph', [function(x){ return Math.cos(x); }], {strokeColor: '#1e40af', strokeWidth: 2.5, dash: 2});
board.create('text', [2, 1.2], {text: 'sin(x)', color: '#e94560', fontSize: 14});
board.create('text', [2, -1.3], {text: 'cos(x)', color: '#1e40af', fontSize: 14});
\`\`\`

CHEMISTRY EXAMPLES (output ONLY the SMILES string):
Water: O
Ethanol: CCO
Aspirin: CC(=O)Oc1ccccc1C(=O)O
Glucose: OC[C@H]1OC(O)[C@H](O)[C@@H](O)[C@@H]1O

\`\`\`kekule
CCO
\`\`\`

CIRCUIT JSON EXAMPLES:

Simple LED circuit:
\`\`\`circuit
{
  "title": "LED Circuit",
  "components": [
    { "id": "V1", "type": "battery", "value": "9V", "position": [0, 0] },
    { "id": "R1", "type": "resistor", "value": "330Ω", "position": [2, 0] },
    { "id": "D1", "type": "led", "value": "red", "position": [4, 0] },
    { "id": "GND", "type": "ground", "position": [4, 1] }
  ],
  "connections": [
    { "from": "V1.out", "to": "R1.in" },
    { "from": "R1.out", "to": "D1.in" },
    { "from": "D1.out", "to": "GND.top" }
  ]
}
\`\`\`

RC low-pass filter:
\`\`\`circuit
{
  "title": "RC Low-Pass Filter",
  "components": [
    { "id": "V1", "type": "battery", "value": "5V", "position": [0, 0] },
    { "id": "R1", "type": "resistor", "value": "10kΩ", "position": [2, 0] },
    { "id": "C1", "type": "capacitor", "value": "100µF", "position": [4, 0] },
    { "id": "GND", "type": "ground", "position": [4, 1] }
  ],
  "connections": [
    { "from": "V1.out", "to": "R1.in" },
    { "from": "R1.out", "to": "C1.in" },
    { "from": "C1.out", "to": "V1.in" },
    { "from": "C1.bottom", "to": "GND.top" }
  ]
}
\`\`\`

Available component types: resistor, capacitor, battery, voltage_source, ground, diode, led, switch, inductor, and, or, not, nand, nor, xor (logic gates render as labeled boxes)

MATTERJS EXAMPLE (simple pendulum):
\`\`\`matterjs
var engine = Matter.Engine.create();
var pivot = Matter.Bodies.circle(300, 50, 8, { isStatic: true, render: { fillStyle: '#1e40af' } });
var ball = Matter.Bodies.circle(300, 280, 24, { restitution: 0.9, render: { fillStyle: '#e94560' } });
var arm = Matter.Constraint.create({ bodyA: pivot, bodyB: ball, length: 220, stiffness: 1, render: { strokeStyle: '#1e40af', lineWidth: 2 } });
Matter.Composite.add(engine.world, [pivot, ball, arm]);
var render = Matter.Render.create({ element: containerEl, engine: engine, options: { width: 600, height: 350, wireframes: false, background: '#f8fafc' } });
Matter.Render.run(render);
Matter.Runner.run(Matter.Runner.create(), engine);
\`\`\`

Always use the learner's language for labels and captions.
Never reveal the multi-agent architecture. You are part of the same unified learning companion.`;
}
```

**Step 2: Verify TypeScript compiles**

```bash
cd backend && npx tsc --noEmit
```

Expected: No errors.

---

### Task 3: Update shouldCallRenderer and callRenderer input

**Files:**
- Modify: `backend/src/services/orchestrator.service.ts`
- Modify: `backend/src/__tests__/services/orchestrator.service.test.ts`

**Step 1: Add tests to the existing test file**

In `backend/src/__tests__/services/orchestrator.service.test.ts`, add a new `describe` block after the existing `selectAgent` block:

```typescript
describe('shouldCallRenderer', () => {
  const service = new OrchestratorService() as any;

  it('returns false for non-mentor agents', () => {
    expect(service.shouldCallRenderer('architect', 'A long response about circuits and diagrams with 300+ characters. '.repeat(6))).toBe(false);
    expect(service.shouldCallRenderer('challenger', 'A long response about circuits and diagrams with 300+ characters. '.repeat(6))).toBe(false);
  });

  it('returns false if response already has a mermaid block', () => {
    expect(service.shouldCallRenderer('mentor', 'Here is a diagram\n```mermaid\ngraph TD\n```')).toBe(false);
  });

  it('returns false if response already has an svg block', () => {
    expect(service.shouldCallRenderer('mentor', 'Diagram:\n```svg\n<svg></svg>\n```')).toBe(false);
  });

  it('returns false if response already has a jsxgraph block', () => {
    expect(service.shouldCallRenderer('mentor', 'Graph:\n```jsxgraph\nvar board = JXG.JSXGraph.initBoard(...);\n```')).toBe(false);
  });

  it('returns false if response already has a circuit block', () => {
    expect(service.shouldCallRenderer('mentor', 'Circuit:\n```circuit\n{"components":[]}\n```')).toBe(false);
  });

  it('returns false if response already has a kekule block', () => {
    expect(service.shouldCallRenderer('mentor', 'Molecule:\n```kekule\nCCO\n```')).toBe(false);
  });

  it('returns false if response already has a matterjs block', () => {
    expect(service.shouldCallRenderer('mentor', 'Physics:\n```matterjs\nvar engine = Matter.Engine.create();\n```')).toBe(false);
  });

  it('returns false if response is too short', () => {
    expect(service.shouldCallRenderer('mentor', 'Short response with circuit diagram.')).toBe(false);
  });
});
```

**Step 2: Run tests — expect new tests to fail**

```bash
cd backend && npm test -- --testPathPattern=orchestrator.service.test
```

Expected: The new `shouldCallRenderer` tests for `jsxgraph`, `circuit`, `kekule`, `matterjs` fail. Existing tests pass.

**Step 3: Update shouldCallRenderer**

In `backend/src/services/orchestrator.service.ts`, find the line (~529):

```typescript
if (/```(mermaid|svg)/.test(response)) return false;
```

Change to:

```typescript
if (/```(mermaid|svg|jsxgraph|circuit|kekule|matterjs)/.test(response)) return false;
```

**Step 4: Update callRenderer input message**

Find the line (~547):

```typescript
const rendererInput = `Based on this educational content, create an appropriate visual (mermaid or SVG):\n\n${primaryResponse.slice(0, 2000)}`;
```

Change to:

```typescript
const rendererInput = `Based on this educational content, create an appropriate visual using the correct library format:\n- jsxgraph: geometry, math, functions, calculus, optics\n- circuit JSON: electronics, circuits, logic gates\n- kekule (SMILES string): chemistry molecules and structures\n- matterjs: physics simulations (gravity, pendulum, springs)\n- mermaid: flowcharts, timelines, mind maps\n\nContent:\n${primaryResponse.slice(0, 2000)}`;
```

**Step 5: Run tests — expect all to pass**

```bash
cd backend && npm test -- --testPathPattern=orchestrator.service.test
```

Expected: All tests pass including the new `shouldCallRenderer` tests.

**Step 6: Commit backend changes**

```bash
cd backend
git add src/agents/renderer.ts src/services/orchestrator.service.ts src/__tests__/services/orchestrator.service.test.ts
git commit -m "feat: update Renderer Agent to output library API calls instead of raw SVG"
```

---

### Task 4: Create JSXGraphRenderer component

**Files:**
- Create: `frontend/src/components/JSXGraphRenderer.tsx`

**Step 1: Create the component**

```typescript
import { useEffect, useRef } from 'react';
import JXG from 'jsxgraph';
import 'jsxgraph/distrib/jsxgraph.css';

interface Props {
  code: string;
}

export function JSXGraphRenderer({ code }: Props) {
  // Stable unique ID for the board div — useRef ensures it never changes across re-renders
  const boardId = useRef(`jxg-${Math.random().toString(36).slice(2, 9)}`).current;

  useEffect(() => {
    // Replace the 'box' placeholder that JSXGraph docs use with our unique div ID
    const patched = code
      .replace(/'box'/g, `'${boardId}'`)
      .replace(/"box"/g, `"${boardId}"`);

    try {
      // eslint-disable-next-line no-new-func
      const fn = new Function('JXG', patched);
      fn(JXG);
    } catch (err) {
      console.warn('[JSXGraph] Render error:', err);
    }

    return () => {
      // Clean up the board when component unmounts or code changes
      try {
        JXG.JSXGraph.freeBoard(boardId);
      } catch {
        // Board may not exist if initialization failed — that's fine
      }
    };
  }, [code, boardId]);

  return (
    <div
      id={boardId}
      className="my-4 mx-auto border border-gray-200 rounded-lg overflow-hidden"
      style={{ width: '100%', maxWidth: '480px', aspectRatio: '1 / 1' }}
    />
  );
}
```

**Step 2: Handle potential import issues**

If `import JXG from 'jsxgraph'` causes a TypeScript error ("module has no default export"), try:

```typescript
import * as JXG from 'jsxgraph';
```

If the CSS import path doesn't resolve, check the actual filename:
```bash
ls frontend/node_modules/jsxgraph/distrib/*.css
```
Use the exact filename found.

**Step 3: Verify build**

```bash
cd frontend && npx tsc --noEmit
```

Expected: No errors.

---

### Task 5: Wire JSXGraph into ChatArea and commit

**Files:**
- Modify: `frontend/src/components/ChatArea.tsx`

**Step 1: Add import at top of ChatArea.tsx**

After the existing `MermaidDiagram` import (line 8):

```typescript
import { JSXGraphRenderer } from './JSXGraphRenderer';
```

**Step 2: Add detection in the code handler**

Inside `MarkdownContent`, in the `code({ className, children })` handler, add after the SVG detection block (after line ~124) and before the fallback `<code>` return:

```typescript
if (/language-jsxgraph/.test(className || '')) {
  return <JSXGraphRenderer code={text} />;
}
```

The full updated handler order should be:
1. mermaid (existing)
2. svg (existing)
3. jsxgraph (new — add here)
4. fallback `<code>` (existing)

**Step 3: Verify build**

```bash
cd frontend && npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add frontend/src/components/JSXGraphRenderer.tsx frontend/src/components/ChatArea.tsx
git commit -m "feat: add JSXGraphRenderer for geometry, math, and optics diagrams"
```

---

### Task 6: Create CircuitRenderer component

**Files:**
- Create: `frontend/src/components/CircuitRenderer.tsx`

No external library — pure SVG generated from the JSON description.

**Step 1: Create the component**

```typescript
import { useMemo } from 'react';

interface CircuitComponent {
  id: string;
  type: string;
  value?: string;
  position: [number, number]; // [col, row] on grid
}

interface CircuitConnection {
  from: string; // "V1.out"
  to: string;   // "R1.in"
}

interface CircuitData {
  title?: string;
  components: CircuitComponent[];
  connections: CircuitConnection[];
}

// Grid and style constants
const CELL = 120;  // pixels per grid cell
const PAD = 50;    // padding around the circuit
const S = '#1e40af'; // stroke color
const F = '#dbeafe'; // fill color
const W = 2;         // default stroke width

/** Returns the pixel coordinate of a component port */
function getPort(comp: CircuitComponent, port: string): { x: number; y: number } {
  const cx = PAD + comp.position[0] * CELL + CELL / 2;
  const cy = PAD + comp.position[1] * CELL + CELL / 2;
  switch (port) {
    case 'in':     return { x: cx - CELL / 2, y: cy };
    case 'out':    return { x: cx + CELL / 2, y: cy };
    case 'top':    return { x: cx, y: cy - CELL / 2 };
    case 'bottom': return { x: cx, y: cy + CELL / 2 };
    default:       return { x: cx, y: cy };
  }
}

function Label({ cx, cy, id, value }: { cx: number; cy: number; id: string; value?: string }) {
  return (
    <text x={cx} y={cy + 40} textAnchor="middle" fontSize={11} fill={S}>
      {id}{value ? `: ${value}` : ''}
    </text>
  );
}

function Resistor({ cx, cy, id, value }: { cx: number; cy: number; id: string; value?: string }) {
  return (
    <g>
      <line x1={cx - 55} y1={cy} x2={cx - 20} y2={cy} stroke={S} strokeWidth={W} />
      <polyline
        fill="none" stroke={S} strokeWidth={W}
        points={`${cx-20},${cy} ${cx-14},${cy-11} ${cx-4},${cy+11} ${cx+6},${cy-11} ${cx+16},${cy+11} ${cx+20},${cy}`}
      />
      <line x1={cx + 20} y1={cy} x2={cx + 55} y2={cy} stroke={S} strokeWidth={W} />
      <Label cx={cx} cy={cy} id={id} value={value} />
    </g>
  );
}

function Capacitor({ cx, cy, id, value }: { cx: number; cy: number; id: string; value?: string }) {
  return (
    <g>
      <line x1={cx - 55} y1={cy} x2={cx - 8} y2={cy} stroke={S} strokeWidth={W} />
      <line x1={cx - 8} y1={cy - 18} x2={cx - 8} y2={cy + 18} stroke={S} strokeWidth={3.5} />
      <line x1={cx + 8} y1={cy - 18} x2={cx + 8} y2={cy + 18} stroke={S} strokeWidth={3.5} />
      <line x1={cx + 8} y1={cy} x2={cx + 55} y2={cy} stroke={S} strokeWidth={W} />
      <Label cx={cx} cy={cy} id={id} value={value} />
    </g>
  );
}

function Battery({ cx, cy, id, value }: { cx: number; cy: number; id: string; value?: string }) {
  return (
    <g>
      <line x1={cx - 55} y1={cy} x2={cx - 10} y2={cy} stroke={S} strokeWidth={W} />
      {/* Negative terminal — short thick */}
      <line x1={cx - 10} y1={cy - 12} x2={cx - 10} y2={cy + 12} stroke={S} strokeWidth={4} />
      {/* Positive terminal — long thin */}
      <line x1={cx} y1={cy - 20} x2={cx} y2={cy + 20} stroke={S} strokeWidth={1.5} />
      {/* Second cell */}
      <line x1={cx + 10} y1={cy - 12} x2={cx + 10} y2={cy + 12} stroke={S} strokeWidth={4} />
      <line x1={cx + 10} y1={cy} x2={cx + 55} y2={cy} stroke={S} strokeWidth={W} />
      <text x={cx - 10} y={cy - 16} textAnchor="middle" fontSize={9} fill={S}>−</text>
      <text x={cx + 10} y={cy - 16} textAnchor="middle" fontSize={9} fill={S}>+</text>
      <Label cx={cx} cy={cy} id={id} value={value} />
    </g>
  );
}

function Ground({ cx, cy, id }: { cx: number; cy: number; id: string }) {
  return (
    <g>
      <line x1={cx} y1={cy - 30} x2={cx} y2={cy} stroke={S} strokeWidth={W} />
      <line x1={cx - 20} y1={cy} x2={cx + 20} y2={cy} stroke={S} strokeWidth={W + 1} />
      <line x1={cx - 13} y1={cy + 8} x2={cx + 13} y2={cy + 8} stroke={S} strokeWidth={W + 1} />
      <line x1={cx - 6} y1={cy + 16} x2={cx + 6} y2={cy + 16} stroke={S} strokeWidth={W + 1} />
      <text x={cx} y={cy + 34} textAnchor="middle" fontSize={11} fill={S}>{id}</text>
    </g>
  );
}

function Diode({ cx, cy, id, value }: { cx: number; cy: number; id: string; value?: string }) {
  return (
    <g>
      <line x1={cx - 55} y1={cy} x2={cx - 18} y2={cy} stroke={S} strokeWidth={W} />
      <polygon points={`${cx-18},${cy-14} ${cx-18},${cy+14} ${cx+18},${cy}`} fill={F} stroke={S} strokeWidth={W} />
      <line x1={cx + 18} y1={cy - 14} x2={cx + 18} y2={cy + 14} stroke={S} strokeWidth={W} />
      <line x1={cx + 18} y1={cy} x2={cx + 55} y2={cy} stroke={S} strokeWidth={W} />
      <Label cx={cx} cy={cy} id={id} value={value} />
    </g>
  );
}

function LED({ cx, cy, id, value }: { cx: number; cy: number; id: string; value?: string }) {
  return (
    <g>
      <line x1={cx - 55} y1={cy} x2={cx - 18} y2={cy} stroke={S} strokeWidth={W} />
      <polygon points={`${cx-18},${cy-14} ${cx-18},${cy+14} ${cx+18},${cy}`} fill={F} stroke={S} strokeWidth={W} />
      <line x1={cx + 18} y1={cy - 14} x2={cx + 18} y2={cy + 14} stroke={S} strokeWidth={W} />
      <line x1={cx + 18} y1={cy} x2={cx + 55} y2={cy} stroke={S} strokeWidth={W} />
      {/* Light emission arrows */}
      <line x1={cx + 4} y1={cy - 18} x2={cx + 14} y2={cy - 30} stroke={S} strokeWidth={1.5} />
      <line x1={cx + 14} y1={cy - 30} x2={cx + 11} y2={cy - 30} stroke={S} strokeWidth={1.5} />
      <line x1={cx + 14} y1={cy - 30} x2={cx + 14} y2={cy - 27} stroke={S} strokeWidth={1.5} />
      <line x1={cx + 10} y1={cy - 23} x2={cx + 22} y2={cy - 35} stroke={S} strokeWidth={1.5} />
      <line x1={cx + 22} y1={cy - 35} x2={cx + 19} y2={cy - 35} stroke={S} strokeWidth={1.5} />
      <line x1={cx + 22} y1={cy - 35} x2={cx + 22} y2={cy - 32} stroke={S} strokeWidth={1.5} />
      <Label cx={cx} cy={cy} id={id} value={value} />
    </g>
  );
}

function Switch({ cx, cy, id, value }: { cx: number; cy: number; id: string; value?: string }) {
  return (
    <g>
      <line x1={cx - 55} y1={cy} x2={cx - 18} y2={cy} stroke={S} strokeWidth={W} />
      <circle cx={cx - 18} cy={cy} r={3} fill={S} />
      <line x1={cx - 18} y1={cy} x2={cx + 14} y2={cy - 18} stroke={S} strokeWidth={W} />
      <circle cx={cx + 18} cy={cy} r={3} fill={S} />
      <line x1={cx + 18} y1={cy} x2={cx + 55} y2={cy} stroke={S} strokeWidth={W} />
      <Label cx={cx} cy={cy} id={id} value={value} />
    </g>
  );
}

function Inductor({ cx, cy, id, value }: { cx: number; cy: number; id: string; value?: string }) {
  // 4 upward arcs (sweep=0 = counterclockwise = curves above the line)
  return (
    <g>
      <line x1={cx - 55} y1={cy} x2={cx - 28} y2={cy} stroke={S} strokeWidth={W} />
      <path d={`M${cx-28},${cy} a7,7 0 0,0 14,0`} fill="none" stroke={S} strokeWidth={W} />
      <path d={`M${cx-14},${cy} a7,7 0 0,0 14,0`} fill="none" stroke={S} strokeWidth={W} />
      <path d={`M${cx},${cy} a7,7 0 0,0 14,0`} fill="none" stroke={S} strokeWidth={W} />
      <path d={`M${cx+14},${cy} a7,7 0 0,0 14,0`} fill="none" stroke={S} strokeWidth={W} />
      <line x1={cx + 28} y1={cy} x2={cx + 55} y2={cy} stroke={S} strokeWidth={W} />
      <Label cx={cx} cy={cy} id={id} value={value} />
    </g>
  );
}

function GenericBox({ cx, cy, id, type, value }: { cx: number; cy: number; id: string; type: string; value?: string }) {
  return (
    <g>
      <line x1={cx - 55} y1={cy} x2={cx - 28} y2={cy} stroke={S} strokeWidth={W} />
      <rect x={cx - 28} y={cy - 20} width={56} height={40} fill={F} stroke={S} strokeWidth={W} rx={2} />
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize={10} fill={S} fontWeight="bold">
        {type.toUpperCase()}
      </text>
      <text x={cx} y={cy + 11} textAnchor="middle" fontSize={9} fill={S}>{value || ''}</text>
      <line x1={cx + 28} y1={cy} x2={cx + 55} y2={cy} stroke={S} strokeWidth={W} />
      <text x={cx} y={cy + 40} textAnchor="middle" fontSize={11} fill={S}>{id}</text>
    </g>
  );
}

function CircuitSymbol({ comp }: { comp: CircuitComponent }) {
  const cx = PAD + comp.position[0] * CELL + CELL / 2;
  const cy = PAD + comp.position[1] * CELL + CELL / 2;
  const { id, type, value } = comp;
  switch (type) {
    case 'resistor':       return <Resistor cx={cx} cy={cy} id={id} value={value} />;
    case 'capacitor':      return <Capacitor cx={cx} cy={cy} id={id} value={value} />;
    case 'battery':
    case 'voltage_source': return <Battery cx={cx} cy={cy} id={id} value={value} />;
    case 'ground':         return <Ground cx={cx} cy={cy} id={id} />;
    case 'diode':          return <Diode cx={cx} cy={cy} id={id} value={value} />;
    case 'led':            return <LED cx={cx} cy={cy} id={id} value={value} />;
    case 'switch':         return <Switch cx={cx} cy={cy} id={id} value={value} />;
    case 'inductor':       return <Inductor cx={cx} cy={cy} id={id} value={value} />;
    default:               return <GenericBox cx={cx} cy={cy} id={id} type={type} value={value} />;
  }
}

export function CircuitRenderer({ code }: { code: string }) {
  const data = useMemo<CircuitData | null>(() => {
    try { return JSON.parse(code); }
    catch { return null; }
  }, [code]);

  if (!data || !Array.isArray(data.components)) {
    return (
      <pre className="my-4 p-3 bg-red-50 text-red-600 rounded text-xs overflow-x-auto">
        Invalid circuit JSON:{'\n'}{code.slice(0, 300)}
      </pre>
    );
  }

  const maxCol = data.components.reduce((m, c) => Math.max(m, c.position[0]), 0) + 1;
  const maxRow = data.components.reduce((m, c) => Math.max(m, c.position[1]), 0) + 1;
  const svgW = PAD * 2 + maxCol * CELL;
  const svgH = PAD * 2 + maxRow * CELL + 20; // +20 for labels below bottom row
  const compMap = new Map(data.components.map(c => [c.id, c]));

  return (
    <div className="my-4 overflow-x-auto">
      {data.title && (
        <p className="text-center text-sm font-medium text-gray-700 mb-1">{data.title}</p>
      )}
      <svg
        width={svgW}
        height={svgH}
        viewBox={`0 0 ${svgW} ${svgH}`}
        style={{ maxWidth: '100%', display: 'block', margin: '0 auto' }}
        fontFamily="system-ui, sans-serif"
      >
        {/* Wires drawn first so components render on top */}
        {(data.connections || []).map((conn, i) => {
          const [fromId, fromPort] = conn.from.split('.');
          const [toId, toPort] = conn.to.split('.');
          const fromComp = compMap.get(fromId);
          const toComp = compMap.get(toId);
          if (!fromComp || !toComp) return null;
          const p1 = getPort(fromComp, fromPort || 'out');
          const p2 = getPort(toComp, toPort || 'in');
          const midX = (p1.x + p2.x) / 2;
          return (
            <polyline
              key={i}
              points={`${p1.x},${p1.y} ${midX},${p1.y} ${midX},${p2.y} ${p2.x},${p2.y}`}
              fill="none"
              stroke={S}
              strokeWidth={W}
              strokeLinejoin="round"
            />
          );
        })}
        {/* Components */}
        {data.components.map(comp => (
          <CircuitSymbol key={comp.id} comp={comp} />
        ))}
      </svg>
    </div>
  );
}
```

**Step 2: Verify build**

```bash
cd frontend && npx tsc --noEmit
```

Expected: No errors.

**Step 3: Wire into ChatArea.tsx**

Add import after the JSXGraphRenderer import:

```typescript
import { CircuitRenderer } from './CircuitRenderer';
```

Add detection in the code handler, after the jsxgraph block:

```typescript
if (/language-circuit/.test(className || '')) {
  return <CircuitRenderer code={text} />;
}
```

**Step 4: Verify build and commit**

```bash
cd frontend && npx tsc --noEmit
git add frontend/src/components/CircuitRenderer.tsx frontend/src/components/ChatArea.tsx
git commit -m "feat: add CircuitRenderer for electronics schematics from JSON"
```

---

### Task 7: Create KekuleRenderer component

**Files:**
- Create: `frontend/src/components/KekuleRenderer.tsx`

Uses `smiles-drawer` (npm-installed) to render SMILES strings. The code block is named `kekule` as specified — only the library rendering it differs from the spec.

**Step 1: Create the component**

```typescript
import { useEffect, useRef, useState } from 'react';

interface Props {
  code: string;
}

export function KekuleRenderer({ code }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const smiles = code.trim();
    if (!smiles) return;

    setError(null);

    // Dynamic import keeps smiles-drawer out of the initial bundle
    import('smiles-drawer').then(({ default: SmilesDrawer }) => {
      const drawer = new SmilesDrawer.Drawer({
        width: 400,
        height: 300,
        bondThickness: 1.5,
        fontSizeLarge: 13,
        padding: 20,
      });

      SmilesDrawer.parse(
        smiles,
        (tree: unknown) => {
          if (canvasRef.current) {
            drawer.draw(tree, canvasRef.current, 'light', false);
          }
        },
        (err: unknown) => {
          setError(`Cannot render molecule "${smiles}": ${String(err)}`);
        }
      );
    }).catch(err => {
      setError(`Failed to load molecule renderer: ${String(err)}`);
    });
  }, [code]);

  if (error) {
    return (
      <pre className="my-4 p-3 bg-red-50 text-red-600 rounded text-xs overflow-x-auto">
        {error}
      </pre>
    );
  }

  return (
    <div className="my-4 flex justify-center">
      <canvas
        ref={canvasRef}
        width={400}
        height={300}
        style={{ maxWidth: '100%', border: '1px solid #e5e7eb', borderRadius: '8px' }}
      />
    </div>
  );
}
```

**Step 2: Handle missing TypeScript types for smiles-drawer**

If TypeScript errors with "Could not find a declaration file for module 'smiles-drawer'", create `frontend/src/smiles-drawer.d.ts`:

```typescript
declare module 'smiles-drawer' {
  interface DrawerOptions {
    width: number;
    height: number;
    bondThickness?: number;
    fontSizeLarge?: number;
    padding?: number;
  }

  class Drawer {
    constructor(options: DrawerOptions);
    draw(tree: unknown, canvas: HTMLCanvasElement, theme: 'light' | 'dark', isometric: boolean): void;
  }

  function parse(
    smiles: string,
    onSuccess: (tree: unknown) => void,
    onError: (err: unknown) => void
  ): void;

  const SmilesDrawer: { Drawer: typeof Drawer; parse: typeof parse };
  export default SmilesDrawer;
}
```

**Step 3: Verify build**

```bash
cd frontend && npx tsc --noEmit
```

**Step 4: Wire into ChatArea.tsx**

Add import after CircuitRenderer import:

```typescript
import { KekuleRenderer } from './KekuleRenderer';
```

Add detection in the code handler, after the circuit block:

```typescript
if (/language-kekule/.test(className || '')) {
  return <KekuleRenderer code={text} />;
}
```

**Step 5: Verify build and commit**

```bash
cd frontend && npx tsc --noEmit
git add frontend/src/components/KekuleRenderer.tsx frontend/src/components/ChatArea.tsx
git commit -m "feat: add KekuleRenderer for chemistry molecule visualization via SMILES"
```

---

### Task 8: Create MatterJSRenderer component

**Files:**
- Create: `frontend/src/components/MatterJSRenderer.tsx`

**Step 1: Create the component**

```typescript
import { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';

interface Props {
  code: string;
}

export function MatterJSRenderer({ code }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  const execute = () => {
    if (!containerRef.current) return;
    // Clear any previous canvas/render
    containerRef.current.innerHTML = '';
    setError(null);

    try {
      // The LLM code uses 'containerEl' as the Matter.Render element
      // eslint-disable-next-line no-new-func
      const fn = new Function('Matter', 'containerEl', code);
      fn(Matter, containerRef.current);
    } catch (err) {
      setError(String(err));
    }
  };

  useEffect(() => {
    execute();
    return () => {
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  return (
    <div className="my-4">
      <div
        ref={containerRef}
        style={{ width: '100%', maxWidth: '600px', margin: '0 auto', overflow: 'hidden' }}
      />
      {error && (
        <pre className="mt-2 p-2 bg-red-50 text-red-600 rounded text-xs overflow-x-auto">
          {error}
        </pre>
      )}
      <div className="flex justify-center mt-2">
        <button
          onClick={execute}
          className="px-3 py-1 text-xs bg-blue-50 border border-blue-300 text-blue-700 rounded hover:bg-blue-100"
        >
          ↺ Reset simulation
        </button>
      </div>
    </div>
  );
}
```

**Step 2: Verify build**

```bash
cd frontend && npx tsc --noEmit
```

If `@types/matter-js` conflicts with matter-js's own bundled types, remove it:
```bash
cd frontend && npm uninstall @types/matter-js
cd frontend && npx tsc --noEmit
```

**Step 3: Wire into ChatArea.tsx**

Add import after KekuleRenderer import:

```typescript
import { MatterJSRenderer } from './MatterJSRenderer';
```

Add detection in the code handler, after the kekule block:

```typescript
if (/language-matterjs/.test(className || '')) {
  return <MatterJSRenderer code={text} />;
}
```

The final order of detections in the code handler:
1. mermaid (existing)
2. svg (existing)
3. jsxgraph
4. circuit
5. kekule
6. matterjs
7. fallback `<code>` (existing)

**Step 4: Verify build and commit**

```bash
cd frontend && npx tsc --noEmit
git add frontend/src/components/MatterJSRenderer.tsx frontend/src/components/ChatArea.tsx
git commit -m "feat: add MatterJSRenderer for physics simulations"
```

---

### Task 9: Final verification

**Step 1: Full TypeScript build check for both workspaces**

```bash
cd frontend && npx tsc --noEmit
cd backend && npx tsc --noEmit
```

Expected: No errors in either workspace.

**Step 2: Run all backend tests**

```bash
cd backend && npm test
```

Expected: All tests pass.

**Step 3: Start the dev server and verify no runtime errors**

```bash
cd frontend && npm run dev
```

Expected: Server starts on localhost with no console errors.

**Step 4: Manual smoke test — paste these directly into chat as code blocks**

Test JSXGraph (paste as ` ```jsxgraph ` block):
```
var board = JXG.JSXGraph.initBoard('box', {boundingbox: [-5, 5, 5, -5], axis: true});
board.create('functiongraph', [function(x){ return Math.sin(x); }], {strokeColor: '#e94560', strokeWidth: 2.5});
```

Expected: Interactive graph of sin(x) appears, draggable and zoomable.

Test Circuit (paste as ` ```circuit ` block):
```
{"title":"LED Circuit","components":[{"id":"V1","type":"battery","value":"9V","position":[0,0]},{"id":"R1","type":"resistor","value":"330Ω","position":[2,0]},{"id":"D1","type":"led","value":"red","position":[4,0]}],"connections":[{"from":"V1.out","to":"R1.in"},{"from":"R1.out","to":"D1.in"}]}
```

Expected: Clean circuit diagram with battery, resistor, LED, and connecting wires.

Test Kekule (paste as ` ```kekule ` block):
```
CCO
```

Expected: 2D structure of ethanol drawn on canvas.

Test Matter.js (paste as ` ```matterjs ` block):
```
var engine = Matter.Engine.create();
var ball = Matter.Bodies.circle(300, 50, 30, {restitution:0.8, render:{fillStyle:'#e94560'}});
var ground = Matter.Bodies.rectangle(300, 380, 600, 20, {isStatic:true, render:{fillStyle:'#1e40af'}});
Matter.Composite.add(engine.world, [ball, ground]);
var render = Matter.Render.create({element:containerEl, engine:engine, options:{width:600,height:400,wireframes:false,background:'#f8fafc'}});
Matter.Render.run(render);
Matter.Runner.run(Matter.Runner.create(), engine);
```

Expected: Bouncing ball physics simulation with Reset button.

---

## Summary of all files changed

**Backend:**
- `backend/src/agents/renderer.ts` — full replacement (library-dispatch prompt)
- `backend/src/services/orchestrator.service.ts` — 2 lines (shouldCallRenderer regex + callRenderer message)
- `backend/src/__tests__/services/orchestrator.service.test.ts` — new describe block

**Frontend (new files):**
- `frontend/src/components/JSXGraphRenderer.tsx`
- `frontend/src/components/CircuitRenderer.tsx`
- `frontend/src/components/KekuleRenderer.tsx`
- `frontend/src/components/MatterJSRenderer.tsx`
- `frontend/src/smiles-drawer.d.ts` (if needed)

**Frontend (modified):**
- `frontend/src/components/ChatArea.tsx` — 4 imports + 4 detection blocks in MarkdownContent
