import { useEffect, useState } from 'react';
import type { AdventureEvent } from '../types';

interface WallDemolitionProps {
  totalBlocks: number;
  blocksRemaining: number;
  event: AdventureEvent | null;
}

export function WallDemolition({ totalBlocks, blocksRemaining, event }: WallDemolitionProps) {
  const [destroyedIndex, setDestroyedIndex] = useState<number | null>(null);
  const [wallCollapsed, setWallCollapsed] = useState(false);
  const destroyed = totalBlocks - blocksRemaining;

  useEffect(() => {
    if (!event) return;
    if (event.event === 'wall_block_destroyed') {
      setDestroyedIndex(destroyed - 1);
      setTimeout(() => setDestroyedIndex(null), 800);
    }
    if (event.event === 'wall_destroyed') {
      setWallCollapsed(true);
      setTimeout(() => setWallCollapsed(false), 2500);
    }
  }, [event, destroyed]);

  if (totalBlocks === 0) return null;

  return (
    <div
      className={`px-3 py-2 ${wallCollapsed ? 'animate-shatter' : ''}`}
      style={{ backgroundColor: '#1a1a2e', borderBottom: '3px solid #2a2a4a' }}
    >
      <div className="flex justify-between mb-1" style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '8px', color: '#6a6a8a' }}>
        <span>FINAL WALL</span>
        <span>{destroyed}/{totalBlocks}</span>
      </div>
      <div className="flex gap-1 h-8">
        {Array.from({ length: totalBlocks }, (_, i) => {
          const isDestroyed = i < destroyed;
          const isExploding = i === destroyedIndex;
          return (
            <div
              key={i}
              className={`flex-1 transition-all duration-300 ${isExploding ? 'animate-block-explode' : ''}`}
              style={{
                backgroundColor: isDestroyed ? 'transparent' : '#4a3a2a',
                border: isDestroyed ? '1px dashed #2a2a4a' : '2px solid #6a5a4a',
                boxShadow: isDestroyed ? 'none' : '2px 2px 0px #000',
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
