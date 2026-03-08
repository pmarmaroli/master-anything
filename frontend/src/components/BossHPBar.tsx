import { useEffect, useState, useRef } from 'react';
import type { AdventureEvent } from '../types';

interface BossHPBarProps {
  bossName: string;
  hp: number;
  event: AdventureEvent | null;
  roomProgress: string;
  bossesSlain: number;
}

export function BossHPBar({ bossName, hp, event, roomProgress, bossesSlain }: BossHPBarProps) {
  const [displayHP, setDisplayHP] = useState(hp);
  const [shake, setShake] = useState(false);
  const [flash, setFlash] = useState(false);
  const [damageNum, setDamageNum] = useState<number | null>(null);
  const [defeated, setDefeated] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDisplayHP(hp);
  }, [hp]);

  useEffect(() => {
    if (!event) return;

    if (event.event === 'boss_damage') {
      setShake(true);
      setFlash(true);
      setDamageNum(event.damage_dealt);
      setTimeout(() => setShake(false), 300);
      setTimeout(() => setFlash(false), 150);
      setTimeout(() => setDamageNum(null), 1000);
    }

    if (event.event === 'boss_defeated') {
      setDefeated(true);
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setTimeout(() => setDefeated(false), 2000);
    }

    if (event.event === 'boss_counterattack') {
      setShake(true);
      setTimeout(() => setShake(false), 300);
    }
  }, [event]);

  // HP bar color: red at high HP, green at low HP
  const hpColor = displayHP > 60 ? '#e94560' : displayHP > 30 ? '#ffbd39' : '#00ff88';

  // Segmented HP blocks (10 segments)
  const segments = Array.from({ length: 10 }, (_, i) => {
    const segmentThreshold = (i + 1) * 10;
    return displayHP >= segmentThreshold ? 'filled' : displayHP > i * 10 ? 'partial' : 'empty';
  });

  return (
    <div
      ref={barRef}
      className={`relative px-3 py-2 transition-transform ${shake ? 'animate-shake' : ''} ${defeated ? 'animate-shatter' : ''}`}
      style={{ backgroundColor: '#e8eeff', borderBottom: '3px solid #c0ccee' }}
    >
      {/* Boss name and HP */}
      <div className="flex justify-between items-center mb-1" style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '9px' }}>
        <span style={{ color: '#1a1a2e' }}>{bossName}</span>
        <span style={{ color: hpColor }}>{Math.max(0, displayHP)}%</span>
      </div>

      {/* HP Bar */}
      <div className="flex gap-[2px] h-5 relative" style={{ backgroundColor: '#f0f4ff', border: '2px solid #c0ccee' }}>
        {segments.map((seg, i) => (
          <div
            key={i}
            className="flex-1 transition-all duration-300"
            style={{
              backgroundColor: seg === 'empty' ? 'transparent' : flash ? '#ffffff' : hpColor,
              opacity: seg === 'partial' ? 0.5 : 1,
            }}
          />
        ))}

        {/* Damage number popup */}
        {damageNum !== null && (
          <div
            className="absolute right-2 animate-float-up"
            style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '12px', color: '#e94560', top: '-8px' }}
          >
            -{damageNum}
          </div>
        )}
      </div>

      {/* Room progress */}
      <div className="flex justify-between mt-1" style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '7px', color: '#6a6a8a' }}>
        <span>Room {roomProgress}</span>
        <span>Slain: {bossesSlain}</span>
      </div>
    </div>
  );
}
