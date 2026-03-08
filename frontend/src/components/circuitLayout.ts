// ─── Constants (exported for tests) ──────────────────────────────────────────
export const CELL_W = 140;
export const CELL_H = 100;
export const PADDING = 70;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NewComponent {
  id: string;
  type: string;
  value?: string;
  label?: string;
  position: [number, number]; // [col, row]
}

export interface NewConnection {
  from: string; // e.g. "V1.out"
  to: string;   // e.g. "R1.in"
}

export interface NewCircuitSpec {
  title?: string;
  components: NewComponent[];
  connections?: NewConnection[];
}

export interface LegacyNode {
  id: string;
  x: number;
  y: number;
  type: string;
  label?: string;
  value?: string;
}

export interface LegacyCircuitSpec {
  nodes: LegacyNode[];
  wires?: { from: string; to: string }[];
  width?: number;
  height?: number;
}

export type CircuitSpec = NewCircuitSpec | LegacyCircuitSpec;

export interface LayoutNode {
  id: string;
  type: string;
  label?: string;
  value?: string;
  cx: number;
  cy: number;
}

export interface LayoutWire {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface Layout {
  nodes: LayoutNode[];
  wires: LayoutWire[];
  svgWidth: number;
  svgHeight: number;
  title?: string;
}

// ─── Port offsets from component center ───────────────────────────────────────

const PORT_OFFSETS: Record<string, [number, number]> = {
  in:     [-30,   0],
  left:   [-30,   0],
  out:    [ 30,   0],
  right:  [ 30,   0],
  top:    [  0, -20],
  bottom: [  0,  20],
};

function getPortPosition(node: LayoutNode, port: string): [number, number] {
  const offset = PORT_OFFSETS[port] ?? [0, 0];
  return [node.cx + offset[0], node.cy + offset[1]];
}

// ─── Parsing ──────────────────────────────────────────────────────────────────

export function isNewFormat(spec: CircuitSpec): spec is NewCircuitSpec {
  return 'components' in spec;
}

export function parseCircuit(code: string): CircuitSpec | null {
  try {
    const cleaned = code
      .replace(/\/\/[^\n]*/g, '')
      .replace(/,(\s*[}\]])/g, '$1')
      .trim();
    return JSON.parse(cleaned) as CircuitSpec;
  } catch {
    try {
      return JSON.parse(`{${code}}`) as CircuitSpec;
    } catch {
      return null;
    }
  }
}

// ─── Layout builders ──────────────────────────────────────────────────────────

export function buildLayout(spec: NewCircuitSpec): Layout {
  let maxCol = 0;
  let maxRow = 0;
  for (const c of spec.components) {
    if (c.position[0] > maxCol) maxCol = c.position[0];
    if (c.position[1] > maxRow) maxRow = c.position[1];
  }

  const svgWidth = PADDING * 2 + maxCol * CELL_W + 60;
  const svgHeight = PADDING * 2 + maxRow * CELL_H + 60;

  const nodes: LayoutNode[] = spec.components.map(c => ({
    id: c.id,
    type: c.type,
    label: c.label,
    value: c.value,
    cx: PADDING + c.position[0] * CELL_W,
    cy: PADDING + c.position[1] * CELL_H,
  }));

  const nodeMap = new Map<string, LayoutNode>(nodes.map(n => [n.id, n]));

  const wires: LayoutWire[] = [];
  for (const conn of spec.connections ?? []) {
    const [fromId, fromPort = 'out'] = conn.from.split('.');
    const [toId, toPort = 'in'] = conn.to.split('.');
    const fromNode = nodeMap.get(fromId);
    const toNode = nodeMap.get(toId);
    if (!fromNode || !toNode) continue;
    const [x1, y1] = getPortPosition(fromNode, fromPort);
    const [x2, y2] = getPortPosition(toNode, toPort);
    wires.push({ x1, y1, x2, y2 });
  }

  return { nodes, wires, svgWidth, svgHeight, title: spec.title };
}

export function buildLegacyLayout(spec: LegacyCircuitSpec): Layout {
  const { nodes = [], wires: legacyWires = [], width = 500, height = 300 } = spec;
  const nodeMap = new Map<string, LegacyNode>(nodes.map(n => [n.id, n]));

  const layoutNodes: LayoutNode[] = nodes.map(n => ({
    id: n.id,
    type: n.type,
    label: n.label,
    value: n.value,
    cx: n.x,
    cy: n.y,
  }));

  const layoutWires: LayoutWire[] = legacyWires
    .map(w => {
      const a = nodeMap.get(w.from);
      const b = nodeMap.get(w.to);
      if (!a || !b) return null;
      return { x1: a.x, y1: a.y, x2: b.x, y2: b.y };
    })
    .filter(Boolean) as LayoutWire[];

  return { nodes: layoutNodes, wires: layoutWires, svgWidth: width, svgHeight: height };
}
