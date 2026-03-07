import { useEffect, useRef, useState, useCallback } from 'react';
import Matter from 'matter-js';

interface MatterJSRendererProps {
  code: string;
}

export function MatterJSRenderer({ code }: MatterJSRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);
  const renderRef = useRef<Matter.Render | null>(null);

  const stop = useCallback(() => {
    if (runnerRef.current) {
      Matter.Runner.stop(runnerRef.current);
      runnerRef.current = null;
    }
    if (renderRef.current) {
      Matter.Render.stop(renderRef.current);
      if (renderRef.current.canvas && renderRef.current.canvas.parentNode) {
        renderRef.current.canvas.parentNode.removeChild(renderRef.current.canvas);
      }
      renderRef.current = null;
    }
  }, []);

  const run = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    stop();
    setError(null);

    // Clear any leftover canvas elements
    container.innerHTML = '';

    try {
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      const fn = new Function('Matter', 'containerEl', code);
      const result = fn(Matter, container) as {
        render?: Matter.Render;
        runner?: Matter.Runner;
      } | undefined;

      // If the user returned { render, runner }, store them for cleanup.
      if (result && typeof result === 'object') {
        if (result.render) renderRef.current = result.render;
        if (result.runner) runnerRef.current = result.runner;
      } else {
        // Fallback: look for a canvas that was inserted into the container.
        const canvas = container.querySelector('canvas');
        if (!canvas) {
          setError('No canvas was created. Make sure your code appends a Matter.Render canvas to containerEl.');
        }
      }
    } catch (e) {
      setError(`Runtime error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, [code, stop]);

  useEffect(() => {
    run();
    return stop;
  }, [run, stop]);

  return (
    <div className="my-4">
      {error && (
        <div className="mb-2 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm font-mono">
          MatterJSRenderer: {error}
        </div>
      )}
      <div className="flex justify-end mb-1">
        <button
          onClick={run}
          className="text-xs px-3 py-1 bg-slate-100 border border-slate-300 rounded hover:bg-slate-200 transition-colors text-slate-700"
        >
          Reset
        </button>
      </div>
      <div
        ref={containerRef}
        className="overflow-hidden rounded border border-gray-200 shadow-sm bg-white"
        style={{ minHeight: 200 }}
      />
    </div>
  );
}
