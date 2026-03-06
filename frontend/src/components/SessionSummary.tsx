import { MasteryProgress } from '../types';

interface SessionSummaryProps {
  progress: MasteryProgress;
}

export function SessionSummary({ progress }: SessionSummaryProps) {
  if (progress.currentPhase !== 'validation' || progress.currentStep !== 'C3') {
    return null;
  }

  const masteredCount = Object.values(progress.conceptScores).filter(
    (s) => s.overall >= 85
  ).length;

  return (
    <div className="mx-4 my-6 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6">
      <h3 className="text-lg font-bold text-green-800 mb-4">Session Complete</h3>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-700">{progress.overallMastery}%</div>
          <div className="text-xs text-green-600">Overall Mastery</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-700">{masteredCount}/{progress.totalConcepts}</div>
          <div className="text-xs text-green-600">Concepts Mastered</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-700">{progress.reviewsDue}</div>
          <div className="text-xs text-green-600">Reviews Scheduled</div>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-green-700">Concept Breakdown</h4>
        {Object.entries(progress.conceptScores).map(([concept, score]) => (
          <div key={concept} className="flex items-center justify-between text-sm">
            <span className="text-gray-700">{concept}</span>
            <span className={`font-medium ${score.overall >= 85 ? 'text-green-600' : 'text-amber-600'}`}>
              {Math.round(score.overall)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
