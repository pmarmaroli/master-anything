import { Router, Request, Response } from 'express';
import { SessionService } from '../services/session.service';
import { SpacedRepetitionService } from '../services/spaced-repetition.service';
import { OrchestratorService } from '../services/orchestrator.service';
import { MasteryProgress } from '../types';

const router = Router();
const sessionService = new SessionService();
const spacedRepetitionService = new SpacedRepetitionService();
const orchestratorService = new OrchestratorService();

router.get('/sessions/:sessionId', async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.sessionId as string;
    const session = await sessionService.getSession(sessionId);

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    const messages = await sessionService.getMessages(sessionId);
    const dueReviews = spacedRepetitionService.getDueItems(session.spacedRepetition);

    const totalScores = Object.values(session.masteryScores);
    const overallMastery = totalScores.length > 0
      ? Math.round(totalScores.reduce((sum, s) => sum + s.overall, 0) / totalScores.length)
      : 0;

    const masteryProgress: MasteryProgress = {
      currentPhase: session.currentPhase,
      currentStep: session.currentStep,
      currentConcept: session.topicMap.concepts[session.conceptIndex] || '',
      conceptIndex: session.conceptIndex,
      totalConcepts: session.topicMap.concepts.length,
      overallMastery,
      conceptScores: session.masteryScores,
      inventory: session.inventory || [],
      reviewsDue: dueReviews.length,
      knowledgeGraph: session.topicMap.knowledgeGraph,
      engagementTip: orchestratorService.getEngagementTip(
        session.currentStep,
        session.topicMap.concepts[session.conceptIndex] || ''
      ),
    };

    res.json({
      session: {
        sessionId: session.sessionId,
        threadId: session.threadId,
        currentPhase: session.currentPhase,
        currentStep: session.currentStep,
      },
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
        agentRole: m.agentRole,
        timestamp: m.timestamp.toISOString(),
      })),
      masteryProgress,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ error: errorMessage });
  }
});

export default router;
