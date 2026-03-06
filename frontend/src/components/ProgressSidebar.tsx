import { useState } from 'react';
import type { MasteryProgress } from '../types';
import { PhaseIndicator } from './PhaseIndicator';
import { MasteryChart } from './MasteryChart';
import { KnowledgeGraph } from './KnowledgeGraph';

interface ProgressSidebarProps {
  progress: MasteryProgress | null;
}

export function ProgressSidebar({ progress }: ProgressSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (!progress) {
    return (
      <aside className="w-80 border-l border-gray-200 bg-gray-50 p-4 hidden lg:block">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Progress</h3>
        <p className="text-sm text-gray-400 mt-4">Start a conversation to see your progress here.</p>
      </aside>
    );
  }

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="w-10 border-l border-gray-200 bg-gray-50 hidden lg:flex items-start justify-center pt-4 hover:bg-gray-100"
        title="Show progress"
      >
        <span className="text-gray-500 text-xs [writing-mode:vertical-lr]">Progress</span>
      </button>
    );
  }

  const currentConceptScore = progress.currentConcept
    ? progress.conceptScores[progress.currentConcept] || null
    : null;

  return (
    <aside className="w-80 border-l border-gray-200 bg-gray-50 overflow-y-auto hidden lg:block">
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Progress</h3>
          <button onClick={() => setCollapsed(true)} className="text-gray-400 hover:text-gray-600 text-xs">
            Hide
          </button>
        </div>

        {/* Phase */}
        <div>
          <PhaseIndicator phase={progress.currentPhase} step={progress.currentStep} />
        </div>

        {/* Concept Progress */}
        <div>
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Concepts</h4>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{
                  width: progress.totalConcepts > 0
                    ? `${(progress.conceptIndex / progress.totalConcepts) * 100}%`
                    : '0%',
                }}
              />
            </div>
            <span className="text-xs text-gray-600">
              {progress.conceptIndex}/{progress.totalConcepts}
            </span>
          </div>
          {progress.currentConcept && (
            <p className="text-sm text-gray-700 mt-1">Current: {progress.currentConcept}</p>
          )}
        </div>

        {/* Overall Mastery */}
        <div>
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Overall Mastery</h4>
          <div className="text-3xl font-bold text-gray-800">{progress.overallMastery}%</div>
        </div>

        {/* Score Breakdown */}
        <div>
          <MasteryChart score={currentConceptScore} conceptName={progress.currentConcept} />
        </div>

        {/* Knowledge Graph */}
        <div>
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Knowledge Map</h4>
          <KnowledgeGraph nodes={progress.knowledgeGraph} />
        </div>

        {/* Reviews Due */}
        {progress.reviewsDue > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm text-amber-800">
              {progress.reviewsDue} concept{progress.reviewsDue > 1 ? 's' : ''} due for review
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
