import { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({ startOnLoad: false, theme: 'neutral' });

interface MermaidDiagramProps {
  chart: string;
}

export function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const render = async () => {
      if (!containerRef.current) return;
      const id = `mermaid-${Math.random().toString(36).slice(2)}`;
      try {
        const { svg } = await mermaid.render(id, chart);
        containerRef.current.innerHTML = svg;
      } catch {
        containerRef.current.innerHTML = `<pre class="text-red-500 text-sm">Failed to render diagram</pre>`;
      }
    };
    render();
  }, [chart]);

  return <div ref={containerRef} className="my-4 flex justify-center" />;
}
