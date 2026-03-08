import { describe, it, expect } from 'vitest';
import { parseCircuit, buildLayout, CELL_W, CELL_H, PADDING } from '../circuitLayout';

// ─── parseCircuit ──────────────────────────────────────────────────────────────

describe('parseCircuit', () => {
  it('parses new format (components/connections)', () => {
    const json = JSON.stringify({
      title: 'LED Circuit',
      components: [
        { id: 'V1', type: 'battery', value: '9V', position: [0, 0] },
        { id: 'R1', type: 'resistor', value: '330Ω', position: [2, 0] },
      ],
      connections: [{ from: 'V1.out', to: 'R1.in' }],
    });
    const result = parseCircuit(json);
    expect(result).not.toBeNull();
    expect('components' in result!).toBe(true);
  });

  it('parses legacy format (nodes/wires)', () => {
    const json = JSON.stringify({
      nodes: [
        { id: 'a', x: 100, y: 100, type: 'battery' },
        { id: 'b', x: 300, y: 100, type: 'resistor' },
      ],
      wires: [{ from: 'a', to: 'b' }],
    });
    const result = parseCircuit(json);
    expect(result).not.toBeNull();
    expect('nodes' in result!).toBe(true);
  });

  it('returns null for invalid JSON', () => {
    expect(parseCircuit('not json {')).toBeNull();
  });

  it('strips JS-style comments before parsing', () => {
    const code = `{
      // a comment
      "components": [],
      "connections": []
    }`;
    const result = parseCircuit(code);
    expect(result).not.toBeNull();
  });

  it('tolerates trailing commas', () => {
    const code = `{ "components": [], "connections": [], }`;
    const result = parseCircuit(code);
    expect(result).not.toBeNull();
  });
});

// ─── buildLayout ──────────────────────────────────────────────────────────────

describe('buildLayout - grid to pixel conversion', () => {
  it('places component at correct pixel center for col=0, row=0', () => {
    const spec = {
      components: [{ id: 'V1', type: 'battery', value: '9V', position: [0, 0] as [number, number] }],
      connections: [],
    };
    const layout = buildLayout(spec);
    const node = layout.nodes[0];
    expect(node.cx).toBe(PADDING);
    expect(node.cy).toBe(PADDING);
  });

  it('places component at correct pixel center for col=2, row=1', () => {
    const spec = {
      components: [{ id: 'R1', type: 'resistor', position: [2, 1] as [number, number] }],
      connections: [],
    };
    const layout = buildLayout(spec);
    const node = layout.nodes[0];
    expect(node.cx).toBe(PADDING + 2 * CELL_W);
    expect(node.cy).toBe(PADDING + 1 * CELL_H);
  });

  it('generates a straight horizontal wire between V1.out and R1.in', () => {
    const spec = {
      components: [
        { id: 'V1', type: 'battery', position: [0, 0] as [number, number] },
        { id: 'R1', type: 'resistor', position: [2, 0] as [number, number] },
      ],
      connections: [{ from: 'V1.out', to: 'R1.in' }],
    };
    const layout = buildLayout(spec);
    expect(layout.wires).toHaveLength(1);
    const wire = layout.wires[0];
    // V1.out is at cx+30, R1.in is at cx-30, both at same y
    expect(wire.x1).toBe(PADDING + 30);          // V1 cx + 30
    expect(wire.x2).toBe(PADDING + 2 * CELL_W - 30); // R1 cx - 30
    expect(wire.y1).toBe(PADDING);
    expect(wire.y2).toBe(PADDING);
  });

  it('generates a vertical wire between D1.out and GND.top', () => {
    const spec = {
      components: [
        { id: 'D1', type: 'led', position: [4, 0] as [number, number] },
        { id: 'GND', type: 'ground', position: [4, 1] as [number, number] },
      ],
      connections: [{ from: 'D1.out', to: 'GND.top' }],
    };
    const layout = buildLayout(spec);
    const wire = layout.wires[0];
    // D1.out = (cx+30, cy), GND.top = (cx, cy-20)
    expect(wire.x1).toBe(PADDING + 4 * CELL_W + 30); // D1.cx + 30
    expect(wire.y1).toBe(PADDING);                    // D1.cy
    expect(wire.x2).toBe(PADDING + 4 * CELL_W);       // GND.cx
    expect(wire.y2).toBe(PADDING + CELL_H - 20);      // GND.cy - 20
  });

  it('skips wires for unknown component ids', () => {
    const spec = {
      components: [{ id: 'V1', type: 'battery', position: [0, 0] as [number, number] }],
      connections: [{ from: 'V1.out', to: 'MISSING.in' }],
    };
    const layout = buildLayout(spec);
    expect(layout.wires).toHaveLength(0);
  });

  it('calculates SVG dimensions to fit all components', () => {
    const spec = {
      components: [
        { id: 'A', type: 'battery', position: [0, 0] as [number, number] },
        { id: 'B', type: 'resistor', position: [3, 2] as [number, number] },
      ],
      connections: [],
    };
    const layout = buildLayout(spec);
    // maxCol=3, maxRow=2
    expect(layout.svgWidth).toBeGreaterThan(PADDING * 2 + 3 * CELL_W);
    expect(layout.svgHeight).toBeGreaterThan(PADDING * 2 + 2 * CELL_H);
  });

  it('preserves title from spec', () => {
    const spec = { title: 'My Circuit', components: [], connections: [] };
    const layout = buildLayout(spec);
    expect(layout.title).toBe('My Circuit');
  });
});
