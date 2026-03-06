import { useEffect, useRef } from 'react';
import type { MasteryProgress } from '../types';
import { PhaseIndicator } from './PhaseIndicator';
import { MasteryChart } from './MasteryChart';

interface ProgressModalProps {
  show: boolean;
  onClose: () => void;
  progress: MasteryProgress | null;
  language?: string | null;
}

export function ProgressModal({ show, onClose, progress, language }: ProgressModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (show && !el.open) el.showModal();
    else if (!show && el.open) el.close();
  }, [show]);

  if (!show) return null;

  const fr = language === 'fr';

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="max-w-sm w-[90vw] rounded-2xl p-0 backdrop:bg-black/40 backdrop:backdrop-blur-sm"
    >
      <div className="p-5 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-amber-900">
            {fr ? 'Progression' : 'Progress'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-amber-600 hover:bg-amber-100 transition-colors text-lg"
          >
            &times;
          </button>
        </div>

        {!progress ? (
          <p className="text-sm text-amber-600/70">
            {fr ? 'Commencez une conversation pour voir votre progression.' : 'Start a conversation to see your progress.'}
          </p>
        ) : (
          <div className="space-y-4">
            <PhaseIndicator phase={progress.currentPhase} step={progress.currentStep} />

            <div>
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                {fr ? 'Concepts' : 'Concepts'}
              </h4>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-amber-200/50 rounded-full h-2.5">
                  <div
                    className="bg-amber-500 h-2.5 rounded-full transition-all"
                    style={{
                      width: progress.totalConcepts > 0
                        ? `${(progress.conceptIndex / progress.totalConcepts) * 100}%`
                        : '0%',
                    }}
                  />
                </div>
                <span className="text-xs font-medium text-amber-700">
                  {progress.conceptIndex}/{progress.totalConcepts}
                </span>
              </div>
              {progress.currentConcept && (
                <p className="text-sm text-gray-700 mt-1">
                  {fr ? 'En cours : ' : 'Current: '}{progress.currentConcept}
                </p>
              )}
            </div>

            <div>
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                {fr ? 'Maitrise globale' : 'Overall Mastery'}
              </h4>
              <div className="text-3xl font-bold text-amber-800">{progress.overallMastery}%</div>
            </div>

            {progress.currentConcept && (
              <MasteryChart
                score={progress.conceptScores[progress.currentConcept] || null}
                conceptName={progress.currentConcept}
              />
            )}

            {progress.reviewsDue > 0 && (
              <div className="bg-amber-100 border border-amber-300 rounded-lg p-3">
                <p className="text-sm text-amber-800">
                  {progress.reviewsDue} concept{progress.reviewsDue > 1 ? 's' : ''} {fr ? 'a revoir' : 'due for review'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </dialog>
  );
}
