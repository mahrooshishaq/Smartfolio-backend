-- =============================================================
-- MODULE: Resume & AI Analysis
-- File:   docs/schema-resume.sql
-- Managed by: TypeORM (synchronize: true in development)
-- =============================================================

-- -----------------------------------------------------------
-- ENUMS
-- -----------------------------------------------------------

CREATE TYPE lens_type_enum AS ENUM (
    'targeted',   -- Lens A: Job-specific analysis (requires job description)
    'general'     -- Lens B: General resume quality analysis
);

CREATE TYPE confidence_level_enum AS ENUM (
    'High',
    'Medium',
    'Low'
);

-- -----------------------------------------------------------
-- TABLE: resumes
-- Entity: src/modules/resume/entities/resume.entity.ts
-- Description: Stores metadata for every uploaded resume file.
--              The actual file lives in uploads/ (not in DB).
--              Extracted text is cached here after Python service runs.
-- -----------------------------------------------------------

CREATE TABLE resumes (
    -- Primary key
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Ownership
    user_id                 UUID            NOT NULL
                            REFERENCES "user"(id) ON DELETE CASCADE,

    -- File metadata
    original_file_name      VARCHAR(255)    NOT NULL,
    file_path               VARCHAR(500)    NOT NULL,   -- Relative path: uploads/<uuid>-<filename>
    file_size_bytes         INTEGER         NOT NULL,

    -- Extracted content (populated by Python service POST /extract)
    extracted_text          TEXT,                       -- Full raw text from pdfplumber
    extraction_metadata     JSONB,
    /*
     * extraction_metadata structure:
     * {
     *   "pageCount": 2,
     *   "hasTables": true,
     *   "hasImages": false,
     *   "confidence": 0.95
     * }
     */

    -- State flag
    is_extracted            BOOLEAN         NOT NULL DEFAULT FALSE,

    -- Timestamp
    uploaded_at             TIMESTAMP       NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_resumes_user_id        ON resumes (user_id);
CREATE INDEX idx_resumes_is_extracted   ON resumes (user_id, is_extracted);

-- -----------------------------------------------------------
-- TABLE: resume_analyses
-- Entity: src/modules/resume/entities/resume-analysis.entity.ts
-- Description: AI-generated analysis result for one resume.
--              Each analysis is for a specific lens type.
--              A single resume can have multiple analyses over time.
-- -----------------------------------------------------------

CREATE TABLE resume_analyses (
    -- Primary key
    id                      UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Foreign keys
    resume_id               UUID                    NOT NULL
                            REFERENCES resumes(id) ON DELETE CASCADE,
    user_id                 UUID                    NOT NULL
                            REFERENCES "user"(id) ON DELETE CASCADE,

    -- Analysis configuration
    lens_type               lens_type_enum          NOT NULL,

    -- Lens A (targeted) fields — NULL when lens_type = 'general'
    job_description         TEXT,
    job_title               VARCHAR(200),
    company                 VARCHAR(200),

    -- Scores (0-100, 2 decimal places)
    overall_score           NUMERIC(5, 2)           NOT NULL,
    ats_score               NUMERIC(5, 2)           NOT NULL,   -- ATS keyword match
    content_quality_score   NUMERIC(5, 2)           NOT NULL,   -- Writing quality & clarity
    experience_score        NUMERIC(5, 2)           NOT NULL,   -- Impact of work history
    skills_score            NUMERIC(5, 2)           NOT NULL,   -- Skills section quality
    achievement_score       NUMERIC(5, 2)           NOT NULL,   -- Quantified achievements
    formatting_score        NUMERIC(5, 2)           NOT NULL,   -- Layout & structure
    relevance_score         NUMERIC(5, 2),                      -- Job-match relevance (Lens A only)

    -- Qualitative outcome
    interpretation_band     VARCHAR(100)            NOT NULL,   -- e.g. "Strong Match", "Needs Work"
    confidence_level        confidence_level_enum   NOT NULL DEFAULT 'High',

    -- Detailed feedback (JSONB)
    remarks                 JSONB                   NOT NULL,
    /*
     * remarks structure:
     * {
     *   "strengths":   ["Strong quantified achievements", "ATS-friendly keywords present"],
     *   "weaknesses":  ["Missing skills section", "No measurable impact in role 2"],
     *   "actionable":  ["Add 3 bullet points with metrics", "Include a skills section"]
     * }
     */

    -- Debug / audit
    raw_llm_response        TEXT,                   -- Full LLM JSON string before parsing
    processing_time_ms      INTEGER,                -- End-to-end latency for this analysis

    -- Timestamp
    created_at              TIMESTAMP               NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_resume_analyses_resume_id  ON resume_analyses (resume_id);
CREATE INDEX idx_resume_analyses_user_id    ON resume_analyses (user_id);
CREATE INDEX idx_resume_analyses_lens       ON resume_analyses (user_id, lens_type);
CREATE INDEX idx_resume_analyses_created    ON resume_analyses (user_id, created_at DESC);

-- -----------------------------------------------------------
-- VARIABLE REFERENCE — RESUME & AI MODULE
-- -----------------------------------------------------------
--
-- resumes:
--   user_id               → Owner; used to scope all resume queries
--   original_file_name    → Displayed in UI; original filename from upload
--   file_path             → Server disk path; fed to Python extraction service
--   file_size_bytes       → Validated at upload (max 5 MB = 5,242,880 bytes)
--   extracted_text        → Full PDF text; injected into Groq LLM prompt
--   extraction_metadata   → JSONB: pageCount, hasTables, hasImages, confidence
--   is_extracted          → Guards analysis endpoint (400 if FALSE)
--
-- resume_analyses:
--   resume_id             → Which resume was analysed
--   user_id               → Redundant FK for fast per-user queries without JOIN
--   lens_type             → 'targeted' (Lens A) or 'general' (Lens B)
--   job_description       → Full JD text; used in targeted scoring prompt
--   job_title             → Job title for context; shown in results UI
--   company               → Company name for context; shown in results UI
--   overall_score         → Weighted average of all subscores (0-100)
--   ats_score             → Keyword/format ATS compatibility (0-100)
--   content_quality_score → Writing clarity and resume content quality (0-100)
--   experience_score      → Depth and impact of work experience (0-100)
--   skills_score          → Skills section completeness and relevance (0-100)
--   achievement_score     → Quantified and measurable achievements (0-100)
--   formatting_score      → Layout, structure, visual readability (0-100)
--   relevance_score       → Job description match relevance — Lens A only (0-100)
--   interpretation_band   → Human-readable verdict: "Excellent" / "Good" / "Needs Work" / etc.
--   confidence_level      → LLM confidence: 'High' | 'Medium' | 'Low'
--   remarks               → JSONB: { strengths[], weaknesses[], actionable[] }
--   raw_llm_response      → Unprocessed Groq API response; kept for debugging
--   processing_time_ms    → Latency metric; useful for performance monitoring
--
-- -----------------------------------------------------------
-- AI MODULE VARIABLES (no database table — stateless service)
-- -----------------------------------------------------------
-- Defined in: src/modules/ai/groq.service.ts
--
-- GROQ_API_KEY          → .env  — Groq API key (starts with gsk_...)
-- MODEL                 → Hardcoded: 'llama-3.3-70b-versatile'
-- TEMPERATURE           → 0.1 (deterministic scoring output)
-- MAX_TOKENS            → 2048 (enough for full JSON analysis response)
-- System prompt         → Built by UserContextService.generateUserContext()
-- User prompt           → Built by ResumeAnalysisService with resume text + JD
--
-- ATS Checker (ats-checker.util.ts):
--   extractedText        → Resume plain text
--   jobDescription       → Job description (Lens A only)
--   Returns: { score, matchedKeywords[], missingKeywords[] }
--
-- Score Parser (score-parser.util.ts):
--   rawJson              → LLM JSON string
--   Returns typed AnalysisResult with all numeric scores parsed
