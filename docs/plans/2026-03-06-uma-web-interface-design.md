> **Status: Completed historical record.** This design document was written before implementation. The actual codebase may differ — see the [root README](../../README.md) for the current, authoritative documentation.

# Universal Mastery Agent — Web Interface Design

## Overview

Web interface for the Universal Mastery Agent (UMA), a multi-agent AI learning system that uses the Feynman Method to help learners achieve deep mastery of any subject. Six specialized Azure AI agents operate behind a single unified chat interface.

## Decisions

- **Architecture:** Monorepo with Express.js API + React SPA
- **Frontend:** React 19 + Vite 7 + TypeScript + Tailwind CSS 4
- **Backend:** Express.js + TypeScript
- **AI:** Azure AI Projects SDK — 6 separate agents (Orchestrator, Architect, Mentor, Challenger, Naive Student, Evaluator)
- **Database:** Azure SQL Database
- **Streaming:** Server-Sent Events (SSE)
- **Diagrams:** React Flow (knowledge graph), Mermaid.js (inline), Recharts (scores)

## Project Structure

```
master-anything/
├── backend/
│   ├── src/
│   │   ├── agents/           # Agent configs and system prompts
│   │   │   ├── orchestrator.ts
│   │   │   ├── architect.ts
│   │   │   ├── mentor.ts
│   │   │   ├── challenger.ts
│   │   │   ├── naive-student.ts
│   │   │   └── evaluator.ts
│   │   ├── services/
│   │   │   ├── orchestrator.service.ts   # Agent selection, context handoff, transition smoothing
│   │   │   ├── agent.service.ts          # Azure AI SDK wrapper, thread management
│   │   │   ├── session.service.ts        # Session state CRUD (Azure SQL)
│   │   │   ├── mastery.service.ts        # 4-dimension scoring engine
│   │   │   └── spaced-repetition.service.ts  # SM-2 algorithm
│   │   ├── routes/
│   │   │   ├── mastery.routes.ts         # POST /api/universal-mastery-agent
│   │   │   └── session.routes.ts         # GET /api/sessions/:sessionId
│   │   ├── db/
│   │   │   ├── schema.sql                # Azure SQL table definitions
│   │   │   └── connection.ts             # Database connection
│   │   ├── types/                        # Shared TypeScript types
│   │   └── index.ts                      # Express app entry point
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatArea.tsx              # Message list with markdown + Mermaid
│   │   │   ├── MessageInput.tsx          # Text input + send button
│   │   │   ├── ProgressSidebar.tsx       # Collapsible sidebar container
│   │   │   ├── KnowledgeGraph.tsx        # React Flow topic map
│   │   │   ├── MasteryChart.tsx          # Recharts radar chart (4 dimensions)
│   │   │   ├── PhaseIndicator.tsx        # Color-coded phase badge
│   │   │   ├── MasteryBadge.tsx          # Animated celebration on mastery
│   │   │   ├── SessionSummary.tsx        # End-of-session mastery report
│   │   │   └── MermaidDiagram.tsx        # Inline Mermaid renderer
│   │   ├── hooks/
│   │   │   └── useChat.ts               # SSE connection, message state, session recovery
│   │   ├── pages/
│   │   │   └── ChatPage.tsx             # Main layout: header + chat + sidebar
│   │   ├── types/                       # Shared types
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── vite.config.ts                 # Includes @tailwindcss/vite plugin (no standalone tailwind config)
│   └── tsconfig.json
├── docs/
│   └── plans/
└── Universal_Mastery_Agent_Spec_v1.docx
```

## Backend Architecture

### API Endpoints

**POST /api/universal-mastery-agent**
- Request: `{ message, sessionId?, threadId?, language? }`
- Response (SSE stream): tokens streamed, then final JSON:
  ```json
  {
    "response": "string",
    "threadId": "string",
    "sessionId": "string",
    "currentPhase": "discovery | learning_loop | validation",
    "currentAgent": "architect | mentor | challenger | naive_student | evaluator",
    "masteryProgress": {
      "currentPhase": "learning_loop",
      "currentStep": "B2",
      "currentConcept": "Wave-particle duality",
      "conceptIndex": 3,
      "totalConcepts": 12,
      "overallMastery": 72,
      "conceptScores": {},
      "reviewsDue": 2
    }
  }
  ```

**GET /api/sessions/:sessionId**
- Returns full session state for recovery (chat history, progress, sidebar data)

### Orchestration Logic

Decision tree for agent selection:

| Condition | Action | Agent |
|-----------|--------|-------|
| New session / new topic | Start diagnosis | Architect |
| Diagnosis incomplete | Continue assessment | Architect |
| Roadmap accepted | Begin first concept | Mentor |
| Learner explains concept | Challenge understanding | Challenger |
| Challenge score > 70% | Test simplification | Naive Student |
| Iteration complete | Score and decide | Evaluator |
| Mastery score >= 85% | Advance or validate | Orchestrator |
| All concepts mastered | Final assessment | Evaluator |
| Review item due | Trigger spaced review | Mentor |
| Learner off-topic | Redirect gently | Mentor |

### Context Handoff

Each agent transition includes:
- Learner's last message (verbatim)
- Current phase and step
- Session state (concept, scores, gaps)
- Specific instruction for receiving agent
- Learner's language preference
- Tone guidance for consistency

### Transition Smoothing

- Never announce agent switches
- All agents speak as "I" — one unified persona
- Maintain emotional tone continuity across transitions

### Multilingual Support

- Architect detects language from first message, stores in learner profile
- All agent system prompts include: "Always respond in the learner's preferred language: {language}"
- Language included in every context handoff
- Mixed-language switching supported — Orchestrator updates profile on detection

### Azure SQL Schema

Tables:
- `sessions` — id, thread_id, current_phase, current_step, concept_index, created_at, updated_at
- `learner_profiles` — session_id, level, language, cultural_context, goals, assessment_answers
- `topic_maps` — session_id, root_topic, concepts (JSON), prerequisites (JSON), knowledge_graph (JSON)
- `mastery_scores` — session_id, concept, clarity, reasoning, simplification, connection, overall, iteration_count
- `spaced_repetition_queue` — session_id, concept, next_review_at, interval, ease_factor
- `conversation_history` — session_id, role, content, agent_role, timestamp

### Mastery Scoring

4 dimensions, weighted:
- Explanation Clarity: 30%
- Depth of Reasoning: 25%
- Simplification Ability: 25%
- Connection Building: 20%

Decision thresholds (as implemented):
- overall >= 85%: `advance` — ready for next concept
- overall 60-84%: `loop_back` — re-enter learning loop with targeted guidance
- overall < 60%: `teach_more` — provide additional material before re-entering

### Spaced Repetition (SM-2)

| Review | Default Interval | On Success | On Failure |
|--------|-----------------|------------|------------|
| 1st | 1 day | x 2.5 | Reset to 1 day |
| 2nd | 3 days | x 2.5 | Reset to 1 day |
| 3rd | 7 days | x 2.5 | -50% interval |
| 4th+ | Previous x 2.5 | x ease factor | -50% interval |

## Frontend Architecture

### Layout

```
+---------------------------------------------------+
|  Header (topic title, PhaseIndicator)             |
+----------------------------+----------------------+
|                            |  ProgressSidebar     |
|   ChatArea                 |  - Phase & step      |
|   - Markdown messages      |  - Concept progress  |
|   - Inline Mermaid diagrams|  - Mastery score     |
|   - MasteryBadge popups    |  - KnowledgeGraph    |
|                            |  - MasteryChart      |
|                            |  - Reviews due       |
+----------------------------+----------------------+
|  MessageInput                            [Send]   |
+---------------------------------------------------+
```

### Components

- **ChatArea** — renders messages with react-markdown + remark-gfm, detects Mermaid code blocks and renders as SVG
- **ProgressSidebar** — collapsible panel, updates from masteryProgress in every API response
- **KnowledgeGraph** — React Flow interactive diagram, nodes colored by state (mastered/current/locked)
- **MasteryChart** — Recharts radar chart showing 4 scoring dimensions for current concept
- **PhaseIndicator** — badge with color coding: blue (Discovery), orange (Learning Loop), green (Validation)
- **MasteryBadge** — animated overlay triggered when concept score >= 85%
- **SessionSummary** — card rendered at end of Phase C with full mastery report
- **MermaidDiagram** — wrapper for Mermaid.js rendering inside chat messages

### Data Flow

1. User types message -> POST /api/universal-mastery-agent (SSE)
2. Tokens stream into ChatArea in real-time
3. Final response includes masteryProgress -> sidebar updates
4. Session recovery available via GET /api/sessions/:sessionId (not yet auto-triggered on page load)

## Out of Scope (v1)

- ~~Voice mode~~ *(implemented: TTS, STT, and Listening mode)*
- Collaborative learning
- File uploads / custom knowledge bases
- PDF export
- Educator dashboard
- Peer network / certification
- Credit system (can add later)

## Dependencies

### Backend
- express, cors, helmet
- @azure/ai-projects (Azure AI SDK)
- mssql (Azure SQL driver)
- zod (validation)
- @azure/identity (Azure AD auth)
- typescript, ts-node-dev

### Frontend
- react, react-dom
- @xyflow/react (React Flow)
- mermaid
- react-markdown, remark-gfm
- recharts
- tailwindcss (v4, via @tailwindcss/vite plugin)
- typescript, vite
