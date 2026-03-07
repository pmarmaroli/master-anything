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

function sanitizeChart(raw: string): string {
  return raw
    // Replace curly quotes/apostrophes with straight ones
    .replace(/[\u2018\u2019\u2032]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    // Replace en/em dashes with regular dashes
    .replace(/[\u2013\u2014]/g, '-')
    // Wrap node labels containing special chars in quotes if not already
    .replace(/\[([^\]]*[&<>()#{}@!].*?)\]/g, (_, label) => `["${label.replace(/"/g, "'")}"]`);
}

export function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
    const render = async () => {
      if (!containerRef.current) return;
      const id = `mermaid-${Math.random().toString(36).slice(2)}`;
      const sanitized = sanitizeChart(chart);
      try {
        const { svg } = await mermaid.render(id, sanitized);
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

  return <div ref={containerRef} className="my-4 flex justify-center mermaid-container" />;
}
