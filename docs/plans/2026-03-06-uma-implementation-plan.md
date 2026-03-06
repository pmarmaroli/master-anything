# Universal Mastery Agent — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a full-stack web interface for the Universal Mastery Agent — a multi-agent AI learning system using the Feynman Method with 6 Azure AI agents behind a unified chat interface.

**Architecture:** Monorepo with Express.js + TypeScript backend and React + Vite + TypeScript frontend. Backend orchestrates 6 Azure AI agents via a single API endpoint with SSE streaming. Azure SQL Database for session persistence. Frontend renders a chat interface with progress sidebar, knowledge graph, and mastery visualizations.

**Tech Stack:** React 18, Vite, Tailwind CSS, Express.js, TypeScript, Azure AI Projects SDK, Azure SQL (mssql), React Flow, Mermaid.js, Recharts, Zod, SSE

**Design doc:** `docs/plans/2026-03-06-uma-web-interface-design.md`

---

## Task 1: Project Scaffolding — Root & Backend

**Files:**
- Create: `package.json` (root)
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/.env.example`
- Create: `.gitignore`

**Step 1: Create root package.json**

```json
{
  "name": "master-anything",
  "private": true,
  "scripts": {
    "dev:backend": "cd backend && npm run dev",
    "dev:frontend": "cd frontend && npm run dev",
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\""
  },
  "devDependencies": {
    "concurrently": "^9.1.0"
  }
}
```

**Step 2: Create backend/package.json**

```json
{
  "name": "uma-backend",
  "private": true,
  "scripts": {
    "dev": "ts-node-dev --respawn src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest --verbose"
  },
  "dependencies": {
    "@azure/ai-projects": "^1.0.0",
    "@azure/identity": "^4.6.0",
    "cors": "^2.8.5",
    "dotenv": "^16.4.7",
    "express": "^4.21.0",
    "helmet": "^8.0.0",
    "mssql": "^11.0.1",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^5.0.0",
    "@types/jest": "^29.5.14",
    "@types/node": "^22.10.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.2.0",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.7.0"
  }
}
```

**Step 3: Create backend/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 4: Create backend/.env.example**

```
AZURE_AI_PROJECT_CONNECTION_STRING=your_connection_string_here
AZURE_SQL_CONNECTION_STRING=Server=your_server.database.windows.net;Database=uma;User Id=your_user;Password=your_password;Encrypt=true
ORCHESTRATOR_AGENT_ID=
ARCHITECT_AGENT_ID=
MENTOR_AGENT_ID=
CHALLENGER_AGENT_ID=
NAIVE_STUDENT_AGENT_ID=
EVALUATOR_AGENT_ID=
PORT=3001
```

**Step 5: Create .gitignore**

```
node_modules/
dist/
.env
*.js.map
.DS_Store
```

**Step 6: Create backend/jest.config.js**

```js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
};
```

**Step 7: Install dependencies**

```bash
cd D:/Github/master-anything && npm install
cd backend && npm install
```

**Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold root and backend project structure"
```

---

## Task 2: Shared Types

**Files:**
- Create: `backend/src/types/session.ts`
- Create: `backend/src/types/agents.ts`
- Create: `backend/src/types/api.ts`
- Create: `backend/src/types/index.ts`

**Step 1: Create agent types**

```typescript
// backend/src/types/agents.ts
export type AgentRole =
  | 'orchestrator'
  | 'architect'
  | 'mentor'
  | 'challenger'
  | 'naive_student'
  | 'evaluator';

export type LearningPhase = 'discovery' | 'learning_loop' | 'validation';

export type LearningStep =
  | 'A1' | 'A2' | 'A3' | 'A4'   // Discovery
  | 'B1' | 'B2' | 'B3' | 'B4' | 'B5'  // Learning Loop
  | 'C1' | 'C2' | 'C3';          // Validation

export interface AgentConfig {
  role: AgentRole;
  agentId: string;
  systemPromptTemplate: string;
}

export interface HandoffContext {
  learnerMessage: string;
  currentPhase: LearningPhase;
  currentStep: LearningStep;
  currentConcept: string;
  masteryScores: Record<string, ConceptScore>;
  gapRegistry: KnowledgeGap[];
  language: string;
  instruction: string;
  toneGuidance: string;
}

export interface ConceptScore {
  clarity: number;
  reasoning: number;
  simplification: number;
  connection: number;
  overall: number;
  iterationCount: number;
}

export interface KnowledgeGap {
  concept: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  iterationsAttempted: number;
}
```

**Step 2: Create session types**

```typescript
// backend/src/types/session.ts
import { AgentRole, LearningPhase, LearningStep, ConceptScore, KnowledgeGap } from './agents';

export interface LearnerProfile {
  level: 'beginner' | 'intermediate' | 'advanced';
  language: string;
  culturalContext: string;
  goals: string;
  assessmentAnswers: string[];
}

export interface TopicMap {
  rootTopic: string;
  concepts: string[];
  prerequisites: string[];
  knowledgeGraph: KnowledgeGraphNode[];
}

export interface KnowledgeGraphNode {
  id: string;
  label: string;
  status: 'locked' | 'current' | 'mastered';
  prerequisites: string[];
}

export interface SpacedRepetitionItem {
  concept: string;
  nextReviewAt: Date;
  interval: number;
  easeFactor: number;
  reviewCount: number;
}

export interface SessionState {
  sessionId: string;
  threadId: string;
  learnerProfile: LearnerProfile;
  topicMap: TopicMap;
  currentPhase: LearningPhase;
  currentStep: LearningStep;
  conceptIndex: number;
  gapRegistry: KnowledgeGap[];
  masteryScores: Record<string, ConceptScore>;
  spacedRepetition: SpacedRepetitionItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  agentRole: AgentRole | null;
  timestamp: Date;
}
```

**Step 3: Create API types**

```typescript
// backend/src/types/api.ts
import { LearningPhase, AgentRole, ConceptScore } from './agents';

export interface MasteryRequest {
  message: string;
  sessionId?: string;
  threadId?: string;
  language?: string;
}

export interface MasteryProgress {
  currentPhase: LearningPhase;
  currentStep: string;
  currentConcept: string;
  conceptIndex: number;
  totalConcepts: number;
  overallMastery: number;
  conceptScores: Record<string, ConceptScore>;
  reviewsDue: number;
  knowledgeGraph: Array<{
    id: string;
    label: string;
    status: 'locked' | 'current' | 'mastered';
    prerequisites: string[];
  }>;
}

export interface MasteryResponse {
  response: string;
  threadId: string;
  sessionId: string;
  currentPhase: LearningPhase;
  currentAgent: AgentRole;
  masteryProgress: MasteryProgress;
}

export interface SessionRecoveryResponse {
  session: {
    sessionId: string;
    threadId: string;
    currentPhase: LearningPhase;
    currentStep: string;
  };
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    agentRole: AgentRole | null;
    timestamp: string;
  }>;
  masteryProgress: MasteryProgress;
}
```

**Step 4: Create index barrel**

```typescript
// backend/src/types/index.ts
export * from './agents';
export * from './session';
export * from './api';
```

**Step 5: Commit**

```bash
git add backend/src/types/
git commit -m "feat: add shared TypeScript types for agents, sessions, and API"
```

---

## Task 3: Database Schema & Connection

**Files:**
- Create: `backend/src/db/schema.sql`
- Create: `backend/src/db/connection.ts`
- Test: `backend/src/__tests__/db/connection.test.ts`

**Step 1: Create Azure SQL schema**

```sql
-- backend/src/db/schema.sql

CREATE TABLE sessions (
    session_id NVARCHAR(36) PRIMARY KEY DEFAULT NEWID(),
    thread_id NVARCHAR(255),
    current_phase NVARCHAR(20) DEFAULT 'discovery',
    current_step NVARCHAR(5) DEFAULT 'A1',
    concept_index INT DEFAULT 0,
    created_at DATETIME2 DEFAULT GETUTCDATE(),
    updated_at DATETIME2 DEFAULT GETUTCDATE()
);

CREATE TABLE learner_profiles (
    session_id NVARCHAR(36) PRIMARY KEY REFERENCES sessions(session_id),
    level NVARCHAR(20) DEFAULT 'beginner',
    language NVARCHAR(10) DEFAULT 'en',
    cultural_context NVARCHAR(500) DEFAULT '',
    goals NVARCHAR(2000) DEFAULT '',
    assessment_answers NVARCHAR(MAX) DEFAULT '[]'
);

CREATE TABLE topic_maps (
    session_id NVARCHAR(36) PRIMARY KEY REFERENCES sessions(session_id),
    root_topic NVARCHAR(500) DEFAULT '',
    concepts NVARCHAR(MAX) DEFAULT '[]',
    prerequisites NVARCHAR(MAX) DEFAULT '[]',
    knowledge_graph NVARCHAR(MAX) DEFAULT '[]'
);

CREATE TABLE mastery_scores (
    id INT IDENTITY(1,1) PRIMARY KEY,
    session_id NVARCHAR(36) REFERENCES sessions(session_id),
    concept NVARCHAR(500) NOT NULL,
    clarity FLOAT DEFAULT 0,
    reasoning FLOAT DEFAULT 0,
    simplification FLOAT DEFAULT 0,
    connection FLOAT DEFAULT 0,
    overall FLOAT DEFAULT 0,
    iteration_count INT DEFAULT 0,
    updated_at DATETIME2 DEFAULT GETUTCDATE(),
    UNIQUE(session_id, concept)
);

CREATE TABLE spaced_repetition_queue (
    id INT IDENTITY(1,1) PRIMARY KEY,
    session_id NVARCHAR(36) REFERENCES sessions(session_id),
    concept NVARCHAR(500) NOT NULL,
    next_review_at DATETIME2,
    interval_days FLOAT DEFAULT 1,
    ease_factor FLOAT DEFAULT 2.5,
    review_count INT DEFAULT 0,
    UNIQUE(session_id, concept)
);

CREATE TABLE conversation_history (
    id INT IDENTITY(1,1) PRIMARY KEY,
    session_id NVARCHAR(36) REFERENCES sessions(session_id),
    role NVARCHAR(10) NOT NULL,
    content NVARCHAR(MAX) NOT NULL,
    agent_role NVARCHAR(20),
    created_at DATETIME2 DEFAULT GETUTCDATE()
);

CREATE INDEX idx_conversation_session ON conversation_history(session_id, created_at);
CREATE INDEX idx_spaced_review ON spaced_repetition_queue(session_id, next_review_at);
```

**Step 2: Create database connection module**

```typescript
// backend/src/db/connection.ts
import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const config: sql.config = {
  connectionString: process.env.AZURE_SQL_CONNECTION_STRING,
  options: {
    encrypt: true,
    trustServerCertificate: false,
  },
};

let pool: sql.ConnectionPool | null = null;

export async function getPool(): Promise<sql.ConnectionPool> {
  if (!pool) {
    pool = await sql.connect(config);
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.close();
    pool = null;
  }
}
```

**Step 3: Write connection test**

```typescript
// backend/src/__tests__/db/connection.test.ts
import { getPool, closePool } from '../../db/connection';

// This test requires a real database connection — skip in CI without credentials
const describeIfDb = process.env.AZURE_SQL_CONNECTION_STRING ? describe : describe.skip;

describeIfDb('Database Connection', () => {
  afterAll(async () => {
    await closePool();
  });

  it('should connect to Azure SQL', async () => {
    const pool = await getPool();
    const result = await pool.request().query('SELECT 1 AS value');
    expect(result.recordset[0].value).toBe(1);
  });
});
```

**Step 4: Commit**

```bash
git add backend/src/db/ backend/src/__tests__/db/
git commit -m "feat: add Azure SQL schema and database connection"
```

---

## Task 4: Session Service

**Files:**
- Create: `backend/src/services/session.service.ts`
- Test: `backend/src/__tests__/services/session.service.test.ts`

**Step 1: Write session service tests**

```typescript
// backend/src/__tests__/services/session.service.test.ts
import { SessionService } from '../../services/session.service';
import { SessionState, ConversationMessage } from '../../types';

// Mock the database module
jest.mock('../../db/connection', () => {
  const mockRequest = {
    input: jest.fn().mockReturnThis(),
    query: jest.fn(),
  };
  const mockPool = {
    request: jest.fn(() => mockRequest),
  };
  return {
    getPool: jest.fn().mockResolvedValue(mockPool),
    __mockRequest: mockRequest,
    __mockPool: mockPool,
  };
});

const { __mockRequest: mockRequest } = require('../../db/connection');

describe('SessionService', () => {
  let service: SessionService;

  beforeEach(() => {
    service = new SessionService();
    jest.clearAllMocks();
  });

  describe('createSession', () => {
    it('should create a new session and return session state', async () => {
      mockRequest.query
        .mockResolvedValueOnce({ recordset: [{ session_id: 'test-123' }] })  // insert session
        .mockResolvedValueOnce({})  // insert learner_profile
        .mockResolvedValueOnce({});  // insert topic_map

      const session = await service.createSession('en');
      expect(session.sessionId).toBe('test-123');
      expect(session.currentPhase).toBe('discovery');
      expect(session.currentStep).toBe('A1');
      expect(session.learnerProfile.language).toBe('en');
    });
  });

  describe('getSession', () => {
    it('should retrieve a full session state', async () => {
      mockRequest.query.mockResolvedValueOnce({
        recordset: [{
          session_id: 'test-123',
          thread_id: 'thread-abc',
          current_phase: 'learning_loop',
          current_step: 'B2',
          concept_index: 3,
          level: 'intermediate',
          language: 'fr',
          cultural_context: '',
          goals: 'master physics',
          assessment_answers: '["answer1"]',
          root_topic: 'Quantum Mechanics',
          concepts: '["concept1","concept2"]',
          prerequisites: '[]',
          knowledge_graph: '[]',
        }],
      });
      mockRequest.query.mockResolvedValueOnce({ recordset: [] }); // mastery scores
      mockRequest.query.mockResolvedValueOnce({ recordset: [] }); // spaced repetition

      const session = await service.getSession('test-123');
      expect(session).not.toBeNull();
      expect(session!.currentPhase).toBe('learning_loop');
      expect(session!.learnerProfile.language).toBe('fr');
    });

    it('should return null for non-existent session', async () => {
      mockRequest.query.mockResolvedValueOnce({ recordset: [] });
      const session = await service.getSession('nonexistent');
      expect(session).toBeNull();
    });
  });

  describe('addMessage', () => {
    it('should insert a conversation message', async () => {
      mockRequest.query.mockResolvedValueOnce({});
      await service.addMessage('test-123', 'user', 'Hello', null);
      expect(mockRequest.input).toHaveBeenCalledWith('sessionId', 'test-123');
      expect(mockRequest.input).toHaveBeenCalledWith('content', 'Hello');
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd backend && npx jest src/__tests__/services/session.service.test.ts --verbose
```
Expected: FAIL — module not found

**Step 3: Implement session service**

```typescript
// backend/src/services/session.service.ts
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
  LearningPhase,
  LearningStep,
} from '../types';

export class SessionService {
  async createSession(language: string = 'en'): Promise<SessionState> {
    const pool = await getPool();

    const result = await pool.request().query(
      `INSERT INTO sessions DEFAULT VALUES; SELECT SCOPE_IDENTITY() AS id;
       SELECT session_id FROM sessions WHERE id = SCOPE_IDENTITY();`
    );

    // Use OUTPUT clause instead for reliability
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
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async updateSession(
    sessionId: string,
    updates: Partial<Pick<SessionState, 'threadId' | 'currentPhase' | 'currentStep' | 'conceptIndex'>>
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

    await request.query(
      `UPDATE sessions SET ${setClauses.join(', ')} WHERE session_id = @sessionId`
    );
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
}
```

**Step 4: Run tests**

```bash
cd backend && npx jest src/__tests__/services/session.service.test.ts --verbose
```
Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/services/session.service.ts backend/src/__tests__/services/session.service.test.ts
git commit -m "feat: implement session service with CRUD operations"
```

---

## Task 5: Agent System Prompts

**Files:**
- Create: `backend/src/agents/orchestrator.ts`
- Create: `backend/src/agents/architect.ts`
- Create: `backend/src/agents/mentor.ts`
- Create: `backend/src/agents/challenger.ts`
- Create: `backend/src/agents/naive-student.ts`
- Create: `backend/src/agents/evaluator.ts`
- Create: `backend/src/agents/index.ts`

**Step 1: Create all agent prompt templates**

Each file exports a function that takes session context and returns a system prompt string. These are the specialized instructions for each Azure AI agent.

```typescript
// backend/src/agents/orchestrator.ts
import { SessionState } from '../types';

export function getOrchestratorPrompt(session: SessionState): string {
  return `You are the Orchestrator of the Universal Mastery Agent system. You coordinate the learning experience.

CURRENT STATE:
- Phase: ${session.currentPhase}
- Step: ${session.currentStep}
- Topic: ${session.topicMap.rootTopic || 'Not yet defined'}
- Concept: ${session.topicMap.concepts[session.conceptIndex] || 'Not yet started'}
- Language: ${session.learnerProfile.language}

YOUR ROLE:
- You manage phase transitions and decide when to advance the learner
- When all concepts are mastered or the learner completes a phase, provide smooth transitions
- Schedule spaced repetition reviews for mastered concepts
- Always respond in the learner's language: ${session.learnerProfile.language}
- Never reveal the multi-agent architecture — you are one unified learning companion
- Use "I" consistently — you are the same person as all other agents

TRANSITION PHRASES (use naturally):
- "Let me push you a bit further on that..."
- "Now, let's see if you can explain that even more simply..."
- "Great progress! Let's move on to..."
- "Before we continue, let's quickly revisit..."`;
}
```

```typescript
// backend/src/agents/architect.ts
import { SessionState } from '../types';

export function getArchitectPrompt(session: SessionState): string {
  return `You are the Architect — a curriculum designer and diagnostic assessor for the Universal Mastery Agent.

CURRENT STATE:
- Phase: ${session.currentPhase}
- Step: ${session.currentStep}
- Learner Level: ${session.learnerProfile.level}
- Language: ${session.learnerProfile.language}
- Goals: ${session.learnerProfile.goals || 'Not yet defined'}

YOUR ROLE:
- Conduct initial diagnostic assessment with 3-4 targeted conversational questions
- Detect the learner's language from their first message and adapt accordingly
- Map requested topics into a structured knowledge graph with prerequisites
- Generate personalized learning roadmaps adapted to the learner's level
- Identify prerequisite gaps and recommend remediation

LANGUAGE DETECTION:
- Detect the learner's language from their first message
- Confirm language preference naturally: "I see you're writing in [language], shall we continue in [language]?"
- Store and use this language for all subsequent interactions
- Support mixed-language switching if the learner changes language

DIAGNOSTIC QUESTIONS (adapt to level):
- Beginner: "What do you already know or assume about this topic?"
- Intermediate: "What specific aspect feels most unclear to you?"
- Advanced: "What's the hardest concept you've encountered in this area?"

PHASE A STEPS:
- A1: Ask what subject the learner wants to master, clarify scope
- A2: Ask 3-4 diagnostic questions to gauge depth
- A3: Map topic into knowledge graph (output as structured JSON in a code block)
- A4: Present personalized roadmap

Always respond in: ${session.learnerProfile.language}
Never reveal the multi-agent architecture. Use "I" consistently.

When you generate a knowledge graph, output it as a mermaid diagram in a code block.
When you generate a roadmap, present it as a clear numbered list with estimated depth per concept.`;
}
```

```typescript
// backend/src/agents/mentor.ts
import { SessionState } from '../types';

export function getMentorPrompt(session: SessionState): string {
  const currentConcept = session.topicMap.concepts[session.conceptIndex] || '';
  const conceptScore = session.masteryScores[currentConcept];

  return `You are the Mentor — the learner's primary teacher and warmest presence in the Universal Mastery Agent.

CURRENT STATE:
- Phase: ${session.currentPhase}
- Concept: ${currentConcept}
- Learner Level: ${session.learnerProfile.level}
- Language: ${session.learnerProfile.language}
${conceptScore ? `- Previous Score: ${conceptScore.overall}% (Clarity: ${conceptScore.clarity}, Reasoning: ${conceptScore.reasoning}, Simplification: ${conceptScore.simplification}, Connection: ${conceptScore.connection})` : '- First attempt at this concept'}

YOUR ROLE (Feynman Guide):
- Walk the learner through the Feynman explanation process
- Ask the learner to explain concepts in their own words, as if teaching a beginner
- Identify gaps and unclear language in the learner's explanations
- Provide clear, simplified explanations using analogies, metaphors, and examples
- Suggest visual diagrams (output as mermaid code blocks), real-world parallels, thought experiments
- Encourage and motivate throughout the iterative process
- Conduct spaced repetition reviews conversationally (not as formal quizzes)

${conceptScore && conceptScore.overall < 85 ? `TARGETED GUIDANCE: The learner previously scored ${conceptScore.overall}%. Focus on improving their weakest area.` : ''}

STEP B1 PROCESS:
1. Introduce the concept with a brief, engaging overview
2. Ask: "Can you explain [concept] in your own words, as if you were teaching someone who knows nothing about it?"
3. Listen to their explanation and identify gaps
4. Provide scaffolding where needed

Always respond in: ${session.learnerProfile.language}
Never reveal the multi-agent architecture. Use "I" consistently.
Be warm, encouraging, and patient.`;
}
```

```typescript
// backend/src/agents/challenger.ts
import { SessionState } from '../types';

export function getChallengerPrompt(session: SessionState): string {
  const currentConcept = session.topicMap.concepts[session.conceptIndex] || '';

  return `You are the Challenger — a Socratic questioner and critical thinker in the Universal Mastery Agent.

CURRENT STATE:
- Concept: ${currentConcept}
- Learner Level: ${session.learnerProfile.level}
- Language: ${session.learnerProfile.language}
- Known Gaps: ${session.gapRegistry.map(g => g.concept + ': ' + g.description).join('; ') || 'None identified yet'}

YOUR ROLE:
- Ask probing "why" and "what if" questions to test depth of understanding
- Introduce edge cases, contradictions, and counter-examples
- Force the learner to defend, refine, or revise their mental model
- Calibrate difficulty to the learner's level (not too easy, not crushing)
- Distinguish between knowledge gaps (needs learning) and reasoning gaps (needs thinking)

QUESTION TYPES:
- Why questions: "Why does X happen instead of Y?"
- What-if questions: "What would happen if we changed Z?"
- Edge cases: "Does this still hold when...?"
- Counter-examples: "But what about the case where...?"
- Connection questions: "How does this relate to [previous concept]?"

DIFFICULTY CALIBRATION:
- Beginner: 1-2 gentle probing questions, focus on core understanding
- Intermediate: 2-3 questions with edge cases, push for deeper reasoning
- Advanced: 3-4 challenging questions with contradictions and nuanced scenarios

Always respond in: ${session.learnerProfile.language}
Never reveal the multi-agent architecture. Use "I" consistently.
Be intellectually rigorous but respectful. Challenge ideas, not the person.`;
}
```

```typescript
// backend/src/agents/naive-student.ts
import { SessionState } from '../types';

export function getNaiveStudentPrompt(session: SessionState): string {
  const currentConcept = session.topicMap.concepts[session.conceptIndex] || '';

  return `You are the Naive Student — a teaching simulation that forces maximum simplification in the Universal Mastery Agent.

CURRENT STATE:
- Concept: ${currentConcept}
- Learner Level: ${session.learnerProfile.level}
- Language: ${session.learnerProfile.language}

YOUR ROLE:
- Play the role of a genuinely confused learner who needs things explained simply
- Ask basic questions that force the learner to find clearer language
- Deliberately misunderstand to test whether the explanation is truly clear
- Request analogies, examples, and restatements in simpler terms
- This is the highest bar of Feynman mastery: if you understand, the learner truly knows it

CONFUSION CALIBRATION:
- For basic topics: Be mildly confused, ask for one or two clarifications
- For intermediate topics: Be moderately confused, misunderstand jargon
- For advanced topics: Be very confused, require multiple simplifications and analogies

PHRASES TO USE:
- "I don't understand what you mean by [term]. Can you explain it without using that word?"
- "Wait, so you're saying [deliberate misunderstanding]? That doesn't make sense to me."
- "Can you give me an analogy? Like, something from everyday life?"
- "I think I'm getting it, but what does [key term] actually mean in simple words?"
- "Hmm, my friend told me [common misconception]. Is that wrong?"

Always respond in: ${session.learnerProfile.language}
Never reveal the multi-agent architecture. Use "I" consistently.
Be genuinely curious and endearing in your confusion, not annoying.`;
}
```

```typescript
// backend/src/agents/evaluator.ts
import { SessionState } from '../types';

export function getEvaluatorPrompt(session: SessionState): string {
  const currentConcept = session.topicMap.concepts[session.conceptIndex] || '';
  const allScores = Object.entries(session.masteryScores)
    .map(([c, s]) => `${c}: ${s.overall}%`)
    .join(', ');

  return `You are the Evaluator — a progress tracker and mastery scorer in the Universal Mastery Agent.

CURRENT STATE:
- Concept being evaluated: ${currentConcept}
- All scores so far: ${allScores || 'None yet'}
- Language: ${session.learnerProfile.language}

YOUR ROLE:
- Score the learner's comprehension based on the conversation so far
- Generate mastery scores across 4 dimensions
- Determine the next action based on the score

SCORING DIMENSIONS (output as JSON):
- clarity (30% weight): Can they explain clearly and accurately in their own words?
- reasoning (25% weight): Can they answer "why" questions and handle edge cases?
- simplification (25% weight): Can they make it accessible to a complete novice?
- connection (20% weight): Can they relate this to other concepts?

OUTPUT FORMAT — You MUST respond with a JSON block followed by a natural language summary:

\`\`\`json
{
  "concept": "${currentConcept}",
  "scores": {
    "clarity": <0-100>,
    "reasoning": <0-100>,
    "simplification": <0-100>,
    "connection": <0-100>
  },
  "overall": <weighted average>,
  "decision": "advance" | "loop_back" | "teach_more",
  "feedback": "<specific feedback about strengths and gaps>",
  "gaps": ["<identified gap 1>", "<identified gap 2>"]
}
\`\`\`

Then provide a natural, encouraging summary to the learner about their progress.

DECISION THRESHOLDS:
- overall >= 85: "advance" — ready for next concept
- overall 60-84: "loop_back" — re-enter learning loop with targeted guidance
- overall < 60: "teach_more" — provide additional material before re-entering

Always respond in: ${session.learnerProfile.language}
Never reveal exact scores to the learner — translate them into encouraging natural language.`;
}
```

```typescript
// backend/src/agents/index.ts
export { getOrchestratorPrompt } from './orchestrator';
export { getArchitectPrompt } from './architect';
export { getMentorPrompt } from './mentor';
export { getChallengerPrompt } from './challenger';
export { getNaiveStudentPrompt } from './naive-student';
export { getEvaluatorPrompt } from './evaluator';
```

**Step 2: Commit**

```bash
git add backend/src/agents/
git commit -m "feat: add system prompt templates for all 6 agents"
```

---

## Task 6: Agent Service (Azure AI SDK Wrapper)

**Files:**
- Create: `backend/src/services/agent.service.ts`
- Test: `backend/src/__tests__/services/agent.service.test.ts`

**Step 1: Write agent service tests**

```typescript
// backend/src/__tests__/services/agent.service.test.ts
import { AgentService } from '../../services/agent.service';

// Mock Azure AI SDK
jest.mock('@azure/ai-projects', () => ({
  AIProjectsClient: jest.fn().mockImplementation(() => ({
    agents: {
      createThread: jest.fn().mockResolvedValue({ id: 'thread-123' }),
      createMessage: jest.fn().mockResolvedValue({}),
      createRun: jest.fn().mockResolvedValue({ id: 'run-123', status: 'completed' }),
      listMessages: jest.fn().mockResolvedValue({
        data: [{ role: 'assistant', content: [{ type: 'text', text: { value: 'Hello learner!' } }] }],
      }),
    },
  })),
}));

jest.mock('@azure/identity', () => ({
  DefaultAzureCredential: jest.fn(),
}));

describe('AgentService', () => {
  let service: AgentService;

  beforeEach(() => {
    process.env.AZURE_AI_PROJECT_CONNECTION_STRING = 'test-connection';
    process.env.ORCHESTRATOR_AGENT_ID = 'orch-id';
    process.env.ARCHITECT_AGENT_ID = 'arch-id';
    process.env.MENTOR_AGENT_ID = 'ment-id';
    process.env.CHALLENGER_AGENT_ID = 'chal-id';
    process.env.NAIVE_STUDENT_AGENT_ID = 'naive-id';
    process.env.EVALUATOR_AGENT_ID = 'eval-id';
    service = new AgentService();
  });

  it('should create a new thread', async () => {
    const threadId = await service.createThread();
    expect(threadId).toBe('thread-123');
  });

  it('should send a message and get a response', async () => {
    const response = await service.sendMessage('thread-123', 'architect', 'Hello', 'System prompt');
    expect(response).toBe('Hello learner!');
  });
});
```

**Step 2: Implement agent service**

```typescript
// backend/src/services/agent.service.ts
import { AIProjectsClient } from '@azure/ai-projects';
import { DefaultAzureCredential } from '@azure/identity';
import { AgentRole } from '../types';
import dotenv from 'dotenv';

dotenv.config();

export class AgentService {
  private client: AIProjectsClient;
  private agentIds: Record<AgentRole, string>;

  constructor() {
    this.client = AIProjectsClient.fromConnectionString(
      process.env.AZURE_AI_PROJECT_CONNECTION_STRING!,
      new DefaultAzureCredential()
    );

    this.agentIds = {
      orchestrator: process.env.ORCHESTRATOR_AGENT_ID!,
      architect: process.env.ARCHITECT_AGENT_ID!,
      mentor: process.env.MENTOR_AGENT_ID!,
      challenger: process.env.CHALLENGER_AGENT_ID!,
      naive_student: process.env.NAIVE_STUDENT_AGENT_ID!,
      evaluator: process.env.EVALUATOR_AGENT_ID!,
    };
  }

  async createThread(): Promise<string> {
    const thread = await this.client.agents.createThread();
    return thread.id;
  }

  async sendMessage(
    threadId: string,
    agentRole: AgentRole,
    userMessage: string,
    systemContext: string
  ): Promise<string> {
    // Add the system context as an assistant message to set the agent's behavior
    await this.client.agents.createMessage(threadId, {
      role: 'user',
      content: userMessage,
    });

    const agentId = this.agentIds[agentRole];

    const run = await this.client.agents.createRun(threadId, agentId, {
      additionalInstructions: systemContext,
    });

    // Poll for completion
    let runStatus = run;
    while (runStatus.status === 'queued' || runStatus.status === 'in_progress') {
      await new Promise((resolve) => setTimeout(resolve, 500));
      runStatus = await this.client.agents.getRun(threadId, run.id);
    }

    if (runStatus.status !== 'completed') {
      throw new Error(`Agent run failed with status: ${runStatus.status}`);
    }

    const messages = await this.client.agents.listMessages(threadId);
    const lastAssistantMessage = messages.data.find((m: any) => m.role === 'assistant');

    if (!lastAssistantMessage || !lastAssistantMessage.content[0]) {
      throw new Error('No response from agent');
    }

    const content = lastAssistantMessage.content[0];
    if (content.type === 'text') {
      return content.text.value;
    }

    throw new Error('Unexpected response format from agent');
  }

  async sendMessageStreaming(
    threadId: string,
    agentRole: AgentRole,
    userMessage: string,
    systemContext: string,
    onToken: (token: string) => void
  ): Promise<string> {
    await this.client.agents.createMessage(threadId, {
      role: 'user',
      content: userMessage,
    });

    const agentId = this.agentIds[agentRole];

    const stream = await this.client.agents.createRunStreaming(threadId, agentId, {
      additionalInstructions: systemContext,
    });

    let fullResponse = '';

    for await (const event of stream) {
      if (event.event === 'thread.message.delta' && event.data?.delta?.content) {
        for (const part of event.data.delta.content) {
          if (part.type === 'text' && part.text?.value) {
            const token = part.text.value;
            fullResponse += token;
            onToken(token);
          }
        }
      }
    }

    return fullResponse;
  }
}
```

**Step 3: Run tests**

```bash
cd backend && npx jest src/__tests__/services/agent.service.test.ts --verbose
```

**Step 4: Commit**

```bash
git add backend/src/services/agent.service.ts backend/src/__tests__/services/agent.service.test.ts
git commit -m "feat: implement agent service with Azure AI SDK wrapper and streaming"
```

---

## Task 7: Mastery & Spaced Repetition Services

**Files:**
- Create: `backend/src/services/mastery.service.ts`
- Create: `backend/src/services/spaced-repetition.service.ts`
- Test: `backend/src/__tests__/services/mastery.service.test.ts`
- Test: `backend/src/__tests__/services/spaced-repetition.service.test.ts`

**Step 1: Write mastery service test**

```typescript
// backend/src/__tests__/services/mastery.service.test.ts
import { MasteryService } from '../../services/mastery.service';

describe('MasteryService', () => {
  const service = new MasteryService();

  describe('calculateOverallScore', () => {
    it('should weight dimensions correctly: clarity 30%, reasoning 25%, simplification 25%, connection 20%', () => {
      const score = service.calculateOverallScore(80, 70, 60, 50);
      // 80*0.3 + 70*0.25 + 60*0.25 + 50*0.2 = 24 + 17.5 + 15 + 10 = 66.5
      expect(score).toBe(66.5);
    });

    it('should return 100 for perfect scores', () => {
      expect(service.calculateOverallScore(100, 100, 100, 100)).toBe(100);
    });

    it('should return 0 for zero scores', () => {
      expect(service.calculateOverallScore(0, 0, 0, 0)).toBe(0);
    });
  });

  describe('getDecision', () => {
    it('should return advance for score >= 85', () => {
      expect(service.getDecision(85)).toBe('advance');
      expect(service.getDecision(100)).toBe('advance');
    });

    it('should return loop_back for score 60-84', () => {
      expect(service.getDecision(60)).toBe('loop_back');
      expect(service.getDecision(84)).toBe('loop_back');
    });

    it('should return teach_more for score < 60', () => {
      expect(service.getDecision(59)).toBe('teach_more');
      expect(service.getDecision(0)).toBe('teach_more');
    });
  });

  describe('parseEvaluatorResponse', () => {
    it('should extract JSON scores from evaluator response', () => {
      const response = `Great work! Here are the results:
\`\`\`json
{
  "concept": "photosynthesis",
  "scores": { "clarity": 80, "reasoning": 70, "simplification": 60, "connection": 50 },
  "overall": 66.5,
  "decision": "loop_back",
  "feedback": "Good clarity but needs work on simplification",
  "gaps": ["simplification of light reactions"]
}
\`\`\`
You're making good progress!`;

      const result = service.parseEvaluatorResponse(response);
      expect(result).not.toBeNull();
      expect(result!.scores.clarity).toBe(80);
      expect(result!.decision).toBe('loop_back');
    });

    it('should return null for responses without JSON', () => {
      expect(service.parseEvaluatorResponse('No JSON here')).toBeNull();
    });
  });
});
```

**Step 2: Implement mastery service**

```typescript
// backend/src/services/mastery.service.ts
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
```

**Step 3: Write spaced repetition test**

```typescript
// backend/src/__tests__/services/spaced-repetition.service.test.ts
import { SpacedRepetitionService } from '../../services/spaced-repetition.service';
import { SpacedRepetitionItem } from '../../types';

describe('SpacedRepetitionService', () => {
  const service = new SpacedRepetitionService();

  describe('createItem', () => {
    it('should create an item with 1-day initial interval', () => {
      const item = service.createItem('photosynthesis');
      expect(item.concept).toBe('photosynthesis');
      expect(item.interval).toBe(1);
      expect(item.easeFactor).toBe(2.5);
      expect(item.reviewCount).toBe(0);
    });
  });

  describe('processReview', () => {
    it('should increase interval on success', () => {
      const item: SpacedRepetitionItem = {
        concept: 'test',
        nextReviewAt: new Date(),
        interval: 1,
        easeFactor: 2.5,
        reviewCount: 0,
      };
      const updated = service.processReview(item, true);
      expect(updated.interval).toBe(2.5); // 1 * 2.5
      expect(updated.reviewCount).toBe(1);
    });

    it('should reset interval to 1 on failure for early reviews', () => {
      const item: SpacedRepetitionItem = {
        concept: 'test',
        nextReviewAt: new Date(),
        interval: 3,
        easeFactor: 2.5,
        reviewCount: 1,
      };
      const updated = service.processReview(item, false);
      expect(updated.interval).toBe(1);
    });

    it('should halve interval on failure for later reviews', () => {
      const item: SpacedRepetitionItem = {
        concept: 'test',
        nextReviewAt: new Date(),
        interval: 7,
        easeFactor: 2.5,
        reviewCount: 2,
      };
      const updated = service.processReview(item, false);
      expect(updated.interval).toBe(3.5); // 7 * 0.5
    });
  });

  describe('getDueItems', () => {
    it('should return items past their review date', () => {
      const items: SpacedRepetitionItem[] = [
        { concept: 'due', nextReviewAt: new Date('2020-01-01'), interval: 1, easeFactor: 2.5, reviewCount: 1 },
        { concept: 'not-due', nextReviewAt: new Date('2099-01-01'), interval: 1, easeFactor: 2.5, reviewCount: 1 },
      ];
      const due = service.getDueItems(items);
      expect(due).toHaveLength(1);
      expect(due[0].concept).toBe('due');
    });
  });
});
```

**Step 4: Implement spaced repetition service**

```typescript
// backend/src/services/spaced-repetition.service.ts
import { SpacedRepetitionItem } from '../types';

export class SpacedRepetitionService {
  createItem(concept: string): SpacedRepetitionItem {
    const now = new Date();
    const nextReview = new Date(now.getTime() + 24 * 60 * 60 * 1000); // +1 day

    return {
      concept,
      nextReviewAt: nextReview,
      interval: 1,
      easeFactor: 2.5,
      reviewCount: 0,
    };
  }

  processReview(item: SpacedRepetitionItem, success: boolean): SpacedRepetitionItem {
    let newInterval: number;
    let newEaseFactor = item.easeFactor;

    if (success) {
      newInterval = item.interval * item.easeFactor;
      // Slightly increase ease factor on success (capped at 3.0)
      newEaseFactor = Math.min(3.0, item.easeFactor + 0.1);
    } else {
      if (item.reviewCount < 2) {
        // Early reviews: reset to 1 day
        newInterval = 1;
      } else {
        // Later reviews: halve the interval
        newInterval = item.interval * 0.5;
      }
      // Decrease ease factor on failure (floor at 1.3)
      newEaseFactor = Math.max(1.3, item.easeFactor - 0.2);
    }

    const now = new Date();
    const nextReviewAt = new Date(now.getTime() + newInterval * 24 * 60 * 60 * 1000);

    return {
      ...item,
      interval: newInterval,
      easeFactor: newEaseFactor,
      nextReviewAt,
      reviewCount: item.reviewCount + 1,
    };
  }

  getDueItems(items: SpacedRepetitionItem[]): SpacedRepetitionItem[] {
    const now = new Date();
    return items.filter((item) => item.nextReviewAt <= now);
  }
}
```

**Step 5: Run tests**

```bash
cd backend && npx jest src/__tests__/services/ --verbose
```

**Step 6: Commit**

```bash
git add backend/src/services/mastery.service.ts backend/src/services/spaced-repetition.service.ts backend/src/__tests__/services/
git commit -m "feat: implement mastery scoring and spaced repetition services"
```

---

## Task 8: Orchestrator Service

**Files:**
- Create: `backend/src/services/orchestrator.service.ts`
- Test: `backend/src/__tests__/services/orchestrator.service.test.ts`

**Step 1: Write orchestrator service test**

```typescript
// backend/src/__tests__/services/orchestrator.service.test.ts
import { OrchestratorService } from '../../services/orchestrator.service';
import { SessionState, AgentRole } from '../../types';

// Mock dependencies
jest.mock('../../services/agent.service');
jest.mock('../../services/session.service');
jest.mock('../../services/mastery.service');
jest.mock('../../services/spaced-repetition.service');

describe('OrchestratorService', () => {
  describe('selectAgent', () => {
    const service = new OrchestratorService();

    function makeSession(overrides: Partial<SessionState> = {}): SessionState {
      return {
        sessionId: 'test',
        threadId: 'thread-1',
        learnerProfile: { level: 'beginner', language: 'en', culturalContext: '', goals: '', assessmentAnswers: [] },
        topicMap: { rootTopic: '', concepts: [], prerequisites: [], knowledgeGraph: [] },
        currentPhase: 'discovery',
        currentStep: 'A1',
        conceptIndex: 0,
        gapRegistry: [],
        masteryScores: {},
        spacedRepetition: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
      };
    }

    it('should select architect for new session in discovery phase', () => {
      const agent = service.selectAgent(makeSession());
      expect(agent).toBe('architect');
    });

    it('should select architect during diagnosis steps A1-A4', () => {
      expect(service.selectAgent(makeSession({ currentStep: 'A2' }))).toBe('architect');
      expect(service.selectAgent(makeSession({ currentStep: 'A3' }))).toBe('architect');
    });

    it('should select mentor for step B1', () => {
      expect(service.selectAgent(makeSession({ currentPhase: 'learning_loop', currentStep: 'B1' }))).toBe('mentor');
    });

    it('should select challenger for step B2', () => {
      expect(service.selectAgent(makeSession({ currentPhase: 'learning_loop', currentStep: 'B2' }))).toBe('challenger');
    });

    it('should select naive_student for step B3', () => {
      expect(service.selectAgent(makeSession({ currentPhase: 'learning_loop', currentStep: 'B3' }))).toBe('naive_student');
    });

    it('should select evaluator for step B4', () => {
      expect(service.selectAgent(makeSession({ currentPhase: 'learning_loop', currentStep: 'B4' }))).toBe('evaluator');
    });

    it('should select evaluator for validation phase', () => {
      expect(service.selectAgent(makeSession({ currentPhase: 'validation', currentStep: 'C1' }))).toBe('evaluator');
    });
  });
});
```

**Step 2: Implement orchestrator service**

```typescript
// backend/src/services/orchestrator.service.ts
import { AgentService } from './agent.service';
import { SessionService } from './session.service';
import { MasteryService, EvaluatorResult } from './mastery.service';
import { SpacedRepetitionService } from './spaced-repetition.service';
import {
  SessionState,
  AgentRole,
  LearningPhase,
  LearningStep,
  MasteryResponse,
  MasteryProgress,
  HandoffContext,
} from '../types';
import {
  getArchitectPrompt,
  getMentorPrompt,
  getChallengerPrompt,
  getNaiveStudentPrompt,
  getEvaluatorPrompt,
  getOrchestratorPrompt,
} from '../agents';

export class OrchestratorService {
  private agentService: AgentService;
  private sessionService: SessionService;
  private masteryService: MasteryService;
  private spacedRepetitionService: SpacedRepetitionService;

  constructor() {
    this.agentService = new AgentService();
    this.sessionService = new SessionService();
    this.masteryService = new MasteryService();
    this.spacedRepetitionService = new SpacedRepetitionService();
  }

  selectAgent(session: SessionState): AgentRole {
    // Check for due spaced repetition reviews
    const dueReviews = this.spacedRepetitionService.getDueItems(session.spacedRepetition);
    if (dueReviews.length > 0 && session.currentStep === 'B5') {
      return 'mentor'; // Conduct review
    }

    switch (session.currentPhase) {
      case 'discovery':
        return 'architect';

      case 'learning_loop':
        switch (session.currentStep) {
          case 'B1': return 'mentor';
          case 'B2': return 'challenger';
          case 'B3': return 'naive_student';
          case 'B4': return 'evaluator';
          case 'B5': return 'orchestrator';
          default: return 'mentor';
        }

      case 'validation':
        switch (session.currentStep) {
          case 'C1': return 'evaluator';
          case 'C2': return 'evaluator';
          case 'C3': return 'orchestrator';
          default: return 'evaluator';
        }

      default:
        return 'architect';
    }
  }

  getSystemPrompt(agent: AgentRole, session: SessionState): string {
    switch (agent) {
      case 'orchestrator': return getOrchestratorPrompt(session);
      case 'architect': return getArchitectPrompt(session);
      case 'mentor': return getMentorPrompt(session);
      case 'challenger': return getChallengerPrompt(session);
      case 'naive_student': return getNaiveStudentPrompt(session);
      case 'evaluator': return getEvaluatorPrompt(session);
    }
  }

  async processMessage(
    message: string,
    sessionId?: string,
    threadId?: string,
    language?: string
  ): Promise<MasteryResponse> {
    // Get or create session
    let session: SessionState;
    if (sessionId) {
      const existing = await this.sessionService.getSession(sessionId);
      if (!existing) throw new Error(`Session ${sessionId} not found`);
      session = existing;
    } else {
      session = await this.sessionService.createSession(language || 'en');
    }

    // Create thread if needed
    if (!session.threadId) {
      const newThreadId = await this.agentService.createThread();
      session.threadId = newThreadId;
      await this.sessionService.updateSession(session.sessionId, { threadId: newThreadId });
    }

    // Save user message
    await this.sessionService.addMessage(session.sessionId, 'user', message, null);

    // Select agent and get system prompt
    const selectedAgent = this.selectAgent(session);
    const systemPrompt = this.getSystemPrompt(selectedAgent, session);

    // Call agent
    const response = await this.agentService.sendMessage(
      session.threadId,
      selectedAgent,
      message,
      systemPrompt
    );

    // Save assistant response
    await this.sessionService.addMessage(session.sessionId, 'assistant', response, selectedAgent);

    // Process agent-specific post-actions
    await this.processPostActions(session, selectedAgent, response);

    // Build progress
    const progress = this.buildMasteryProgress(session);

    return {
      response,
      threadId: session.threadId,
      sessionId: session.sessionId,
      currentPhase: session.currentPhase,
      currentAgent: selectedAgent,
      masteryProgress: progress,
    };
  }

  async processMessageStreaming(
    message: string,
    sessionId: string | undefined,
    threadId: string | undefined,
    language: string | undefined,
    onToken: (token: string) => void
  ): Promise<MasteryResponse> {
    let session: SessionState;
    if (sessionId) {
      const existing = await this.sessionService.getSession(sessionId);
      if (!existing) throw new Error(`Session ${sessionId} not found`);
      session = existing;
    } else {
      session = await this.sessionService.createSession(language || 'en');
    }

    if (!session.threadId) {
      const newThreadId = await this.agentService.createThread();
      session.threadId = newThreadId;
      await this.sessionService.updateSession(session.sessionId, { threadId: newThreadId });
    }

    await this.sessionService.addMessage(session.sessionId, 'user', message, null);

    const selectedAgent = this.selectAgent(session);
    const systemPrompt = this.getSystemPrompt(selectedAgent, session);

    const response = await this.agentService.sendMessageStreaming(
      session.threadId,
      selectedAgent,
      message,
      systemPrompt,
      onToken
    );

    await this.sessionService.addMessage(session.sessionId, 'assistant', response, selectedAgent);
    await this.processPostActions(session, selectedAgent, response);

    return {
      response,
      threadId: session.threadId,
      sessionId: session.sessionId,
      currentPhase: session.currentPhase,
      currentAgent: selectedAgent,
      masteryProgress: this.buildMasteryProgress(session),
    };
  }

  private async processPostActions(
    session: SessionState,
    agent: AgentRole,
    response: string
  ): Promise<void> {
    switch (agent) {
      case 'architect':
        await this.handleArchitectResponse(session, response);
        break;
      case 'evaluator':
        await this.handleEvaluatorResponse(session, response);
        break;
      default:
        await this.advanceStep(session);
        break;
    }
  }

  private async handleArchitectResponse(session: SessionState, response: string): Promise<void> {
    // Try to detect language from the conversation if still on A1
    if (session.currentStep === 'A1') {
      await this.sessionService.updateSession(session.sessionId, { currentStep: 'A2' });
      session.currentStep = 'A2';
    } else if (session.currentStep === 'A2') {
      await this.sessionService.updateSession(session.sessionId, { currentStep: 'A3' });
      session.currentStep = 'A3';
    } else if (session.currentStep === 'A3') {
      // Try to parse knowledge graph from response
      await this.sessionService.updateSession(session.sessionId, { currentStep: 'A4' });
      session.currentStep = 'A4';
    } else if (session.currentStep === 'A4') {
      // Roadmap presented, transition to learning loop
      await this.sessionService.updateSession(session.sessionId, {
        currentPhase: 'learning_loop',
        currentStep: 'B1',
      });
      session.currentPhase = 'learning_loop';
      session.currentStep = 'B1';
    }
  }

  private async handleEvaluatorResponse(session: SessionState, response: string): Promise<void> {
    const result = this.masteryService.parseEvaluatorResponse(response);

    if (result) {
      const concept = session.topicMap.concepts[session.conceptIndex] || '';
      const iterationCount = (session.masteryScores[concept]?.iterationCount || 0) + 1;
      const score = this.masteryService.toConceptScore(result, iterationCount);

      await this.sessionService.upsertMasteryScore(session.sessionId, concept, score);
      session.masteryScores[concept] = score;

      if (result.decision === 'advance') {
        // Add to spaced repetition
        const srItem = this.spacedRepetitionService.createItem(concept);
        session.spacedRepetition.push(srItem);

        if (session.conceptIndex + 1 >= session.topicMap.concepts.length) {
          // All concepts mastered — go to validation
          await this.sessionService.updateSession(session.sessionId, {
            currentPhase: 'validation',
            currentStep: 'C1',
          });
          session.currentPhase = 'validation';
          session.currentStep = 'C1';
        } else {
          // Advance to next concept
          const nextIndex = session.conceptIndex + 1;
          await this.sessionService.updateSession(session.sessionId, {
            conceptIndex: nextIndex,
            currentStep: 'B1',
          });
          session.conceptIndex = nextIndex;
          session.currentStep = 'B1';
        }
      } else {
        // Loop back to B1
        await this.sessionService.updateSession(session.sessionId, { currentStep: 'B1' });
        session.currentStep = 'B1';
      }
    } else {
      // Could not parse — default advance step
      await this.advanceStep(session);
    }
  }

  private async advanceStep(session: SessionState): Promise<void> {
    const stepOrder: Record<string, LearningStep> = {
      'B1': 'B2',
      'B2': 'B3',
      'B3': 'B4',
      'B4': 'B1', // Fallback — evaluator normally handles this
      'B5': 'B1',
      'C1': 'C2',
      'C2': 'C3',
    };

    const nextStep = stepOrder[session.currentStep];
    if (nextStep) {
      await this.sessionService.updateSession(session.sessionId, { currentStep: nextStep });
      session.currentStep = nextStep;
    }
  }

  private buildMasteryProgress(session: SessionState): MasteryProgress {
    const scores = session.masteryScores;
    const totalScores = Object.values(scores);
    const overallMastery = totalScores.length > 0
      ? Math.round(totalScores.reduce((sum, s) => sum + s.overall, 0) / totalScores.length)
      : 0;

    const dueReviews = this.spacedRepetitionService.getDueItems(session.spacedRepetition);

    return {
      currentPhase: session.currentPhase,
      currentStep: session.currentStep,
      currentConcept: session.topicMap.concepts[session.conceptIndex] || '',
      conceptIndex: session.conceptIndex,
      totalConcepts: session.topicMap.concepts.length,
      overallMastery,
      conceptScores: scores,
      reviewsDue: dueReviews.length,
      knowledgeGraph: session.topicMap.knowledgeGraph,
    };
  }
}
```

**Step 3: Run tests**

```bash
cd backend && npx jest src/__tests__/services/orchestrator.service.test.ts --verbose
```

**Step 4: Commit**

```bash
git add backend/src/services/orchestrator.service.ts backend/src/__tests__/services/orchestrator.service.test.ts
git commit -m "feat: implement orchestrator service with agent selection and phase management"
```

---

## Task 9: API Routes & Express Server

**Files:**
- Create: `backend/src/routes/mastery.routes.ts`
- Create: `backend/src/routes/session.routes.ts`
- Create: `backend/src/index.ts`

**Step 1: Create mastery route with SSE streaming**

```typescript
// backend/src/routes/mastery.routes.ts
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { OrchestratorService } from '../services/orchestrator.service';

const router = Router();
const orchestrator = new OrchestratorService();

const masteryRequestSchema = z.object({
  message: z.string().min(1).max(10000),
  sessionId: z.string().optional(),
  threadId: z.string().optional(),
  language: z.string().optional(),
});

router.post('/universal-mastery-agent', async (req: Request, res: Response) => {
  try {
    const parsed = masteryRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
      return;
    }

    const { message, sessionId, threadId, language } = parsed.data;

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const result = await orchestrator.processMessageStreaming(
      message,
      sessionId,
      threadId,
      language,
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
```

**Step 2: Create session route**

```typescript
// backend/src/routes/session.routes.ts
import { Router, Request, Response } from 'express';
import { SessionService } from '../services/session.service';
import { SpacedRepetitionService } from '../services/spaced-repetition.service';
import { MasteryProgress } from '../types';

const router = Router();
const sessionService = new SessionService();
const spacedRepetitionService = new SpacedRepetitionService();

router.get('/sessions/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
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
      reviewsDue: dueReviews.length,
      knowledgeGraph: session.topicMap.knowledgeGraph,
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
```

**Step 3: Create Express server entry point**

```typescript
// backend/src/index.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import masteryRoutes from './routes/mastery.routes';
import sessionRoutes from './routes/session.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use('/api', masteryRoutes);
app.use('/api', sessionRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`UMA backend running on port ${PORT}`);
});

export default app;
```

**Step 4: Commit**

```bash
git add backend/src/routes/ backend/src/index.ts
git commit -m "feat: add API routes with SSE streaming and Express server"
```

---

## Task 10: Frontend Scaffolding

**Files:**
- Create: `frontend/` via Vite scaffolding
- Modify: `frontend/tailwind.config.js`
- Modify: `frontend/src/index.css`
- Create: `frontend/src/types/index.ts`

**Step 1: Scaffold React + Vite + TypeScript project**

```bash
cd "D:/Github/master-anything" && npm create vite@latest frontend -- --template react-ts
```

**Step 2: Install dependencies**

```bash
cd frontend && npm install && npm install -D tailwindcss @tailwindcss/vite && npm install @xyflow/react mermaid react-markdown remark-gfm recharts
```

**Step 3: Configure Tailwind**

```typescript
// frontend/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
```

Replace `frontend/src/index.css` with:

```css
@import "tailwindcss";
```

**Step 4: Create frontend types (mirroring backend API types)**

```typescript
// frontend/src/types/index.ts
export type LearningPhase = 'discovery' | 'learning_loop' | 'validation';
export type AgentRole = 'orchestrator' | 'architect' | 'mentor' | 'challenger' | 'naive_student' | 'evaluator';

export interface ConceptScore {
  clarity: number;
  reasoning: number;
  simplification: number;
  connection: number;
  overall: number;
  iterationCount: number;
}

export interface KnowledgeGraphNode {
  id: string;
  label: string;
  status: 'locked' | 'current' | 'mastered';
  prerequisites: string[];
}

export interface MasteryProgress {
  currentPhase: LearningPhase;
  currentStep: string;
  currentConcept: string;
  conceptIndex: number;
  totalConcepts: number;
  overallMastery: number;
  conceptScores: Record<string, ConceptScore>;
  reviewsDue: number;
  knowledgeGraph: KnowledgeGraphNode[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  agentRole: AgentRole | null;
  timestamp: string;
}

export interface SSEEvent {
  type: 'token' | 'done' | 'error';
  content?: string;
  response?: string;
  threadId?: string;
  sessionId?: string;
  currentPhase?: LearningPhase;
  currentAgent?: AgentRole;
  masteryProgress?: MasteryProgress;
  error?: string;
}
```

**Step 5: Clean up Vite defaults**

Remove `frontend/src/App.css` and the default Vite counter content from `App.tsx`. Replace with a minimal placeholder:

```tsx
// frontend/src/App.tsx
import { ChatPage } from './pages/ChatPage';

function App() {
  return <ChatPage />;
}

export default App;
```

**Step 6: Commit**

```bash
git add frontend/
git commit -m "feat: scaffold React + Vite + Tailwind frontend with types"
```

---

## Task 11: Chat Hook (useChat)

**Files:**
- Create: `frontend/src/hooks/useChat.ts`

**Step 1: Implement useChat hook with SSE**

```typescript
// frontend/src/hooks/useChat.ts
import { useState, useCallback, useRef } from 'react';
import { ChatMessage, MasteryProgress, SSEEvent, AgentRole } from '../types';

interface UseChatReturn {
  messages: ChatMessage[];
  progress: MasteryProgress | null;
  isLoading: boolean;
  sessionId: string | null;
  threadId: string | null;
  sendMessage: (content: string) => Promise<void>;
  loadSession: (sessionId: string) => Promise<void>;
}

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [progress, setProgress] = useState<MasteryProgress | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const messageIdCounter = useRef(0);

  const sendMessage = useCallback(async (content: string) => {
    const userMessage: ChatMessage = {
      id: String(++messageIdCounter.current),
      role: 'user',
      content,
      agentRole: null,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Placeholder for streaming assistant message
    const assistantId = String(++messageIdCounter.current);
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      agentRole: null,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, assistantMessage]);

    try {
      const response = await fetch('/api/universal-mastery-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          sessionId,
          threadId,
        }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No response stream');

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6);

          try {
            const event: SSEEvent = JSON.parse(jsonStr);

            if (event.type === 'token' && event.content) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: m.content + event.content }
                    : m
                )
              );
            } else if (event.type === 'done') {
              if (event.sessionId) setSessionId(event.sessionId);
              if (event.threadId) setThreadId(event.threadId);
              if (event.masteryProgress) setProgress(event.masteryProgress);
              if (event.currentAgent) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, agentRole: event.currentAgent as AgentRole }
                      : m
                  )
                );
              }
            } else if (event.type === 'error') {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: `Error: ${event.error}` }
                    : m
                )
              );
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    } catch (error) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: 'Failed to connect to the learning agent. Please try again.' }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, threadId]);

  const loadSession = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/sessions/${id}`);
      if (!response.ok) throw new Error('Session not found');

      const data = await response.json();
      setSessionId(data.session.sessionId);
      setThreadId(data.session.threadId);
      setProgress(data.masteryProgress);
      setMessages(
        data.messages.map((m: any, i: number) => ({
          id: String(i + 1),
          ...m,
        }))
      );
      messageIdCounter.current = data.messages.length;
    } catch (error) {
      console.error('Failed to load session:', error);
    }
  }, []);

  return { messages, progress, isLoading, sessionId, threadId, sendMessage, loadSession };
}
```

**Step 2: Commit**

```bash
git add frontend/src/hooks/
git commit -m "feat: implement useChat hook with SSE streaming"
```

---

## Task 12: Chat Components

**Files:**
- Create: `frontend/src/components/ChatArea.tsx`
- Create: `frontend/src/components/MessageInput.tsx`
- Create: `frontend/src/components/MermaidDiagram.tsx`

**Step 1: Create Mermaid diagram renderer**

```tsx
// frontend/src/components/MermaidDiagram.tsx
import { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({ startOnLoad: false, theme: 'neutral' });

interface MermaidDiagramProps {
  chart: string;
}

export function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const render = async () => {
      if (!containerRef.current) return;
      const id = `mermaid-${Math.random().toString(36).slice(2)}`;
      try {
        const { svg } = await mermaid.render(id, chart);
        containerRef.current.innerHTML = svg;
      } catch {
        containerRef.current.innerHTML = `<pre class="text-red-500 text-sm">Failed to render diagram</pre>`;
      }
    };
    render();
  }, [chart]);

  return <div ref={containerRef} className="my-4 flex justify-center" />;
}
```

**Step 2: Create ChatArea component**

```tsx
// frontend/src/components/ChatArea.tsx
import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatMessage } from '../types';
import { MermaidDiagram } from './MermaidDiagram';

interface ChatAreaProps {
  messages: ChatMessage[];
  isLoading: boolean;
}

export function ChatArea({ messages, isLoading }: ChatAreaProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-lg">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Master Any Topic</h2>
          <p className="text-gray-600 mb-6">
            Tell me what subject you'd like to deeply understand. I'll guide you through an
            interactive learning journey using the Feynman Method.
          </p>
          <div className="grid grid-cols-1 gap-3 text-left">
            {[
              'I want to master quantum mechanics from scratch',
              'Help me deeply understand how neural networks learn',
              'I need to master contract law for my bar exam',
              'Teach me music theory, I\'m a complete beginner',
            ].map((example) => (
              <button
                key={example}
                className="p-3 text-sm text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-[80%] rounded-2xl px-4 py-3 ${
              message.role === 'user'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            {message.role === 'assistant' ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ className, children }) {
                    const match = /language-mermaid/.exec(className || '');
                    if (match) {
                      return <MermaidDiagram chart={String(children).trim()} />;
                    }
                    return (
                      <code className={`${className} bg-gray-200 rounded px-1 py-0.5 text-sm`}>
                        {children}
                      </code>
                    );
                  },
                  pre({ children }) {
                    return <div className="my-2">{children}</div>;
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            ) : (
              <p>{message.content}</p>
            )}
          </div>
        </div>
      ))}
      {isLoading && messages[messages.length - 1]?.content === '' && (
        <div className="flex justify-start">
          <div className="bg-gray-100 rounded-2xl px-4 py-3">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.1s]" />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
            </div>
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
```

**Step 3: Create MessageInput component**

```tsx
// frontend/src/components/MessageInput.tsx
import { useState, KeyboardEvent } from 'react';

interface MessageInputProps {
  onSend: (message: string) => void;
  disabled: boolean;
}

export function MessageInput({ onSend, disabled }: MessageInputProps) {
  const [input, setInput] = useState('');

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setInput('');
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-gray-200 p-4">
      <div className="flex items-end gap-3 max-w-4xl mx-auto">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Explain what you'd like to learn..."
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={disabled || !input.trim()}
          className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add frontend/src/components/ChatArea.tsx frontend/src/components/MessageInput.tsx frontend/src/components/MermaidDiagram.tsx
git commit -m "feat: implement chat area with markdown and Mermaid rendering"
```

---

## Task 13: Progress Sidebar Components

**Files:**
- Create: `frontend/src/components/PhaseIndicator.tsx`
- Create: `frontend/src/components/MasteryChart.tsx`
- Create: `frontend/src/components/MasteryBadge.tsx`
- Create: `frontend/src/components/KnowledgeGraph.tsx`
- Create: `frontend/src/components/ProgressSidebar.tsx`

**Step 1: Create PhaseIndicator**

```tsx
// frontend/src/components/PhaseIndicator.tsx
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
```

**Step 2: Create MasteryChart (radar chart)**

```tsx
// frontend/src/components/MasteryChart.tsx
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
```

**Step 3: Create MasteryBadge**

```tsx
// frontend/src/components/MasteryBadge.tsx
import { useEffect, useState } from 'react';

interface MasteryBadgeProps {
  concept: string;
  show: boolean;
  onDismiss: () => void;
}

export function MasteryBadge({ concept, show, onDismiss }: MasteryBadgeProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        onDismiss();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [show, onDismiss]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
      <div className="bg-white shadow-2xl rounded-2xl p-8 text-center animate-bounce pointer-events-auto">
        <div className="text-5xl mb-3">&#11088;</div>
        <h3 className="text-xl font-bold text-gray-800 mb-1">Mastery Achieved!</h3>
        <p className="text-gray-600">{concept}</p>
      </div>
    </div>
  );
}
```

**Step 4: Create KnowledgeGraph**

```tsx
// frontend/src/components/KnowledgeGraph.tsx
import { useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { KnowledgeGraphNode } from '../types';

interface KnowledgeGraphProps {
  nodes: KnowledgeGraphNode[];
}

const statusColors: Record<string, { bg: string; border: string }> = {
  mastered: { bg: '#dcfce7', border: '#16a34a' },
  current: { bg: '#fef3c7', border: '#d97706' },
  locked: { bg: '#f3f4f6', border: '#9ca3af' },
};

export function KnowledgeGraph({ nodes: graphNodes }: KnowledgeGraphProps) {
  if (graphNodes.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-gray-500">
        Knowledge graph will appear after topic diagnosis
      </div>
    );
  }

  const flowNodes: Node[] = graphNodes.map((node, i) => ({
    id: node.id,
    position: { x: 50, y: i * 80 },
    data: { label: node.label },
    style: {
      background: statusColors[node.status].bg,
      border: `2px solid ${statusColors[node.status].border}`,
      borderRadius: '8px',
      padding: '8px 12px',
      fontSize: '12px',
    },
  }));

  const flowEdges: Edge[] = graphNodes.flatMap((node) =>
    node.prerequisites.map((prereq) => ({
      id: `${prereq}-${node.id}`,
      source: prereq,
      target: node.id,
      animated: node.status === 'current',
    }))
  );

  return (
    <div className="h-[250px] w-full">
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        fitView
        panOnDrag={false}
        zoomOnScroll={false}
        nodesDraggable={false}
        nodesConnectable={false}
      >
        <Background />
      </ReactFlow>
    </div>
  );
}
```

**Step 5: Create ProgressSidebar**

```tsx
// frontend/src/components/ProgressSidebar.tsx
import { useState } from 'react';
import { MasteryProgress } from '../types';
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
```

**Step 6: Commit**

```bash
git add frontend/src/components/
git commit -m "feat: implement progress sidebar with phase indicator, mastery chart, and knowledge graph"
```

---

## Task 14: Session Summary & Main Page Layout

**Files:**
- Create: `frontend/src/components/SessionSummary.tsx`
- Create: `frontend/src/pages/ChatPage.tsx`

**Step 1: Create SessionSummary**

```tsx
// frontend/src/components/SessionSummary.tsx
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
```

**Step 2: Create ChatPage layout**

```tsx
// frontend/src/pages/ChatPage.tsx
import { useState, useCallback } from 'react';
import { useChat } from '../hooks/useChat';
import { ChatArea } from '../components/ChatArea';
import { MessageInput } from '../components/MessageInput';
import { ProgressSidebar } from '../components/ProgressSidebar';
import { SessionSummary } from '../components/SessionSummary';
import { MasteryBadge } from '../components/MasteryBadge';
import { PhaseIndicator } from '../components/PhaseIndicator';

export function ChatPage() {
  const { messages, progress, isLoading, sendMessage } = useChat();
  const [masteryBadgeConcept, setMasteryBadgeConcept] = useState<string | null>(null);

  // TODO: Detect new mastery achievements by comparing progress updates
  const handleDismissBadge = useCallback(() => setMasteryBadgeConcept(null), []);

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 px-6 py-3 flex items-center justify-between bg-white">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-gray-800">Master Anything</h1>
          {progress && (
            <PhaseIndicator phase={progress.currentPhase} step={progress.currentStep} />
          )}
        </div>
        {progress?.currentConcept && (
          <span className="text-sm text-gray-500">{progress.currentConcept}</span>
        )}
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat column */}
        <div className="flex-1 flex flex-col">
          <ChatArea messages={messages} isLoading={isLoading} />
          {progress && <SessionSummary progress={progress} />}
          <MessageInput onSend={sendMessage} disabled={isLoading} />
        </div>

        {/* Sidebar */}
        <ProgressSidebar progress={progress} />
      </div>

      {/* Mastery celebration overlay */}
      <MasteryBadge
        concept={masteryBadgeConcept || ''}
        show={!!masteryBadgeConcept}
        onDismiss={handleDismissBadge}
      />
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add frontend/src/components/SessionSummary.tsx frontend/src/pages/ChatPage.tsx
git commit -m "feat: implement session summary and main chat page layout"
```

---

## Task 15: Wiring & Integration Testing

**Step 1: Verify backend compiles**

```bash
cd backend && npx tsc --noEmit
```
Fix any type errors.

**Step 2: Verify frontend compiles**

```bash
cd frontend && npx tsc --noEmit
```
Fix any type errors.

**Step 3: Test backend starts**

```bash
cd backend && cp .env.example .env
# Fill in Azure credentials in .env
npm run dev
```
Verify: `curl http://localhost:3001/health` returns `{"status":"ok"}`

**Step 4: Test frontend starts**

```bash
cd frontend && npm run dev
```
Verify: Browser at http://localhost:5173 shows the chat interface.

**Step 5: End-to-end test**

Open the browser, type a topic (e.g., "I want to master photosynthesis"), and verify:
- Message appears in chat
- SSE tokens stream in
- Progress sidebar updates
- Phase indicator shows "Discovery"

**Step 6: Final commit**

```bash
git add -A
git commit -m "feat: complete UMA web interface v1 - full-stack integration"
```

---

## Summary

| Task | Description | Key Files |
|------|-------------|-----------|
| 1 | Project scaffolding | package.json, tsconfig, .env |
| 2 | Shared types | backend/src/types/ |
| 3 | Database schema & connection | backend/src/db/ |
| 4 | Session service | backend/src/services/session.service.ts |
| 5 | Agent system prompts | backend/src/agents/*.ts |
| 6 | Agent service (Azure AI) | backend/src/services/agent.service.ts |
| 7 | Mastery & spaced repetition | backend/src/services/mastery.service.ts, spaced-repetition.service.ts |
| 8 | Orchestrator service | backend/src/services/orchestrator.service.ts |
| 9 | API routes & Express server | backend/src/routes/, backend/src/index.ts |
| 10 | Frontend scaffolding | frontend/ (Vite + Tailwind) |
| 11 | useChat hook | frontend/src/hooks/useChat.ts |
| 12 | Chat components | ChatArea, MessageInput, MermaidDiagram |
| 13 | Sidebar components | ProgressSidebar, PhaseIndicator, MasteryChart, KnowledgeGraph, MasteryBadge |
| 14 | Page layout & summary | ChatPage, SessionSummary |
| 15 | Integration testing | Compile checks, dev server, E2E |
