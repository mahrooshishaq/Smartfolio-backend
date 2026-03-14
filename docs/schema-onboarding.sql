-- =============================================================
-- MODULE: Onboarding
-- File:   docs/schema-onboarding.sql
-- Managed by: TypeORM (synchronize: true in development)
-- =============================================================

-- -----------------------------------------------------------
-- ENUMS
-- -----------------------------------------------------------
-- Defined in: src/common/enums/user-enums.ts

CREATE TYPE user_goal_type_enum AS ENUM (
    'university_search',
    'course_recommendation',
    'job_matching',
    'career_guidance',
    'skill_development',
    'resume_improvement',
    'interview_preparation',
    'networking',
    'salary_negotiation',
    'career_transition'
);

CREATE TYPE experience_level_enum AS ENUM (
    'student',
    'recent_graduate',
    'entry_level',   -- 0-2 years
    'mid_level',     -- 3-5 years
    'senior',        -- 6-10 years
    'lead',          -- 10+ years
    'executive'
);

CREATE TYPE education_level_enum AS ENUM (
    'high_school',
    'associate',
    'bachelors',
    'masters',
    'phd',
    'professional_cert',
    'bootcamp'
);

CREATE TYPE industry_type_enum AS ENUM (
    'technology',
    'finance',
    'healthcare',
    'education',
    'marketing',
    'engineering',
    'design',
    'sales',
    'consulting',
    'manufacturing',
    'retail',
    'hospitality',
    'legal',
    'media',
    'real_estate',
    'other'
);

CREATE TYPE career_stage_enum AS ENUM (
    'exploring',      -- Exploring options
    'transitioning',  -- Changing careers
    'advancing',      -- Moving up in current field
    'pivoting',       -- Shifting within industry
    'returning'       -- Returning to workforce
);

CREATE TYPE personality_trait_category_enum AS ENUM (
    'work_style',
    'communication',
    'problem_solving',
    'leadership',
    'learning',
    'motivation'
);

CREATE TYPE data_source_type_enum AS ENUM (
    'onboarding_quiz',
    'personality_quiz',
    'resume_analysis',
    'search_behavior',
    'user_input',
    'system_inference'
);

-- -----------------------------------------------------------
-- TABLE: user_profiles
-- Entity: src/modules/users/entities/user-profile.entity.ts
-- Description: Career profile built during onboarding.
--              One-to-one with user. Powers LLM context.
-- -----------------------------------------------------------

CREATE TABLE user_profiles (
    -- Primary key
    id                      UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Foreign key
    user_id                 UUID                    NOT NULL UNIQUE
                            REFERENCES "user"(id) ON DELETE CASCADE,

    -- Professional background
    experience_level        experience_level_enum,
    years_of_experience     INTEGER,
    education_level         education_level_enum,
    current_role            VARCHAR(200),
    target_role             VARCHAR(200),
    current_industry        industry_type_enum,
    target_industry         industry_type_enum,
    career_stage            career_stage_enum,

    -- Location preferences
    location                VARCHAR(100),
    target_location         VARCHAR(100),
    willing_to_relocate     BOOLEAN                 NOT NULL DEFAULT FALSE,
    open_to_remote          BOOLEAN                 NOT NULL DEFAULT FALSE,

    -- Skills & interests (free-form arrays)
    skills                  JSONB,                  -- e.g. ["JavaScript","React","Node.js"]
    interests               JSONB,                  -- e.g. ["open-source","AI/ML"]

    -- Bio
    bio                     TEXT,

    -- Completeness tracking (0–100)
    profile_completeness    INTEGER                 NOT NULL DEFAULT 0,

    -- Timestamps
    created_at              TIMESTAMP               NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP               NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_user_profiles_user_id         ON user_profiles (user_id);
CREATE INDEX idx_user_profiles_career_stage    ON user_profiles (career_stage);
CREATE INDEX idx_user_profiles_experience      ON user_profiles (experience_level);

-- -----------------------------------------------------------
-- TABLE: user_goals
-- Entity: src/modules/users/entities/user-goal.entity.ts
-- Description: One or more goals per user, ranked by priority.
--              Used to personalize LLM prompts.
-- -----------------------------------------------------------

CREATE TABLE user_goals (
    -- Primary key
    id          UUID                        PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Foreign key
    user_id     UUID                        NOT NULL
                REFERENCES "user"(id) ON DELETE CASCADE,

    -- Goal details
    goal_type   user_goal_type_enum         NOT NULL,
    priority    INTEGER                     NOT NULL DEFAULT 5,  -- 1 (highest) to 5 (lowest)
    is_active   BOOLEAN                     NOT NULL DEFAULT TRUE,
    source      data_source_type_enum       NOT NULL DEFAULT 'onboarding_quiz',

    -- Timestamps
    created_at  TIMESTAMP                   NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP                   NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_user_goals_user_id    ON user_goals (user_id);
CREATE INDEX idx_user_goals_priority   ON user_goals (user_id, priority);

-- -----------------------------------------------------------
-- TABLE: user_data_sources
-- Entity: src/modules/users/entities/user-data-source.entity.ts
-- Description: Tracks every information source that contributed
--              to the user's profile (data lineage / audit trail).
-- -----------------------------------------------------------

CREATE TABLE user_data_sources (
    -- Primary key
    id              UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Foreign key
    user_id         UUID                    NOT NULL
                    REFERENCES "user"(id) ON DELETE CASCADE,

    -- Source info
    source_type     data_source_type_enum   NOT NULL,
    source_name     VARCHAR(100)            NOT NULL,  -- e.g. "onboarding_v1", "resume_2024.pdf"
    raw_data        JSONB                   NOT NULL,  -- Raw extracted data from this source

    -- Processing status
    is_processed    BOOLEAN                 NOT NULL DEFAULT FALSE,
    confidence      INTEGER                 NOT NULL DEFAULT 100,  -- Data quality 0-100

    -- Timestamp
    created_at      TIMESTAMP               NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_user_data_sources_user_id      ON user_data_sources (user_id);
CREATE INDEX idx_user_data_sources_processed    ON user_data_sources (user_id, is_processed);

-- -----------------------------------------------------------
-- TABLE: user_personality_traits
-- Entity: src/modules/users/entities/user-personality.entity.ts
-- Description: Stores structured personality traits.
--              Can be populated from onboarding quiz or future
--              personality assessments.
-- -----------------------------------------------------------

CREATE TABLE user_personality_traits (
    -- Primary key
    id              UUID                            PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Foreign key
    user_id         UUID                            NOT NULL
                    REFERENCES "user"(id) ON DELETE CASCADE,

    -- Trait
    category        personality_trait_category_enum NOT NULL,
    trait_key       VARCHAR(100)                    NOT NULL,  -- e.g. "prefers_collaborative_work"
    trait_value     VARCHAR(255)                    NOT NULL,  -- e.g. "high", "true", "introvert"
    score           INTEGER,                                   -- Optional 0-100 numeric score

    -- Source
    source          VARCHAR(50)                     NOT NULL,  -- e.g. "onboarding_quiz", "personality_test_v1"

    -- Timestamp
    created_at      TIMESTAMP                       NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_user_personality_user_id   ON user_personality_traits (user_id);
CREATE INDEX idx_user_personality_category  ON user_personality_traits (user_id, category);

-- -----------------------------------------------------------
-- TABLE: user_context_snapshots
-- Entity: src/modules/users/entities/user-context-snapshot.entity.ts
-- Description: Pre-computed LLM context snapshots.
--              Aggregates profile + goals + personality into
--              a structured JSON ready for prompt injection.
--              Regenerated whenever user data changes.
-- -----------------------------------------------------------

CREATE TABLE user_context_snapshots (
    -- Primary key
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Foreign key
    user_id             UUID        NOT NULL
                        REFERENCES "user"(id) ON DELETE CASCADE,

    -- Context type
    context_type        VARCHAR(50) NOT NULL,  -- "career_guidance", "resume_analysis", "job_matching"

    -- Pre-computed context
    structured_context  JSONB       NOT NULL,
    /*
     * Example structure:
     * {
     *   "primary_goals": ["job_matching", "resume_improvement"],
     *   "professional_context": {
     *     "experience_level": "mid_level",
     *     "years": 4,
     *     "current_role": "Software Engineer",
     *     "target_role": "Senior Engineer",
     *     "industry": "technology"
     *   },
     *   "personality_insights": {
     *     "work_style": "collaborative",
     *     "learning_preference": "hands_on"
     *   },
     *   "skills": ["JavaScript", "React", "Node.js"],
     *   "location": "New York, NY",
     *   "preferences": {
     *     "remote": true,
     *     "willing_to_relocate": false
     *   }
     * }
     */

    llm_ready_prompt    TEXT        NOT NULL,   -- Pre-formatted natural language context for LLM
    version             INTEGER     NOT NULL DEFAULT 1,  -- Increments on each regeneration

    -- Timestamp
    created_at          TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_context_snapshots_user_id  ON user_context_snapshots (user_id);
CREATE INDEX idx_context_snapshots_type     ON user_context_snapshots (user_id, context_type);

-- -----------------------------------------------------------
-- VARIABLE REFERENCE — ONBOARDING MODULE
-- -----------------------------------------------------------
--
-- user_profiles:
--   user_id               → FK to user; one profile per user
--   experience_level      → Enum; populates LLM prompt ("mid_level" → "mid level")
--   years_of_experience   → Integer; used in LLM context generation
--   education_level       → Enum; shown in LLM context
--   current_role          → Free text; used in resume scoring relevance (Lens A)
--   target_role           → Free text; used in resume scoring relevance (Lens A)
--   current_industry      → Enum; used in LLM context
--   target_industry       → Enum; used in LLM context
--   career_stage          → Enum; used to calibrate LLM tone (entry vs senior)
--   location / target_location → Used in job matching context
--   willing_to_relocate   → Preference flag for job matching
--   open_to_remote        → Preference flag for job matching
--   skills                → JSONB array; injected into resume scoring prompt
--   interests             → JSONB array; used in LLM context
--   bio                   → Free text; appended to LLM context if present
--   profile_completeness  → Computed 0-100; shown in GET /onboarding/status
--
-- user_goals:
--   goal_type             → Enum; determines which LLM features to activate
--   priority              → Int 1-5; first goal is primary, drives LLM focus
--   is_active             → Allows deactivating goals without deletion
--   source                → Tracks how the goal was captured
--
-- user_data_sources:
--   source_type           → Enum; classifies origin of data
--   source_name           → String identifier; useful for debugging/auditing
--   raw_data              → JSONB blob of original unprocessed input
--   is_processed          → Flag; marks when raw_data has been distributed
--   confidence            → Quality score; lower = less reliable data
--
-- user_personality_traits:
--   category              → Enum groups traits (work_style, leadership, etc.)
--   trait_key             → Snake_case string key  e.g. "prefers_deep_work"
--   trait_value           → String value e.g. "high", "true", "introvert"
--   score                 → Optional 0-100 numeric; NULL if not applicable
--   source                → Which quiz/tool produced this trait
--
-- user_context_snapshots:
--   context_type          → Which LLM use-case this snapshot is for
--   structured_context    → JSONB pre-aggregated from profile + goals + traits
--   llm_ready_prompt      → Text ready to be injected into Groq/GPT system prompt
--   version               → Increments each time snapshot is regenerated
