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
