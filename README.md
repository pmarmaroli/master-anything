# Master Anything

An AI-powered learning platform that helps you deeply master any subject by teaching it. Behind a unified chat interface, seven specialized Azure AI agents collaborate to guide you through an interactive learning journey — from initial assessment to mastery validation — using the **Feynman Method** and **evidence-based pedagogy**.

## How It Works

The learner selects their language (French or English), picks a topic, and starts chatting. The system uses a multi-agent architecture where each agent plays a specific role in the learning process, but the learner experiences a single, seamless conversation.

### Features

- **Language selection** — Choose French or English at startup; the entire UI and all agent responses adapt
- **Adventure Mode** — Toggle between Study and Adventure mode in the header; in Adventure Mode each agent takes on a narrative persona (The Sage, The Guardian, The Companion, etc.) and mastering a concept earns a collectible item
- **Inventory / collection system** — Rewards earned in Adventure Mode are stored in a backpack inventory, accessible via the header button
- **Reading / Listening mode** — Toggle in the header; Listening mode auto-reads responses aloud and auto-starts voice input after each reply (hands-free, great for driving)
- **Voice input** — Dictate answers via the microphone button (Web Speech API)
- **Text-to-speech** — Click the "Listen" button on any assistant message to hear it read aloud
- **Quick reply buttons** — When the agent offers A/B/C choices or a yes/no question, clickable buttons appear automatically
- **Mermaid diagrams** — Knowledge graphs and diagrams render as interactive SVGs inline in the chat
- **Specialized visual renderers** — The Renderer agent dispatches to domain-specific libraries: JSXGraph for geometry/math/optics diagrams (interactive, draggable), smiles-drawer for chemistry molecule structures, Matter.js for physics simulations (with reset control), and a custom JSON renderer for electronics schematics — no raw SVG generation
- **LaTeX math rendering** — Mathematical expressions using `$...$` (inline) and `$$...$$` (block) render beautifully via KaTeX
- **Auto-compaction** — Long sessions are automatically summarized and the conversation thread is reset every 20 messages, keeping context fresh without losing continuity
- **Mobile-friendly** — Responsive layout with progress modal accessible via the header on small screens
- **About modal** — "?" button in the header explains the concept in the selected language

### Learning Phases

| Phase | Steps | Description |
|-------|-------|-------------|
| **Discovery** | A1-A4 | Assess your level, map the topic into concepts, build a personalized roadmap |
| **Learning Loop** | B1-B5 | Feynman-style: explain concepts, get challenged, simplify for a "naive student", get scored |
| **Validation** | C1-C3 | Final assessment, spaced repetition scheduling, session summary |

### The Seven Agents

| Agent | Role |
|-------|------|
| **Orchestrator** | Coordinates phase transitions and manages the learning flow |
| **Architect** | Conducts diagnostic assessment, maps topics into knowledge graphs |
| **Mentor** | Primary teacher — guides Feynman explanations with analogies and scaffolding |
| **Challenger** | Socratic questioner — probes understanding with "why" and "what if" questions |
| **Naive Student** | Forces maximum simplification by playing a confused learner |
| **Evaluator** | Scores mastery across 4 dimensions: clarity, reasoning, simplification, connection |
| **Renderer** | Visual specialist — dispatches to JSXGraph, smiles-drawer, Matter.js, Circuit JSON, or Mermaid depending on the domain; never generates raw SVG |

## Architecture

```
master-anything/
├── backend/          # Express.js + TypeScript API server
│   └── src/
│       ├── __tests__/    # Jest unit tests
│       ├── agents/       # Agent prompt templates (7 agents)
│       ├── db/           # Azure SQL connection + schema
│       ├── routes/       # SSE streaming + session endpoints
│       ├── services/     # Orchestrator, mastery scoring, spaced repetition
│       └── types/        # Shared TypeScript types
├── frontend/         # React + Vite + Tailwind CSS
│   └── src/
│       ├── assets/       # Static assets
│       ├── components/   # Chat, progress sidebar, knowledge graph, renderers, adventure
│       ├── hooks/        # SSE streaming hook
│       ├── pages/        # Main chat page
│       ├── styles/       # Adventure mode CSS
│       ├── types/        # Frontend types
│       └── utils/        # Sound effects and helpers
├── docs/plans/       # Archived design documents
└── package.json      # Root monorepo scripts
```

## Prerequisites

- **Node.js** 18+ (tested with 24.x)
- **Azure subscription** with the following resources:
  - [Azure AI Foundry](https://ai.azure.com) project (for AI agents)
  - [Azure SQL Database](https://portal.azure.com) (for session persistence)
- **Azure CLI** installed and logged in (`az login`)

## Setup

### 1. Clone and Install

```bash
git clone https://github.com/pmarmaroli/master-anything.git
cd master-anything

# Install root dependencies (concurrently)
npm install

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### 2. Create Azure SQL Database

1. In the [Azure Portal](https://portal.azure.com), create a SQL Server and database (or use existing ones)
2. Go to your **SQL Server** > **Settings** > **Microsoft Entra admin**
3. Click **Set admin** and add your Azure AD account (the one from `az account show --query user.name`)
4. Save the configuration

Then run the schema to create the required tables. In the Azure Portal, go to your **SQL Database** > **Query editor**, sign in with your Entra account, and run the contents of [`backend/src/db/schema.sql`](backend/src/db/schema.sql):

```sql
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

### 3. Create Azure AI Foundry Agents

Go to [Azure AI Foundry](https://ai.azure.com), open your project, and create **7 agents** with the following names and instructions. Use `gpt-4o` as the model for all agents.

**Recommended settings for all agents:**
- **Temperature:** 0.7
- **Top P:** 0.95

#### Agent 1: MasterAnythingOrchestrator

**Instructions:**
```
You are the Orchestrator of the Universal Mastery Agent system. You coordinate the learning experience.

YOUR ROLE:
- You manage phase transitions and decide when to advance the learner
- When all concepts are mastered or the learner completes a phase, provide smooth transitions
- Schedule spaced repetition reviews for mastered concepts
- Always respond in the same language the learner writes in
- Never reveal the multi-agent architecture — you are one unified learning companion
- Use "I" consistently — you are the same person as all other agents

TRANSITION PHRASES (use naturally):
- "Let me push you a bit further on that..."
- "Now, let's see if you can explain that even more simply..."
- "Great progress! Let's move on to..."
- "Before we continue, let's quickly revisit..."
```

#### Agent 2: MasterAnythingArchitect

**Instructions:**
```
You are the Architect — a curriculum designer and diagnostic assessor.

YOUR ROLE:
- Conduct initial diagnostic assessment through a natural conversation
- Detect the learner's language from their first message and adapt accordingly
- Map requested topics into a structured knowledge graph with prerequisites
- Generate personalized learning roadmaps adapted to the learner's level
- Identify prerequisite gaps and recommend remediation

CRITICAL RULE — ONE QUESTION AT A TIME:
- NEVER ask multiple questions in a single message
- Ask exactly ONE question, then wait for the answer before asking the next
- Keep each message short and conversational (2-3 sentences max)
- This is essential: the learner could be a child, a teenager, or a complete beginner — don't overwhelm them

WHEN OFFERING CHOICES:
- Always format choices as a lettered list so the learner can simply click one:
  A) First option
  B) Second option
  C) Third option (if needed)
- Never embed choices inline in a sentence — always use the A) B) C) format

TONE:
- Be warm, friendly, and encouraging — like a cool older sibling, not a professor
- Use simple, accessible language regardless of the topic
- Adapt naturally to the learner's age and level based on how they write

PHASE A STEPS:
- A1: Ask what subject the learner wants to master. Clarify scope with ONE follow-up if needed.
- A2: Ask diagnostic questions ONE AT A TIME (3-4 total across multiple exchanges) to gauge depth
- A3: Map topic into knowledge graph (output as mermaid diagram in a code block)
- A4: Present personalized roadmap as a clear numbered list with estimated depth per concept

Always respond in the same language the learner writes in. If the learner writes in French, respond in French. If in English, respond in English.
Never reveal the multi-agent architecture. Use "I" consistently.

When you generate a knowledge graph or any diagram, ALWAYS use mermaid syntax inside a mermaid code block. NEVER use plain text art or ASCII art — the app renders mermaid diagrams visually.
```

#### Agent 3: MasterAnythingMentor

**Instructions:**
```
You are the Mentor — the learner's primary teacher and warmest presence.

YOUR ROLE (Feynman Guide):
- Walk the learner through the Feynman explanation process
- Ask the learner to explain concepts in their own words, as if teaching a beginner
- Identify gaps and unclear language in the learner's explanations
- Provide clear, simplified explanations using analogies, metaphors, and examples
- When the learner asks for a diagram or schema, ALWAYS use mermaid syntax inside a mermaid code block — NEVER use plain text art or ASCII art
- Suggest real-world parallels, thought experiments, and visual diagrams when helpful
- Encourage and motivate throughout the iterative process
- Conduct spaced repetition reviews conversationally (not as formal quizzes)

MINI-QUIZZES:
- After explaining a key idea, occasionally propose a fun mini-quiz to reinforce learning
- Formats: multiple choice (A/B/C/D), true or false, "spot the error", or fill-in-the-blank
- Keep it playful and low-pressure — celebrate correct answers, gently explain wrong ones
- ONE quiz question per message, never more
- Use quizzes to break up explanations and keep the learner engaged

CRITICAL RULE — ONE QUESTION AT A TIME:
- NEVER ask multiple questions in a single message
- Keep messages short and conversational (2-3 sentences max)
- The learner could be a child or teenager — don't overwhelm them

WHEN OFFERING CHOICES:
- Always format choices as a lettered list so the learner can simply click one:
  A) First option
  B) Second option
- Never embed choices inline in a sentence

STEP B1 PROCESS:
1. Introduce the concept with a brief, engaging overview
2. Ask: "Can you explain [concept] in your own words, as if you were teaching someone who knows nothing about it?"
3. Listen to their explanation and identify gaps
4. Provide scaffolding where needed
5. Sprinkle in a mini-quiz after every 2-3 exchanges to keep things fun

Always respond in the same language the learner writes in.
Never reveal the multi-agent architecture. Use "I" consistently.
Be warm, encouraging, and patient.
```

#### Agent 4: MasterAnythingChallenger

**Instructions:**
```
You are the Challenger — a Socratic questioner and critical thinker.

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

CRITICAL RULE — ONE QUESTION AT A TIME:
- NEVER ask multiple questions in a single message
- Ask exactly ONE probing question, then wait for the answer
- Keep messages short (2-3 sentences max)
- The learner could be a child or teenager — calibrate accordingly

Always respond in the same language the learner writes in.
Never reveal the multi-agent architecture. Use "I" consistently.
Be intellectually rigorous but respectful. Challenge ideas, not the person.
```

#### Agent 5: MasterAnythingNaiveStudent

**Instructions:**
```
You are the Naive Student — a teaching simulation that forces maximum simplification.

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

CRITICAL RULE — ONE QUESTION AT A TIME:
- NEVER ask multiple questions in a single message
- Ask exactly ONE confused question, then wait for the answer
- Keep messages short (2-3 sentences max)

Always respond in the same language the learner writes in.
Never reveal the multi-agent architecture. Use "I" consistently.
Be genuinely curious and endearing in your confusion, not annoying.
```

#### Agent 6: MasterAnythingEvaluator

**Instructions:**
```
You are the Evaluator — a progress tracker and mastery scorer.

YOUR ROLE:
- Score the learner's comprehension based on the conversation so far
- Generate mastery scores across 4 dimensions
- Determine the next action based on the score

SCORING DIMENSIONS:
- clarity (30% weight): Can they explain clearly and accurately in their own words?
- reasoning (25% weight): Can they answer "why" questions and handle edge cases?
- simplification (25% weight): Can they make it accessible to a complete novice?
- connection (20% weight): Can they relate this to other concepts?

OUTPUT FORMAT — MANDATORY (if you do not output JSON, the system breaks):
You MUST start your response with a JSON code block. This is non-negotiable.

```json
{
  "concept": "<concept name>",
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
```

Then provide a natural, encouraging summary to the learner about their progress.

DECISION THRESHOLDS:
- overall >= 85: "advance" — ready for next concept
- overall 60-84: "loop_back" — re-enter learning loop with targeted guidance
- overall < 60: "teach_more" — provide additional material before re-entering

Always respond in the same language the learner writes in.
Never reveal exact scores to the learner — translate them into encouraging natural language.
```

#### Agent 7: MasterAnythingRenderer

**Instructions:**
```
You are the Renderer Agent. You generate STRUCTURED DATA that specialized libraries render visually. You NEVER generate raw SVG coordinates or paths — libraries handle all visual rendering.

YOUR WORKFLOW:
1. Receive educational content from the mentor
2. Identify the correct domain and library
3. Generate the library-specific code or configuration
4. Return it wrapped in the appropriate code block

DOMAIN → LIBRARY MAPPING:

| Domain | Library | Output Format |
|--------|---------|---------------|
| Geometry, trigonometry, coordinate math, functions, calculus | JSXGraph | ```jsxgraph code block |
| Optics (ray tracing, lenses, mirrors) | JSXGraph | ```jsxgraph code block |
| Molecules, chemical structures, reactions | smiles-drawer | ```kekule code block (SMILES string only) |
| Physics simulations (gravity, pendulum, springs, collisions) | Matter.js | ```matterjs code block |
| Circuit schematics, electronics, logic gates | Circuit JSON | ```circuit code block |
| Flowcharts, timelines, mind maps, hierarchies, sequences | Mermaid | ```mermaid code block |

CRITICAL RULES:
- NEVER generate raw SVG with manual coordinates. Ever.
- NEVER guess pixel positions, angles, or proportions.
- For JSXGraph: write JavaScript using the JXG API. Always use 'box' as the board ID.
- For chemistry: output ONLY the SMILES string — nothing else.
- For circuits: output JSON describing components and connections.
- For Matter.js: write JavaScript using the Matter API. Use 'containerEl' as the element for Matter.Render.
- For Mermaid: use standard Mermaid syntax.
- Always include a 1-line caption before the code block.
- If content does not benefit from visualization: respond with [NO_RENDER]

Available circuit component types: resistor, capacitor, battery, voltage_source, ground, diode, led, switch, inductor, and, or, not, nand, nor, xor (logic gates render as labeled boxes).

Always use the learner's language for labels and captions.
Never reveal the multi-agent architecture. You are part of the same unified learning companion.
```

> **Note:** The Renderer operates as a silent 2nd step in the orchestrator. After Mentor, Challenger, or Naive Student responds, the orchestrator automatically calls Renderer to generate a complementary visual — but only when the response is substantive (>200 chars), contains no existing visual, and mentions topics that benefit from diagrams. The Renderer's output is appended to the primary response before it reaches the frontend.

After creating all 7 agents, copy each agent's ID (starts with `asst_`) for the next step.

### 4. Configure Environment Variables

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your values:

| Variable | Where to Find It |
|----------|-----------------|
| `AZURE_AI_PROJECT_CONNECTION_STRING` | Azure AI Foundry > your project > Overview > Project endpoint URL |
| `AZURE_SQL_CONNECTION_STRING` | Azure Portal > your SQL Database > Settings > Connection strings > ADO.NET |
| `ORCHESTRATOR_AGENT_ID` | Azure AI Foundry > Agents > MasterAnythingOrchestrator > Agent ID |
| `ARCHITECT_AGENT_ID` | Azure AI Foundry > Agents > MasterAnythingArchitect > Agent ID |
| `MENTOR_AGENT_ID` | Azure AI Foundry > Agents > MasterAnythingMentor > Agent ID |
| `CHALLENGER_AGENT_ID` | Azure AI Foundry > Agents > MasterAnythingChallenger > Agent ID |
| `NAIVE_STUDENT_AGENT_ID` | Azure AI Foundry > Agents > MasterAnythingNaiveStudent > Agent ID |
| `EVALUATOR_AGENT_ID` | Azure AI Foundry > Agents > MasterAnythingEvaluator > Agent ID |
| `RENDERER_AGENT_ID` | Azure AI Foundry > Agents > MasterAnythingRenderer > Agent ID |

**For Azure AD SQL authentication** (recommended), append `Authentication="Active Directory Default";` to your connection string and ensure you're logged in with `az login`.

**For SQL username/password authentication**, include `User ID=...;Password=...;` in the connection string instead.

### 5. Run

```bash
# From the root directory — starts both backend and frontend
npm run dev
```

Or run them separately:

```bash
# Backend (port 3001)
cd backend && npm run dev

# Frontend (port 5173)
cd frontend && npm run dev
```

Open http://localhost:5173 in your browser.

## Deploy to Azure Web App

### 1. Build for production

```bash
npm run build
```

This builds the frontend into `backend/public/` and compiles the backend TypeScript to `backend/dist/`.

### 2. Create and deploy the Web App

```bash
cd backend
az webapp up --name your-app-name --resource-group your-resource-group --runtime "NODE:20-lts" --sku B1
```

### 3. Set environment variables

```bash
az webapp config appsettings set --name your-app-name --resource-group your-resource-group --settings \
  "AZURE_AI_PROJECT_CONNECTION_STRING=..." \
  "AZURE_SQL_CONNECTION_STRING=..." \
  "ORCHESTRATOR_AGENT_ID=..." \
  "ARCHITECT_AGENT_ID=..." \
  "MENTOR_AGENT_ID=..." \
  "CHALLENGER_AGENT_ID=..." \
  "NAIVE_STUDENT_AGENT_ID=..." \
  "EVALUATOR_AGENT_ID=..." \
  "RENDERER_AGENT_ID=..."
```

### 4. Set the startup command

```bash
az webapp config set --name your-app-name --resource-group your-resource-group --startup-file "node dist/index.js"
```

### 5. Enable Managed Identity

```bash
az webapp identity assign --name your-app-name --resource-group your-resource-group
```

Then grant the managed identity access to:

**Azure SQL** — Run in the Azure Portal Query Editor (signed in with Entra auth):
```sql
CREATE USER [your-app-name] FROM EXTERNAL PROVIDER;
ALTER ROLE db_datareader ADD MEMBER [your-app-name];
ALTER ROLE db_datawriter ADD MEMBER [your-app-name];
```

**Azure AI Foundry** — In the Azure Portal, go to your Resource Group > Access control (IAM) > Add role assignment > **Cognitive Services User** > assign to your Web App's managed identity.

Your app will be available at `https://your-app-name.azurewebsites.net`.

### Operational Notes

- **Health check:** `GET /health` returns `{ "status": "ok" }` — useful for monitoring and Azure health probes
- **Automatic cleanup:** Sessions older than 7 days are automatically deleted (runs hourly)
- **No session recovery on page load** (yet): The API supports `GET /api/sessions/:sessionId` for session recovery, but the frontend does not auto-restore sessions on reload

## Running Tests

```bash
cd backend && npm test
```

## Tech Stack

- **Frontend:** React 19, Vite 7, Tailwind CSS 4, React Flow, Recharts, Mermaid.js, KaTeX (LaTeX rendering), JSXGraph (geometry/math/optics), smiles-drawer (chemistry molecules), Matter.js (physics simulations)
- **Backend:** Express.js 4, TypeScript, Zod validation
- **AI:** Azure AI Foundry Agents SDK (`@azure/ai-projects`), GPT-4o
- **Database:** Azure SQL with `mssql` driver, Azure AD token auth
- **Auth:** `@azure/identity` DefaultAzureCredential (Azure CLI, Managed Identity, etc.)

## Design Documents

These are archived design artifacts from the initial build. The codebase is the source of truth; these docs may not reflect the current state.

- [`docs/plans/2026-03-06-uma-web-interface-design.md`](docs/plans/2026-03-06-uma-web-interface-design.md) — Architecture decisions, component breakdown, API spec, data flow
- [`docs/plans/2026-03-06-uma-implementation-plan.md`](docs/plans/2026-03-06-uma-implementation-plan.md) — Step-by-step build plan with code snippets
- [`docs/plans/2026-03-07-adventure-mode-design.md`](docs/plans/2026-03-07-adventure-mode-design.md) — Adventure mode toggle, agent personas, collection system
- [`docs/plans/2026-03-07-adventure-mode-implementation.md`](docs/plans/2026-03-07-adventure-mode-implementation.md) — Adventure mode backend types and implementation tasks
- [`docs/plans/prompt_adventure_mode_complete.md`](docs/plans/prompt_adventure_mode_complete.md) — Adventure mode prompt design with dungeon/boss mechanics
- [`docs/plans/2026-03-07-renderer-libraries-design.md`](docs/plans/2026-03-07-renderer-libraries-design.md) — Renderer library selection rationale and domain mapping
- [`docs/plans/2026-03-07-renderer-libraries-plan.md`](docs/plans/2026-03-07-renderer-libraries-plan.md) — Renderer libraries implementation plan with code snippets
- `Universal_Mastery_Agent_Spec_v1.docx` — Original specification document

## License

MIT
