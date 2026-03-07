import { useEffect, useState } from 'react';

interface MasteryBadgeProps {
  concept: string;
  show: boolean;
  onDismiss: () => void;
  reward?: { name: string; emoji: string; description: string } | null;
}

export function MasteryBadge({ concept, show, onDismiss, reward }: MasteryBadgeProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        onDismiss();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [show, onDismiss]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
      <div className="bg-white shadow-2xl rounded-2xl p-8 text-center animate-bounce pointer-events-auto">
        <div className="text-5xl mb-3">{reward?.emoji || '⭐'}</div>
        <h3 className="text-xl font-bold text-gray-800 mb-1">
          {reward ? `You found: ${reward.name}!` : 'Mastery Achieved!'}
        </h3>
        <p className="text-gray-600">{reward?.description || concept}</p>
      </div>
    </div>
  );
}
