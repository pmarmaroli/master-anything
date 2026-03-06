import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'neutral',
  suppressErrorRendering: true,
});

interface MermaidDiagramProps {
  chart: string;
}

export function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
    const render = async () => {
      if (!containerRef.current) return;
      const id = `mermaid-${Math.random().toString(36).slice(2)}`;
      try {
        const { svg } = await mermaid.render(id, chart);
        if (containerRef.current) containerRef.current.innerHTML = svg;
      } catch {
        if (containerRef.current) containerRef.current.innerHTML = '';
        setFailed(true);
        // Clean up any error SVGs mermaid may have injected into the DOM
        document.querySelectorAll(`#d${id}, #${id}`).forEach(el => el.remove());
      }
    };
    render();
  }, [chart]);

  if (failed) {
    return (
      <pre className="my-4 p-3 bg-gray-800 text-gray-200 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap">
        {chart}
      </pre>
    );
  }

  return <div ref={containerRef} className="my-4 flex justify-center" />;
}
