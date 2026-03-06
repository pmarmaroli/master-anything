import { ConceptScore } from '../types';

export interface EvaluatorResult {
  concept: string;
  scores: {
    clarity: number;
    reasoning: number;
    simplification: number;
    connection: number;
  };
  overall: number;
  decision: 'advance' | 'loop_back' | 'teach_more';
  feedback: string;
  gaps: string[];
}

export class MasteryService {
  calculateOverallScore(
    clarity: number,
    reasoning: number,
    simplification: number,
    connection: number
  ): number {
    return clarity * 0.3 + reasoning * 0.25 + simplification * 0.25 + connection * 0.2;
  }

  getDecision(overall: number): 'advance' | 'loop_back' | 'teach_more' {
    if (overall >= 85) return 'advance';
    if (overall >= 60) return 'loop_back';
    return 'teach_more';
  }

  parseEvaluatorResponse(response: string): EvaluatorResult | null {
    const jsonMatch = response.match(/```json\s*([\s\S]*?)```/);
    if (!jsonMatch) return null;

    try {
      return JSON.parse(jsonMatch[1].trim()) as EvaluatorResult;
    } catch {
      return null;
    }
  }

  toConceptScore(result: EvaluatorResult, iterationCount: number): ConceptScore {
    return {
      clarity: result.scores.clarity,
      reasoning: result.scores.reasoning,
      simplification: result.scores.simplification,
      connection: result.scores.connection,
      overall: result.overall,
      iterationCount,
    };
  }
}
