import { useMemo } from 'react';

interface CircuitNode {
  id: string;
  x: number;
  y: number;
  type:
    | 'resistor'
    | 'capacitor'
    | 'battery'
    | 'ground'
    | 'diode'
    | 'led'
    | 'switch'
    | 'inductor'
    | 'box';
  label?: string;
  value?: string;
}

interface CircuitWire {
  from: string;
  to: string;
}

interface CircuitSpec {
  nodes: CircuitNode[];
  wires?: CircuitWire[];
  width?: number;
  height?: number;
}

// Each symbol is drawn centered at (0,0), fitting roughly in a 60x30 box.
function ComponentSymbol({ type, label, value }: { type: CircuitNode['type']; label?: string; value?: string }) {
  const text = value ?? label ?? '';

  switch (type) {
    case 'resistor':
      return (
        <g>
          <line x1="-30" y1="0" x2="-10" y2="0" stroke="currentColor" strokeWidth="2" />
          <rect x="-10" y="-8" width="20" height="16" fill="none" stroke="currentColor" strokeWidth="2" />
          <line x1="10" y1="0" x2="30" y2="0" stroke="currentColor" strokeWidth="2" />
          {text && <text x="0" y="-14" textAnchor="middle" fontSize="10" fill="currentColor">{text}</text>}
        </g>
      );

    case 'capacitor':
      return (
        <g>
          <line x1="-30" y1="0" x2="-4" y2="0" stroke="currentColor" strokeWidth="2" />
          <line x1="-4" y1="-12" x2="-4" y2="12" stroke="currentColor" strokeWidth="3" />
          <line x1="4" y1="-12" x2="4" y2="12" stroke="currentColor" strokeWidth="3" />
          <line x1="4" y1="0" x2="30" y2="0" stroke="currentColor" strokeWidth="2" />
          {text && <text x="0" y="-18" textAnchor="middle" fontSize="10" fill="currentColor">{text}</text>}
        </g>
      );

    case 'battery':
      return (
        <g>
          <line x1="-30" y1="0" x2="-6" y2="0" stroke="currentColor" strokeWidth="2" />
          <line x1="-6" y1="-14" x2="-6" y2="14" stroke="currentColor" strokeWidth="3" />
          <line x1="0" y1="-8" x2="0" y2="8" stroke="currentColor" strokeWidth="1.5" />
          <line x1="0" y1="0" x2="30" y2="0" stroke="currentColor" strokeWidth="2" />
          <text x="-9" y="-16" textAnchor="middle" fontSize="9" fill="currentColor">+</text>
          <text x="3" y="-10" textAnchor="middle" fontSize="9" fill="currentColor">−</text>
          {text && <text x="0" y="22" textAnchor="middle" fontSize="10" fill="currentColor">{text}</text>}
        </g>
      );

    case 'ground':
      return (
        <g>
          <line x1="0" y1="-20" x2="0" y2="0" stroke="currentColor" strokeWidth="2" />
          <line x1="-16" y1="0" x2="16" y2="0" stroke="currentColor" strokeWidth="2.5" />
          <line x1="-10" y1="6" x2="10" y2="6" stroke="currentColor" strokeWidth="2" />
          <line x1="-4" y1="12" x2="4" y2="12" stroke="currentColor" strokeWidth="1.5" />
        </g>
      );

    case 'diode':
      return (
        <g>
          <line x1="-30" y1="0" x2="-10" y2="0" stroke="currentColor" strokeWidth="2" />
          <polygon points="-10,10 -10,-10 10,0" fill="currentColor" />
          <line x1="10" y1="-10" x2="10" y2="10" stroke="currentColor" strokeWidth="2.5" />
          <line x1="10" y1="0" x2="30" y2="0" stroke="currentColor" strokeWidth="2" />
          {text && <text x="0" y="-16" textAnchor="middle" fontSize="10" fill="currentColor">{text}</text>}
        </g>
      );

    case 'led':
      return (
        <g>
          <line x1="-30" y1="0" x2="-10" y2="0" stroke="currentColor" strokeWidth="2" />
          <polygon points="-10,10 -10,-10 10,0" fill="currentColor" />
          <line x1="10" y1="-10" x2="10" y2="10" stroke="currentColor" strokeWidth="2.5" />
          <line x1="10" y1="0" x2="30" y2="0" stroke="currentColor" strokeWidth="2" />
          {/* Light rays */}
          <line x1="14" y1="-14" x2="20" y2="-20" stroke="currentColor" strokeWidth="1.5" />
          <line x1="18" y1="-8" x2="26" y2="-12" stroke="currentColor" strokeWidth="1.5" />
          {text && <text x="0" y="-16" textAnchor="middle" fontSize="10" fill="currentColor">{text}</text>}
        </g>
      );

    case 'switch':
      return (
        <g>
          <line x1="-30" y1="0" x2="-10" y2="0" stroke="currentColor" strokeWidth="2" />
          <circle cx="-10" cy="0" r="3" fill="currentColor" />
          <line x1="-10" y1="0" x2="10" y2="-12" stroke="currentColor" strokeWidth="2" />
          <circle cx="10" cy="0" r="3" fill="currentColor" />
          <line x1="10" y1="0" x2="30" y2="0" stroke="currentColor" strokeWidth="2" />
          {text && <text x="0" y="-20" textAnchor="middle" fontSize="10" fill="currentColor">{text}</text>}
        </g>
      );

    case 'inductor':
      return (
        <g>
          <line x1="-30" y1="0" x2="-14" y2="0" stroke="currentColor" strokeWidth="2" />
          <path
            d="M-14,0 Q-10,-12 -6,0 Q-2,-12 2,0 Q6,-12 10,0 Q14,-12 18,0"
            fill="none" stroke="currentColor" strokeWidth="2"
          />
          <line x1="18" y1="0" x2="30" y2="0" stroke="currentColor" strokeWidth="2" />
          {text && <text x="0" y="-18" textAnchor="middle" fontSize="10" fill="currentColor">{text}</text>}
        </g>
      );

    case 'box':
    default:
      return (
        <g>
          <line x1="-30" y1="0" x2="-16" y2="0" stroke="currentColor" strokeWidth="2" />
          <rect x="-16" y="-14" width="32" height="28" fill="none" stroke="currentColor" strokeWidth="2" />
          <line x1="16" y1="0" x2="30" y2="0" stroke="currentColor" strokeWidth="2" />
          {text && (
            <text x="0" y="4" textAnchor="middle" fontSize="10" fill="currentColor">{text}</text>
          )}
        </g>
      );
  }
}

function parseCircuit(code: string): CircuitSpec | null {
  try {
    // Strip markdown-style comments and parse as JSON5-ish (we'll just use JSON).
    const cleaned = code
      .replace(/\/\/[^\n]*/g, '')
      .replace(/,(\s*[}\]])/g, '$1')
      .trim();
    return JSON.parse(cleaned) as CircuitSpec;
  } catch {
    // Try a simple fallback: wrap bare object in braces if needed.
    try {
      return JSON.parse(`{${code}}`) as CircuitSpec;
    } catch {
      return null;
    }
  }
}

// Orthogonal wire routing: go horizontal then vertical.
function wirePath(x1: number, y1: number, x2: number, y2: number): string {
  const mx = (x1 + x2) / 2;
  return `M${x1},${y1} L${mx},${y1} L${mx},${y2} L${x2},${y2}`;
}

export function CircuitRenderer({ code }: { code: string }) {
  const spec = useMemo(() => parseCircuit(code), [code]);

  if (!spec) {
    return (
      <div className="my-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm font-mono">
        CircuitRenderer: invalid JSON — check syntax.
        <pre className="mt-2 text-xs whitespace-pre-wrap">{code}</pre>
      </div>
    );
  }

  const { nodes = [], wires = [], width = 500, height = 300 } = spec;

  // Build node id → position map for wire routing.
  const nodeMap = new Map<string, CircuitNode>(nodes.map(n => [n.id, n]));

  return (
    <div className="my-4 flex justify-center overflow-x-auto">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="bg-white border border-gray-200 rounded shadow-sm"
        style={{ color: '#1e293b' }}
      >
        {/* Wires first (behind components) */}
        {wires.map((wire, i) => {
          const a = nodeMap.get(wire.from);
          const b = nodeMap.get(wire.to);
          if (!a || !b) return null;
          return (
            <path
              key={i}
              d={wirePath(a.x, a.y, b.x, b.y)}
              fill="none"
              stroke="#1e293b"
              strokeWidth="2"
            />
          );
        })}

        {/* Components */}
        {nodes.map(node => (
          <g key={node.id} transform={`translate(${node.x},${node.y})`}>
            <ComponentSymbol type={node.type} label={node.label} value={node.value} />
          </g>
        ))}
      </svg>
    </div>
  );
}
