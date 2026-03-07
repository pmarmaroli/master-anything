import { useEffect, useState } from 'react';

interface StreakCounterProps {
  streak: number;
}

export function StreakCounter({ streak }: StreakCounterProps) {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (streak > 0) {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 400);
      return () => clearTimeout(t);
    }
  }, [streak]);

  if (streak === 0) return null;

  return (
    <div
      className={`flex items-center gap-1 px-2 py-1 ${pulse ? 'animate-pulse-quick' : ''}`}
      style={{
        fontFamily: "'Press Start 2P', cursive",
        fontSize: '10px',
        color: '#ffbd39',
      }}
    >
      <span>x{streak}</span>
    </div>
  );
}
