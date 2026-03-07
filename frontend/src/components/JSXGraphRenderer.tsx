import { useEffect, useRef } from 'react';
import * as JXG from 'jsxgraph';
import 'jsxgraph/distrib/jsxgraph.css';

interface Props {
  code: string;
}

export function JSXGraphRenderer({ code }: Props) {
  // Stable unique ID — useRef ensures it never changes across re-renders
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
        // Board may not exist if initialization failed
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
