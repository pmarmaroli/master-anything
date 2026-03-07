import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { OrchestratorService } from '../services/orchestrator.service';

const router = Router();
const orchestrator = new OrchestratorService();

const masteryRequestSchema = z.object({
  message: z.string().min(1).max(10000),
  sessionId: z.string().nullable().optional(),
  threadId: z.string().nullable().optional(),
  language: z.string().optional(),
  adventureMode: z.boolean().optional(),
});

router.post('/universal-mastery-agent', async (req: Request, res: Response) => {
  try {
    const parsed = masteryRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
      return;
    }

    const { message, sessionId, threadId, language, adventureMode } = parsed.data;

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Send immediate thinking indicator so user sees activity right away
    res.write(`data: ${JSON.stringify({ type: 'thinking' })}\n\n`);

    const result = await orchestrator.processMessageStreaming(
      message,
      sessionId || undefined,
      threadId || undefined,
      language,
      adventureMode,
      (token: string) => {
        res.write(`data: ${JSON.stringify({ type: 'token', content: token })}\n\n`);
      }
    );

    // Send final response with metadata
    res.write(`data: ${JSON.stringify({ type: 'done', ...result })}\n\n`);
    res.end();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    // If headers already sent (SSE started), send error as event
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: errorMessage })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: errorMessage });
    }
  }
});

export default router;
