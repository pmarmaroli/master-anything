import { useEffect, useState } from 'react';

interface PixelConfettiProps {
  show: boolean;
}

const COLORS = ['#e94560', '#00ff88', '#ffbd39', '#0096ff', '#8b5cf6', '#ff6b6b'];

export function PixelConfetti({ show }: PixelConfettiProps) {
  const [particles, setParticles] = useState<{ id: number; x: number; color: string; delay: number; size: number }[]>([]);

  useEffect(() => {
    if (!show) return;
    const p = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      delay: Math.random() * 0.5,
      size: 4 + Math.floor(Math.random() * 4),
    }));
    setParticles(p);
    const t = setTimeout(() => setParticles([]), 1800);
    return () => clearTimeout(t);
  }, [show]);

  if (particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map(p => (
        <div
          key={p.id}
          className="confetti-particle"
          style={{
            left: `${p.x}%`,
            top: '-10px',
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
