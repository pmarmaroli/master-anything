import { LearningPhase } from '../types';

interface PhaseIndicatorProps {
  phase: LearningPhase;
  step: string;
}

const phaseConfig: Record<LearningPhase, { label: string; color: string; bg: string }> = {
  discovery: { label: 'Discovery', color: 'text-blue-700', bg: 'bg-blue-100' },
  learning_loop: { label: 'Learning', color: 'text-orange-700', bg: 'bg-orange-100' },
  validation: { label: 'Validation', color: 'text-green-700', bg: 'bg-green-100' },
};

export function PhaseIndicator({ phase, step }: PhaseIndicatorProps) {
  const config = phaseConfig[phase];

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.color}`}>
      <span className="w-2 h-2 rounded-full bg-current" />
      {config.label} — Step {step}
    </div>
  );
}
