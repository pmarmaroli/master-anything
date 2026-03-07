import { useEffect, useState } from 'react';

interface LootDropProps {
  loot: { name: string; icon: string } | null;
  show: boolean;
}

type Phase = 'hidden' | 'chest-closed' | 'chest-open' | 'item-rise';

export function LootDrop({ loot, show }: LootDropProps) {
  const [phase, setPhase] = useState<Phase>('hidden');

  useEffect(() => {
    if (!show || !loot) {
      setPhase('hidden');
      return;
    }

    setPhase('chest-closed');
    const t1 = setTimeout(() => setPhase('chest-open'), 400);
    const t2 = setTimeout(() => setPhase('item-rise'), 800);
    const t3 = setTimeout(() => setPhase('hidden'), 2800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [show, loot]);

  if (phase === 'hidden' || !loot) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-end justify-center pb-32">
      <div className="text-center">

        {/* Phase 1: closed chest */}
        {phase === 'chest-closed' && (
          <div className="animate-chest-appear text-6xl mb-2">📦</div>
        )}

        {/* Phase 2: open chest shaking */}
        {phase === 'chest-open' && (
          <div className="animate-chest-shake text-6xl mb-2">📫</div>
        )}

        {/* Phase 3: item rises with sparkles */}
        {phase === 'item-rise' && (
          <div className="animate-loot-rise">
            <div className="relative">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1.5 h-1.5 animate-sparkle"
                  style={{
                    backgroundColor: ['#ffbd39', '#00ff88', '#0096ff', '#e94560'][i % 4],
                    left: `${50 + Math.cos(i * 60 * Math.PI / 180) * 40}%`,
                    top:  `${50 + Math.sin(i * 60 * Math.PI / 180) * 40}%`,
                    animationDelay: `${i * 0.1}s`,
                  }}
                />
              ))}
              <div className="text-5xl mb-2">{loot.icon}</div>
            </div>
            <div
              className="px-4 py-2"
              style={{
                fontFamily: "'Press Start 2P', cursive",
                fontSize: '10px',
                color: '#ffbd39',
                textShadow: '2px 2px 0px #000',
              }}
            >
              {loot.name}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
