# SmartFolio — AI Career Agent Backend

> **NestJS + TypeORM + PostgreSQL + Groq (LLaMA 3.3)**  
> REST API powering the SmartFolio AI career platform.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Repository Structure](#repository-structure)
3. [Complete API Flow](#complete-api-flow)
4. [Environment Variables](#environment-variables)
5. [Running Locally](#running-locally)
6. [Pushing to GitHub (Step-by-Step)](#pushing-to-github-step-by-step)
7. [Setting Up the Python Service Repo](#setting-up-the-python-service-repo)
8. [Frontend Engineer — Clone & Run Guide](#frontend-engineer--clone--run-guide)
9. [Database Schema Files](#database-schema-files)
10. [About the uploads/ Folder](#about-the-uploads-folder)

---

## Project Overview

SmartFolio is an AI-powered career platform. This NestJS backend handles:

| Feature | Endpoint prefix | Description |
|---------|----------------|-------------|
| Authentication | `/auth` | Signup, OTP verify, login, refresh, logout, password reset, Google OAuth |
| Onboarding | `/onboarding` | Career profile setup, goal collection, context generation |
| Resume | `/resume` | Upload PDFs, trigger AI analysis (Lens A & B) |
| AI Analysis | (internal) | Groq LLaMA 3.3 70B integration for resume scoring |

A companion **Python FastAPI service** (`smartfolio-python`, port 8000) handles PDF text extraction using `pdfplumber`.

---

## Repository Structure

```
smartfolio-backend/
├── src/
│   ├── modules/
│   │   ├── auth/          # JWT auth, Google OAuth, OTP, password reset
│   │   ├── users/         # User entity + related entities (goals, profile, etc.)
│   │   ├── onboarding/    # Career profile setup + LLM context generation
│   │   ├── resume/        # Upload + AI analysis (Lens A & B)
│   │   ├── ai/            # Groq SDK wrapper service
│   │   ├── mail/          # Nodemailer email service
│   │   └── python-bridge/ # HTTP client calling Python extraction service
│   ├── common/
│   │   ├── dto/           # Request/response DTOs with Swagger decorators
│   │   └── enums/         # All TypeScript enums (UserGoalType, CareerStage, etc.)
│   ├── config/            # TypeORM database configuration
│   └── main.ts            # App bootstrap + Swagger setup
├── docs/
│   ├── schema-auth.sql        # users table schema + variable reference
│   ├── schema-onboarding.sql  # user_profiles, user_goals, etc.
│   └── schema-resume.sql      # resumes, resume_analyses + AI variables
├── uploads/               # User-uploaded PDFs (gitignored; auto-created at startup)
└── .env                   # Local environment variables (never commit)
```

---

## Complete API Flow

This is the intended user journey from signup to resume analysis.

```
Step 1  POST /auth/signup          → { message, userId }
        (Email OTP sent automatically)

Step 2  POST /auth/verify-otp      → { accessToken, refreshToken, user }
        (Tokens issued only after email is verified)

Step 3  GET  /auth/me              → { id, name, email, isEmailVerified }
        Authorization: Bearer <accessToken>

Step 4  POST /onboarding/complete  → { profile, goals, message }
        Authorization: Bearer <accessToken>
        (Fill career profile + select 1–5 goals)

Step 5  POST /resume/upload        → { resumeId, message }
        Authorization: Bearer <accessToken>
        Content-Type: multipart/form-data  field: file (PDF, max 5 MB)

Step 6  POST /resume/analyze       → { scores, remarks, interpretationBand, ... }
        Authorization: Bearer <accessToken>
        Body: { resumeId, lensType: "targeted"|"general", jobDescription?, jobTitle?, company? }
```

**Returning user flow:**
```
POST /auth/login  →  GET /auth/me  →  POST /resume/analyze (with existing resumeId)
```

**Token refresh:**
```
POST /auth/refresh   Body: { refreshToken }  →  { accessToken, refreshToken }
```

---

## Environment Variables

Create a `.env` file in the project root. **Never commit this file.**

```env
# Database (PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=yourpassword
DB_DATABASE=smartfolio

# JWT
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here

# Email (Nodemailer — use Gmail App Password)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your_email@gmail.com
MAIL_PASS=your_app_password

# Google OAuth (optional — for social login)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3001/auth/google/callback

# Groq AI
GROQ_API_KEY=gsk_your_groq_api_key

# Python extraction service
PYTHON_SERVICE_URL=http://localhost:8000
```

---

## Running Locally

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Python 3.10+ (for the companion service)

### Backend (NestJS)

```bash
# 1. Install dependencies
npm install

# 2. Create .env (see Environment Variables above)

# 3. Start in development mode (hot reload)
npm run start:dev

# API available at:   http://localhost:3001
# Swagger UI at:      http://localhost:3001/api
```

### Python Extraction Service

```bash
cd smartfolio-python

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Start the service
uvicorn main:app --reload --port 8000
```

---

## Pushing to GitHub (Step-by-Step)

> Follow these steps **in order** before the first push.

### Backend Repository (`smartfolio-backend`)

The remote is already configured at `https://github.com/asnaatif/smartfolio-backend.git`.

```bash
# Step 1 — Navigate to the backend folder
cd "c:\Users\mahro\OneDrive\Desktop\FYP1\smartfolio-backend"

# Step 2 — Check what will be committed (review the list)
git status

# Step 3 — Stage all changes
git add .

# Step 4 — Commit with a descriptive message
git commit -m "feat: complete AI resume analysis system with onboarding, Lens A/B scoring, Swagger docs"

# Step 5 — Push to GitHub
git push origin main
```

> ⚠️ If the push is rejected (non-fast-forward), pull first:
> ```bash
> git pull origin main --rebase
> git push origin main
> ```

---

## Setting Up the Python Service Repo

`smartfolio-python` currently has **no git repository**. Follow these steps to create one and push to GitHub.

### Step 1 — Create a new GitHub repository

1. Go to [https://github.com/new](https://github.com/new)
2. Name it `smartfolio-python`
3. Set visibility to **Private**
4. **Do NOT** tick "Add README" or ".gitignore" (you will add these manually)
5. Click **Create repository**
6. Copy the repository URL (e.g. `https://github.com/YOUR_USERNAME/smartfolio-python.git`)

### Step 2 — Initialize the repo locally

```bash
# Navigate to the Python service folder
cd "c:\Users\mahro\OneDrive\Desktop\FYP1\smartfolio-python"

# Initialize git
git init

# Create a .gitignore for Python
@"
__pycache__/
*.pyc
*.pyo
venv/
.venv/
*.egg-info/
.env
*.log
.DS_Store
"@ | Out-File -FilePath .gitignore -Encoding utf8

# Create a minimal README
@"
# SmartFolio — Python PDF Extraction Service

FastAPI service using pdfplumber to extract text from uploaded PDF resumes.

## Run locally
``bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
``

## Endpoint
POST /extract   Body: multipart/form-data  field: file (PDF)
"@ | Out-File -FilePath README.md -Encoding utf8

# Stage everything
git add .

# Initial commit
git commit -m "Initial commit: FastAPI PDF extraction service"

# Add the remote (replace with YOUR repo URL)
git remote add origin https://github.com/YOUR_USERNAME/smartfolio-python.git

# Set branch name and push
git branch -M main
git push -u origin main
```

---

## Frontend Engineer — Clone & Run Guide

### 1 — Clone both repositories

```bash
# Backend
git clone https://github.com/asnaatif/smartfolio-backend.git
cd smartfolio-backend
npm install

# Python service (replace with your repo URL)
git clone https://github.com/YOUR_USERNAME/smartfolio-python.git
cd smartfolio-python
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
```

### 2 — Configure environment variables

```bash
# In smartfolio-backend/
cp .env.example .env
# Fill in DB credentials, JWT secrets, Groq API key, etc.
```

### 3 — Start both services

```bash
# Terminal 1 — Python service (must start first)
cd smartfolio-python
uvicorn main:app --reload --port 8000

# Terminal 2 — NestJS backend
cd smartfolio-backend
npm run start:dev
```

### 4 — Verify

| Service | URL |
|---------|-----|
| NestJS API | http://localhost:3001 |
| Swagger UI | http://localhost:3001/api |
| Python service | http://localhost:8000/docs |

### 5 — API base URL for frontend

```
http://localhost:3001
```

All protected endpoints require:
```
Authorization: Bearer <accessToken>
```

Tokens are obtained from:
- `POST /auth/verify-otp` (first-time signup)
- `POST /auth/login` (returning user)
- `POST /auth/refresh` (token renewal)

---

## Database Schema Files

Detailed SQL schemas with variable references are in the `docs/` folder:

| File | Tables Covered |
|------|---------------|
| [docs/schema-auth.sql](docs/schema-auth.sql) | `user` |
| [docs/schema-onboarding.sql](docs/schema-onboarding.sql) | `user_profiles`, `user_goals`, `user_data_sources`, `user_personality_traits`, `user_context_snapshots` |
| [docs/schema-resume.sql](docs/schema-resume.sql) | `resumes`, `resume_analyses`, AI module variables |

> TypeORM runs `synchronize: true` in development — **tables are auto-created**. The SQL files are for documentation and reference only.

---

## About the uploads/ Folder

**Do NOT push real PDF files to git.**

- The `uploads/` folder contains user-uploaded resume PDFs.
- These are private files — they are excluded by `.gitignore` (`uploads/*.pdf`, `uploads/*.docx`).
- The folder itself is tracked via `uploads/.gitkeep` so the directory exists after a fresh clone.
- The NestJS service also creates this directory automatically on startup if it is missing.

When deploying to production, configure a cloud storage provider (e.g. AWS S3, Cloudflare R2) and update `ResumeUploadService` to store files there instead of disk.

