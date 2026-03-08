import { getPool } from '../db/connection';
import {
  SessionState,
  LearnerProfile,
  TopicMap,
  ConceptScore,
  SpacedRepetitionItem,
  KnowledgeGap,
  ConversationMessage,
  AgentRole,
  Reward,
  LearningPhase,
  LearningStep,
  AdventureState,
} from '../types';

function defaultAdventureState(): AdventureState {
  return {
    mode: 'study',
    dungeon_map_revealed: false,
    current_boss: null,
    boss_hp: 100,
    boss_max_hp: 100,
    bosses_defeated: [],
    loot_inventory: [],
    total_damage_dealt: 0,
    current_room: 0,
    total_rooms: 0,
    wall_blocks_remaining: 0,
    wall_blocks_total: 0,
    streak: 0,
  };
}

export class SessionService {
  async createSession(language: string = 'en'): Promise<SessionState> {
    const pool = await getPool();

    const insertResult = await pool.request().query(
      `DECLARE @id TABLE (session_id NVARCHAR(36));
       INSERT INTO sessions (session_id) OUTPUT INSERTED.session_id INTO @id DEFAULT VALUES;
       SELECT session_id FROM @id;`
    );
    const sessionId = insertResult.recordset[0].session_id;

    await pool.request()
      .input('sessionId', sessionId)
      .input('language', language)
      .query(
        `INSERT INTO learner_profiles (session_id, language) VALUES (@sessionId, @language)`
      );

    await pool.request()
      .input('sessionId', sessionId)
      .query(
        `INSERT INTO topic_maps (session_id) VALUES (@sessionId)`
      );

    return {
      sessionId,
      threadId: '',
      learnerProfile: {
        level: 'beginner',
        language,
        culturalContext: '',
        goals: '',
        assessmentAnswers: [],
      },
      topicMap: {
        rootTopic: '',
        concepts: [],
        prerequisites: [],
        knowledgeGraph: [],
      },
      currentPhase: 'discovery',
      currentStep: 'A1',
      conceptIndex: 0,
      gapRegistry: [],
      masteryScores: {},
      spacedRepetition: [],
      adventureMode: false,
      inventory: [],
      adventureState: defaultAdventureState(),
      conversationSummary: '',
      messageCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async getSession(sessionId: string): Promise<SessionState | null> {
    const pool = await getPool();

    const result = await pool.request()
      .input('sessionId', sessionId)
      .query(
        `SELECT s.*, lp.level, lp.language, lp.cultural_context, lp.goals, lp.assessment_answers,
                tm.root_topic, tm.concepts, tm.prerequisites, tm.knowledge_graph
         FROM sessions s
         LEFT JOIN learner_profiles lp ON s.session_id = lp.session_id
         LEFT JOIN topic_maps tm ON s.session_id = tm.session_id
         WHERE s.session_id = @sessionId`
      );

    if (result.recordset.length === 0) return null;

    const row = result.recordset[0];

    const scoresResult = await pool.request()
      .input('sessionId', sessionId)
      .query(`SELECT * FROM mastery_scores WHERE session_id = @sessionId`);

    const masteryScores: Record<string, ConceptScore> = {};
    for (const s of scoresResult.recordset) {
      masteryScores[s.concept] = {
        clarity: s.clarity,
        reasoning: s.reasoning,
        simplification: s.simplification,
        connection: s.connection,
        overall: s.overall,
        iterationCount: s.iteration_count,
      };
    }

    const srResult = await pool.request()
      .input('sessionId', sessionId)
      .query(`SELECT * FROM spaced_repetition_queue WHERE session_id = @sessionId`);

    const spacedRepetition: SpacedRepetitionItem[] = srResult.recordset.map((r: any) => ({
      concept: r.concept,
      nextReviewAt: r.next_review_at,
      interval: r.interval_days,
      easeFactor: r.ease_factor,
      reviewCount: r.review_count,
    }));

    return {
      sessionId: row.session_id,
      threadId: row.thread_id || '',
      learnerProfile: {
        level: row.level || 'beginner',
        language: row.language || 'en',
        culturalContext: row.cultural_context || '',
        goals: row.goals || '',
        assessmentAnswers: JSON.parse(row.assessment_answers || '[]'),
      },
      topicMap: {
        rootTopic: row.root_topic || '',
        concepts: JSON.parse(row.concepts || '[]'),
        prerequisites: JSON.parse(row.prerequisites || '[]'),
        knowledgeGraph: JSON.parse(row.knowledge_graph || '[]'),
      },
      currentPhase: row.current_phase as LearningPhase,
      currentStep: row.current_step as LearningStep,
      conceptIndex: row.concept_index,
      gapRegistry: [],
      masteryScores,
      spacedRepetition,
      adventureMode: row.adventure_mode === true || row.adventure_mode === 1,
      inventory: JSON.parse(row.inventory || '[]'),
      adventureState: JSON.parse(row.adventure_state || 'null') || defaultAdventureState(),
      conversationSummary: row.conversation_summary || '',
      messageCount: row.message_count || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async updateSession(
    sessionId: string,
    updates: Partial<Pick<SessionState, 'threadId' | 'currentPhase' | 'currentStep' | 'conceptIndex' | 'adventureMode'>>
  ): Promise<void> {
    const pool = await getPool();
    const setClauses: string[] = ['updated_at = GETUTCDATE()'];
    const request = pool.request().input('sessionId', sessionId);

    if (updates.threadId !== undefined) {
      setClauses.push('thread_id = @threadId');
      request.input('threadId', updates.threadId);
    }
    if (updates.currentPhase !== undefined) {
      setClauses.push('current_phase = @phase');
      request.input('phase', updates.currentPhase);
    }
    if (updates.currentStep !== undefined) {
      setClauses.push('current_step = @step');
      request.input('step', updates.currentStep);
    }
    if (updates.conceptIndex !== undefined) {
      setClauses.push('concept_index = @conceptIndex');
      request.input('conceptIndex', updates.conceptIndex);
    }
    if (updates.adventureMode !== undefined) {
      setClauses.push('adventure_mode = @adventureMode');
      request.input('adventureMode', updates.adventureMode);
    }

    await request.query(
      `UPDATE sessions SET ${setClauses.join(', ')} WHERE session_id = @sessionId`
    );
  }

  async saveAdventureState(sessionId: string, state: AdventureState): Promise<void> {
    const pool = await getPool();
    await pool.request()
      .input('sessionId', sessionId)
      .input('adventureState', JSON.stringify(state))
      .query(`UPDATE sessions SET adventure_state = @adventureState WHERE session_id = @sessionId`);
  }

  async saveInventory(sessionId: string, inventory: Reward[]): Promise<void> {
    const pool = await getPool();
    await pool.request()
      .input('sessionId', sessionId)
      .input('inventory', JSON.stringify(inventory))
      .query(`UPDATE sessions SET inventory = @inventory WHERE session_id = @sessionId`);
  }

  async saveSummary(sessionId: string, summary: string, messageCount: number): Promise<void> {
    const pool = await getPool();
    await pool.request()
      .input('sessionId', sessionId)
      .input('summary', summary)
      .input('messageCount', messageCount)
      .query(`UPDATE sessions SET conversation_summary = @summary, message_count = @messageCount WHERE session_id = @sessionId`);
  }

  async incrementMessageCount(sessionId: string): Promise<void> {
    const pool = await getPool();
    await pool.request()
      .input('sessionId', sessionId)
      .query(`UPDATE sessions SET message_count = ISNULL(message_count, 0) + 1 WHERE session_id = @sessionId`);
  }

  async updateLearnerProfile(sessionId: string, updates: Partial<LearnerProfile>): Promise<void> {
    const pool = await getPool();
    const setClauses: string[] = [];
    const request = pool.request().input('sessionId', sessionId);

    if (updates.level !== undefined) {
      setClauses.push('level = @level');
      request.input('level', updates.level);
    }
    if (updates.language !== undefined) {
      setClauses.push('language = @language');
      request.input('language', updates.language);
    }
    if (updates.culturalContext !== undefined) {
      setClauses.push('cultural_context = @culturalContext');
      request.input('culturalContext', updates.culturalContext);
    }
    if (updates.goals !== undefined) {
      setClauses.push('goals = @goals');
      request.input('goals', updates.goals);
    }

    if (setClauses.length > 0) {
      await request.query(
        `UPDATE learner_profiles SET ${setClauses.join(', ')} WHERE session_id = @sessionId`
      );
    }
  }

  async updateTopicMap(sessionId: string, topicMap: TopicMap): Promise<void> {
    const pool = await getPool();
    await pool.request()
      .input('sessionId', sessionId)
      .input('rootTopic', topicMap.rootTopic)
      .input('concepts', JSON.stringify(topicMap.concepts))
      .input('prerequisites', JSON.stringify(topicMap.prerequisites))
      .input('knowledgeGraph', JSON.stringify(topicMap.knowledgeGraph))
      .query(
        `UPDATE topic_maps SET root_topic = @rootTopic, concepts = @concepts,
         prerequisites = @prerequisites, knowledge_graph = @knowledgeGraph
         WHERE session_id = @sessionId`
      );
  }

  async upsertMasteryScore(sessionId: string, concept: string, score: ConceptScore): Promise<void> {
    const pool = await getPool();
    await pool.request()
      .input('sessionId', sessionId)
      .input('concept', concept)
      .input('clarity', score.clarity)
      .input('reasoning', score.reasoning)
      .input('simplification', score.simplification)
      .input('connection', score.connection)
      .input('overall', score.overall)
      .input('iterationCount', score.iterationCount)
      .query(
        `MERGE mastery_scores AS target
         USING (SELECT @sessionId AS session_id, @concept AS concept) AS source
         ON target.session_id = source.session_id AND target.concept = source.concept
         WHEN MATCHED THEN UPDATE SET
           clarity = @clarity, reasoning = @reasoning, simplification = @simplification,
           connection = @connection, overall = @overall, iteration_count = @iterationCount,
           updated_at = GETUTCDATE()
         WHEN NOT MATCHED THEN INSERT
           (session_id, concept, clarity, reasoning, simplification, connection, overall, iteration_count)
           VALUES (@sessionId, @concept, @clarity, @reasoning, @simplification, @connection, @overall, @iterationCount);`
      );
  }

  async addMessage(
    sessionId: string,
    role: 'user' | 'assistant',
    content: string,
    agentRole: AgentRole | null
  ): Promise<void> {
    const pool = await getPool();
    await pool.request()
      .input('sessionId', sessionId)
      .input('role', role)
      .input('content', content)
      .input('agentRole', agentRole)
      .query(
        `INSERT INTO conversation_history (session_id, role, content, agent_role)
         VALUES (@sessionId, @role, @content, @agentRole)`
      );
  }

  async deleteOldData(days: number = 7): Promise<number> {
    const pool = await getPool();
    const result = await pool.request()
      .input('days', days)
      .query(
        `DECLARE @cutoff DATETIME2 = DATEADD(day, -@days, GETUTCDATE());
         DECLARE @old_sessions TABLE (session_id NVARCHAR(36));
         INSERT INTO @old_sessions SELECT session_id FROM sessions WHERE created_at < @cutoff;
         DELETE FROM conversation_history WHERE session_id IN (SELECT session_id FROM @old_sessions);
         DELETE FROM spaced_repetition_queue WHERE session_id IN (SELECT session_id FROM @old_sessions);
         DELETE FROM mastery_scores WHERE session_id IN (SELECT session_id FROM @old_sessions);
         DELETE FROM topic_maps WHERE session_id IN (SELECT session_id FROM @old_sessions);
         DELETE FROM learner_profiles WHERE session_id IN (SELECT session_id FROM @old_sessions);
         DELETE FROM sessions WHERE session_id IN (SELECT session_id FROM @old_sessions);`
      );
    const deletedCount = result.rowsAffected[result.rowsAffected.length - 1];
    return deletedCount;
  }

  async getMessages(sessionId: string): Promise<ConversationMessage[]> {
    const pool = await getPool();
    const result = await pool.request()
      .input('sessionId', sessionId)
      .query(
        `SELECT id, session_id, role, content, agent_role, created_at
         FROM conversation_history WHERE session_id = @sessionId ORDER BY created_at ASC`
      );

    return result.recordset.map((r: any) => ({
      id: String(r.id),
      sessionId: r.session_id,
      role: r.role,
      content: r.content,
      agentRole: r.agent_role,
      timestamp: r.created_at,
    }));
  }

  async getLastAssistantMessage(sessionId: string): Promise<string | null> {
    const pool = await getPool();
    const result = await pool.request()
      .input('sessionId', sessionId)
      .query(
        `SELECT TOP 1 content FROM conversation_history
         WHERE session_id = @sessionId AND role = 'assistant'
         ORDER BY created_at DESC`
      );
    return result.recordset[0]?.content ?? null;
  }
}
