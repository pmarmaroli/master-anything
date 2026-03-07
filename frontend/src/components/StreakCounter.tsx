import { useEffect, useState } from 'react';
import { playStreak } from '../utils/sounds';

interface StreakCounterProps {
  streak: number;
  onMilestone?: () => void;
}

export function StreakCounter({ streak, onMilestone }: StreakCounterProps) {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (streak > 0) {
      setPulse(true);
      playStreak();
      const t = setTimeout(() => setPulse(false), 400);

      // Milestone check
      if (streak === 5 || streak === 10 || streak === 15) {
        onMilestone?.();
      }

      return () => clearTimeout(t);
    }
  }, [streak, onMilestone]);

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
      <span>\uD83D\uDD25 {streak}</span>
    </div>
  );
}
