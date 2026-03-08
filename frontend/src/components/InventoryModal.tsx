import { useEffect, useRef } from 'react';
import type { Reward } from '../types';

interface InventoryModalProps {
  show: boolean;
  onClose: () => void;
  inventory: Reward[];
  language?: string | null;
  adventureMode?: boolean;
}

export function InventoryModal({ show, onClose, inventory, language, adventureMode }: InventoryModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (show && !el.open) el.showModal();
    else if (!show && el.open) el.close();
  }, [show]);

  if (!show) return null;

  const fr = language === 'fr';

  if (adventureMode) {
    return (
      <dialog
        ref={dialogRef}
        onClose={onClose}
        className="max-w-md w-[90vw] p-0 backdrop:bg-black/60"
        style={{ borderRadius: '2px', border: '3px solid #c0ccee', backgroundColor: '#e8eeff' }}
      >
        <div className="p-6" style={{ backgroundColor: '#e8eeff' }}>
          <div className="flex items-center justify-between mb-5">
            <h2 style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '12px', color: '#cc8800' }}>
              {fr ? 'LOOT' : 'LOOT'}
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-lg hover:text-[#e94560] transition-colors"
              style={{ color: '#4a4a6a' }}
            >
              &times;
            </button>
          </div>

          {inventory.length === 0 ? (
            <p className="text-center py-8" style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '8px', color: '#4a4a6a', lineHeight: '2' }}>
              {fr ? 'Pas de loot. Bats des bosses pour en obtenir !' : 'No loot yet. Defeat bosses to get some!'}
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {inventory.map((item, i) => (
                <div
                  key={i}
                  className="p-3 text-center cursor-default group"
                  style={{
                    backgroundColor: '#f0f4ff',
                    border: '2px solid #c0ccee',
                    boxShadow: '2px 2px 0px #a0b0d0',
                  }}
                  title={`${item.concept}: ${item.description}`}
                >
                  <div className="text-3xl mb-1">{item.emoji}</div>
                  <div className="truncate" style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '7px', color: '#1a1a2e' }}>{item.name}</div>
                  <div className="truncate opacity-0 group-hover:opacity-100 transition-opacity" style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '6px', color: '#4a4a6a' }}>{item.concept}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </dialog>
    );
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="max-w-md w-[90vw] rounded-2xl p-0 backdrop:bg-black/40 backdrop:backdrop-blur-sm"
    >
      <div className="p-6 bg-gradient-to-br from-purple-50 via-indigo-50 to-violet-50">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-purple-900">
            {fr ? 'Inventaire' : 'Inventory'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-purple-600 hover:bg-purple-100 transition-colors text-lg"
          >
            &times;
          </button>
        </div>

        {inventory.length === 0 ? (
          <p className="text-center text-purple-400 py-8">
            {fr ? 'Aucun objet collecte pour le moment. Maitrise des concepts pour gagner des recompenses !' : 'No items collected yet. Master concepts to earn rewards!'}
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {inventory.map((item, i) => (
              <div
                key={i}
                className="bg-white/80 rounded-xl p-3 border-2 border-purple-200 text-center hover:border-purple-400 hover:shadow-md transition-all cursor-default group"
                title={`${item.concept}: ${item.description}`}
              >
                <div className="text-3xl mb-1">{item.emoji}</div>
                <div className="text-xs font-medium text-purple-900 truncate">{item.name}</div>
                <div className="text-[10px] text-purple-400 truncate opacity-0 group-hover:opacity-100 transition-opacity">{item.concept}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </dialog>
  );
}
