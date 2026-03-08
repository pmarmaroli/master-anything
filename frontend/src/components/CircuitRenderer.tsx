import { useMemo } from 'react';
import {
  parseCircuit, buildLayout, buildLegacyLayout, isNewFormat,
  type Layout,
} from './circuitLayout';

// ─── Component Symbols ────────────────────────────────────────────────────────

function ComponentSymbol({ type, label, value }: { type: string; label?: string; value?: string }) {
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
    case 'voltage_source':
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
          <line x1="14" y1="-14" x2="20" y2="-20" stroke="currentColor" strokeWidth="1.5" />
          <line x1="18" y1="-8" x2="26" y2="-12" stroke="currentColor" strokeWidth="1.5" />
          {text && <text x="0" y="-16" textAnchor="middle" fontSize="10" fill="currentColor">{text}</text>}
        </g>
      );

    // Bulb / lamp (ampoule) — circle with cross inside
    case 'bulb':
    case 'lamp':
    case 'ampoule':
      return (
        <g>
          <line x1="-30" y1="0" x2="-12" y2="0" stroke="currentColor" strokeWidth="2" />
          <circle cx="0" cy="0" r="12" fill="none" stroke="currentColor" strokeWidth="2" />
          <line x1="-8" y1="-8" x2="8" y2="8" stroke="currentColor" strokeWidth="1.5" />
          <line x1="8" y1="-8" x2="-8" y2="8" stroke="currentColor" strokeWidth="1.5" />
          <line x1="12" y1="0" x2="30" y2="0" stroke="currentColor" strokeWidth="2" />
          {text && <text x="0" y="-18" textAnchor="middle" fontSize="10" fill="currentColor">{text}</text>}
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

    // Logic gates as labeled boxes
    case 'and': case 'or': case 'not': case 'nand': case 'nor': case 'xor':
      return (
        <g>
          <line x1="-30" y1="0" x2="-16" y2="0" stroke="currentColor" strokeWidth="2" />
          <rect x="-16" y="-14" width="32" height="28" fill="none" stroke="currentColor" strokeWidth="2" />
          <line x1="16" y1="0" x2="30" y2="0" stroke="currentColor" strokeWidth="2" />
          <text x="0" y="4" textAnchor="middle" fontSize="9" fill="currentColor">{type.toUpperCase()}</text>
        </g>
      );

    case 'box':
    default:
      return (
        <g>
          <line x1="-30" y1="0" x2="-16" y2="0" stroke="currentColor" strokeWidth="2" />
          <rect x="-16" y="-14" width="32" height="28" fill="none" stroke="currentColor" strokeWidth="2" />
          <line x1="16" y1="0" x2="30" y2="0" stroke="currentColor" strokeWidth="2" />
          {text && <text x="0" y="4" textAnchor="middle" fontSize="10" fill="currentColor">{text}</text>}
        </g>
      );
  }
}

// ─── Orthogonal wire path ─────────────────────────────────────────────────────

function wirePath(x1: number, y1: number, x2: number, y2: number): string {
  const mx = (x1 + x2) / 2;
  return `M${x1},${y1} L${mx},${y1} L${mx},${y2} L${x2},${y2}`;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CircuitRenderer({ code }: { code: string }) {
  const layout = useMemo<Layout | null>(() => {
    const spec = parseCircuit(code);
    if (!spec) return null;
    return isNewFormat(spec) ? buildLayout(spec) : buildLegacyLayout(spec);
  }, [code]);

  if (!layout) {
    return (
      <div className="my-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm font-mono">
        CircuitRenderer: invalid JSON — check syntax.
        <pre className="mt-2 text-xs whitespace-pre-wrap">{code}</pre>
      </div>
    );
  }

  const { nodes, wires, svgWidth, svgHeight, title } = layout;

  return (
    <div className="my-4 flex flex-col items-center gap-1 overflow-x-auto">
      {title && <p className="text-sm text-gray-500 italic">{title}</p>}
      <svg
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="bg-white border border-gray-200 rounded shadow-sm"
        style={{ color: '#1e293b' }}
      >
        {wires.map((w, i) => (
          <path
            key={i}
            d={wirePath(w.x1, w.y1, w.x2, w.y2)}
            fill="none"
            stroke="#1e293b"
            strokeWidth="2"
          />
        ))}
        {nodes.map(node => (
          <g key={node.id} transform={`translate(${node.cx},${node.cy})`}>
            <ComponentSymbol type={node.type} label={node.label} value={node.value} />
            <text x="0" y="30" textAnchor="middle" fontSize="9" fill="#64748b">{node.id}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}
