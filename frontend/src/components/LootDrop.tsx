import { useEffect, useState } from 'react';

interface LootDropProps {
  loot: { name: string; icon: string } | null;
  show: boolean;
}

export function LootDrop({ loot, show }: LootDropProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show && loot) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [show, loot]);

  if (!visible || !loot) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-end justify-center pb-32">
      <div className="animate-loot-rise text-center">
        {/* Sparkle particles */}
        <div className="relative">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1.5 h-1.5 animate-sparkle"
              style={{
                backgroundColor: ['#ffbd39', '#00ff88', '#0096ff', '#e94560'][i % 4],
                left: `${50 + Math.cos(i * 60 * Math.PI / 180) * 40}%`,
                top: `${50 + Math.sin(i * 60 * Math.PI / 180) * 40}%`,
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
    </div>
  );
}
