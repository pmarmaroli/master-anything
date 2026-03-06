import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { ConceptScore } from '../types';

interface MasteryChartProps {
  score: ConceptScore | null;
  conceptName: string;
}

export function MasteryChart({ score, conceptName }: MasteryChartProps) {
  if (!score) {
    return (
      <div className="p-4 text-center text-sm text-gray-500">
        No scores yet — start explaining to build mastery!
      </div>
    );
  }

  const data = [
    { dimension: 'Clarity', value: score.clarity },
    { dimension: 'Reasoning', value: score.reasoning },
    { dimension: 'Simplification', value: score.simplification },
    { dimension: 'Connection', value: score.connection },
  ];

  return (
    <div>
      <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{conceptName}</h4>
      <ResponsiveContainer width="100%" height={200}>
        <RadarChart data={data}>
          <PolarGrid />
          <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11 }} />
          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
          <Radar dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
        </RadarChart>
      </ResponsiveContainer>
      <div className="text-center text-lg font-bold text-gray-800">{Math.round(score.overall)}%</div>
    </div>
  );
}
