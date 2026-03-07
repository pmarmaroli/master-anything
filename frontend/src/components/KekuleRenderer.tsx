import { useEffect, useRef, useState } from 'react';

interface KekuleRendererProps {
  code: string;
}

export function KekuleRenderer({ code }: KekuleRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  const smiles = code.trim();

  useEffect(() => {
    if (!smiles) return;

    let cancelled = false;

    import('smiles-drawer').then((SmilesDrawer) => {
      if (cancelled) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const drawer = new SmilesDrawer.Drawer({
        width: canvas.width,
        height: canvas.height,
        bondThickness: 1.2,
        padding: 24,
        themes: {
          light: {
            C: '#1e293b',
            O: '#dc2626',
            N: '#2563eb',
            F: '#16a34a',
            CL: '#15803d',
            BR: '#92400e',
            I: '#7c3aed',
            P: '#ea580c',
            S: '#ca8a04',
            B: '#dc2626',
            SI: '#475569',
            H: '#64748b',
            BACKGROUND: '#ffffff',
          },
        },
      });

      SmilesDrawer.parse(
        smiles,
        (tree: unknown) => {
          if (cancelled) return;
          try {
            drawer.draw(tree, canvas, 'light', false);
            setError(null);
          } catch (e) {
            setError(`Draw error: ${e instanceof Error ? e.message : String(e)}`);
          }
        },
        (err: unknown) => {
          if (cancelled) return;
          setError(`Parse error: ${err instanceof Error ? err.message : String(err)}`);
        }
      );
    }).catch((e) => {
      if (cancelled) return;
      setError(`Failed to load smiles-drawer: ${e instanceof Error ? e.message : String(e)}`);
    });

    return () => {
      cancelled = true;
    };
  }, [smiles]);

  if (error) {
    return (
      <div className="my-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm font-mono">
        KekuleRenderer: {error}
        <pre className="mt-2 text-xs whitespace-pre-wrap">{smiles}</pre>
      </div>
    );
  }

  return (
    <div className="my-4 flex flex-col items-center gap-1">
      <canvas
        ref={canvasRef}
        width={400}
        height={300}
        className="bg-white border border-gray-200 rounded shadow-sm"
        style={{ maxWidth: '100%' }}
      />
      {smiles && (
        <span className="text-xs text-gray-400 font-mono">{smiles}</span>
      )}
    </div>
  );
}
