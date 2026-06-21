# Smartfolio Backend API

The Smartfolio Backend API is the core engine of the Smartfolio platform, built with **NestJS**, **TypeORM**, and **PostgreSQL (Neon)**. It powers all user authentication, profile management, LLM interactions, and integrates directly with a dedicated Python service for advanced web scraping and resume parsing.

## 🚀 Live Deployment
- **Backend API**: [https://mahrooshishaq-smartfolio-backend.hf.space](https://mahrooshishaq-smartfolio-backend.hf.space)
- **Swagger Documentation**: [https://mahrooshishaq-smartfolio-backend.hf.space/api](https://mahrooshishaq-smartfolio-backend.hf.space/api)

## 🏗 Architecture & Modules

The backend is composed of several highly cohesive, decoupled NestJS modules:

1. **AuthModule**: Handles JWT authentication, Google OAuth, and OTP-based email verification.
2. **UsersModule**: Manages the user database, including passwords, tokens, and roles.
3. **ProfileModule**: Stores user goals, experience, education, and career transition details.
4. **ResumeModule**: Interfaces with the Python Bridge to upload and analyze resumes using AI.
5. **MockInterviewModule**: Generates dynamic technical interview questions using the Groq LLM API and evaluates user voice/text responses.
6. **DocumentGenerationModule**: Generates customized cover letters, cold emails, and resignation letters based on the user's profile and target job descriptions.
7. **JobsModule & CoursesModule**: Caches and retrieves job and course recommendations fetched by the background Python scrapers.
8. **PythonBridgeModule**: A dedicated service layer that securely communicates with the isolated Python FastAPI service.
9. **MailModule**: Integrates with **Brevo (Sendinblue)** SMTP for delivering OTPs and password reset links.

### Database & ORM
We use **TypeORM** for object-relational mapping, connected to a serverless **Neon PostgreSQL** database. The schema is automatically synchronized in production for seamless deployment.

---

## 🛠 Features in Action

### Dashboard
The central hub for users to view their active job applications, course recommendations, and upcoming mock interviews.
![Dashboard](../../smartfolio-frontend/screenshots%20for%20readme/Dashboard.png)

### AI Resume Analysis
Upload a PDF resume and receive instant, AI-generated feedback on formatting, keyword optimization, and overall impact.
![Resume Analysis](../../smartfolio-frontend/screenshots%20for%20readme/ResumeAnalysis.png)
![Resume Analyzed](../../smartfolio-frontend/screenshots%20for%20readme/ResumeAnalysed.png)

### Mock Interviews
Practice technical and behavioral interviews with real-time AI evaluation.
![Mock Interviews](../../smartfolio-frontend/screenshots%20for%20readme/Mock%20Interviews.png)

### Document Generation
Generate tailored professional documents like Cover Letters and Cold Emails using the Llama3 LLM.
![Document Generation](../../smartfolio-frontend/screenshots%20for%20readme/Document%20Generation.png)
![Generated Document](../../smartfolio-frontend/screenshots%20for%20readme/AI%20Document%20Generated.png)

---

## ⚙️ Environment Variables Setup

To run this backend locally or deploy it to the cloud, you need an `.env` file at the root of this repository:

```env
NODE_ENV=production
PORT=7860
FRONTEND_URL=https://smartfolio-frontend-five.vercel.app

# Database (Neon PostgreSQL)
DB_HOST=your-neon-host
DB_PORT=5432
DB_USERNAME=your-username
DB_PASSWORD=your-password
DB_NAME=your-database

# Security & JWT
JWT_SECRET=your-secret
JWT_REFRESH_SECRET=your-refresh-secret
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d

# Email (Brevo SMTP via Port 2525)
MAIL_MOCK_MODE=false
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=2525
SMTP_USER=your-brevo-login
SMTP_PASS=your-brevo-smtp-key
SMTP_FROM=your-verified-email@gmail.com

# Groq LLM Integrations
GROQ_API_KEY=your-groq-key
MODEL_DOC_GEN=llama-3.3-70b-versatile
MODEL_MOCK_INTERVIEW=llama-3.3-70b-versatile
MODEL_QUERIES=llama-3.3-70b-versatile

# Python Bridge
PYTHON_SERVICE_URL=https://mahrooshishaq-smartfolio-python.hf.space
```

---

## 📦 Deployment (Hugging Face Docker)

This application is containerized and deployed natively on **Hugging Face Spaces** using the Docker SDK.

1. Create a new Space on Hugging Face and select the **Docker** template.
2. Link your GitHub repository or push directly to the Space's Git remote.
3. Hugging Face will automatically detect the `Dockerfile` at the root of the repository.
4. Go to **Settings -> Variables and secrets** in your Hugging Face space and add all the environment variables listed above.
5. The container exposes port `7860` (the Hugging Face default), and the application will start automatically.

### Running Locally
```bash
# Install dependencies
npm install

# Start in development mode
npm run start:dev

# Build for production
npm run build
npm run start:prod
```
