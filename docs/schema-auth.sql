-- =============================================================
-- MODULE: Auth / Users
-- File:   docs/schema-auth.sql
-- Managed by: TypeORM (synchronize: true in development)
-- =============================================================

-- -----------------------------------------------------------
-- ENUMS
-- -----------------------------------------------------------

-- No dedicated enums in auth module
-- (Enums live in the onboarding module and are referenced here via FK)

-- -----------------------------------------------------------
-- TABLE: user
-- Entity: src/modules/users/user.entity.ts
-- Description: Core identity record for every registered user.
-- -----------------------------------------------------------

CREATE TABLE "user" (
    -- Primary key
    id                     UUID            PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identity
    email                  VARCHAR         NOT NULL UNIQUE,
    password               VARCHAR,                         -- NULL for Google OAuth users
    google_id              VARCHAR         UNIQUE,          -- NULL for email/password users
    name                   VARCHAR         NOT NULL,

    -- Email verification
    is_verified            BOOLEAN         NOT NULL DEFAULT FALSE,
    otp_hash               VARCHAR,                         -- bcrypt hash of the 6-digit OTP
    otp_expiry             TIMESTAMPTZ,

    -- Session / refresh tokens
    refresh_token_hash     TEXT,                            -- bcrypt hash of refresh JWT
    refresh_token_issued_at TIMESTAMP,
    is_loggedin            BOOLEAN         NOT NULL DEFAULT FALSE,

    -- Password reset
    reset_token_hash       TEXT,
    reset_token_expiry     TIMESTAMP
);

-- Indexes
CREATE INDEX idx_user_email    ON "user" (email);
CREATE INDEX idx_user_google   ON "user" (google_id);

-- -----------------------------------------------------------
-- VARIABLE REFERENCE
-- -----------------------------------------------------------
-- id                      → UUID, primary key, used in all FK relations
-- email                   → Used for login, OTP sending, uniqueness check
-- password                → Bcrypt hashed; NULL when registered via Google
-- google_id               → OAuth2 Google sub claim; NULL for email users
-- name                    → Display name shown in UI and auth/me response
-- is_verified             → Must be TRUE before JWT tokens are issued
-- otp_hash                → Hashed 6-digit code; checked at POST /auth/verify-otp
-- otp_expiry              → 10-minute TTL; checked at verify-otp endpoint
-- refresh_token_hash      → Stored so refresh tokens can be invalidated on logout
-- refresh_token_issued_at → Used to detect refresh token reuse attacks
-- is_loggedin             → Set to FALSE on POST /auth/logout
-- reset_token_hash        → Hashed token sent via email for password reset
-- reset_token_expiry      → 1-hour TTL for password reset links
