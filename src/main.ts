import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  
  app.useGlobalPipes(new ValidationPipe({ 
    whitelist: true, 
    forbidNonWhitelisted: true,
    transform: true,
  }));
  
  const config = new DocumentBuilder()
    .setTitle('SmartFolio API')
    .setDescription(
      `## AI-Powered Career Guide Platform\n\n` +
      `---\n\n` +
      `## 🔐 Step 1 — Authentication\n\n` +
      `| Step | Method | Endpoint | Description |\n` +
      `|------|--------|----------|-------------|\n` +
      `| 1 | POST | \`/auth/signup\` | Register with name, email, password → OTP sent to email |\n` +
      `| 2 | POST | \`/auth/verify-otp\` | Submit the 6-digit OTP → returns **accessToken** + **refreshToken** |\n` +
      `| 3 | GET  | \`/auth/me\` | Get current user info (call after login to confirm identity) |\n\n` +
      `**For returning users:** \`POST /auth/login\` → returns tokens directly (no OTP required).\n\n` +
      `**Using tokens:** Click the **Authorize 🔒** button above and paste your \`accessToken\`.\n\n` +
      `---\n\n` +
      `## 🧭 Step 2 — Onboarding (one-time setup)\n\n` +
      `| Step | Method | Endpoint | Description |\n` +
      `|------|--------|----------|-------------|\n` +
      `| 4 | GET  | \`/onboarding/status\` | Check if user has done onboarding → \`{ completed: false }\` |\n` +
      `| 5 | POST | \`/onboarding/complete\` | Submit career questionnaire (goals, experience, education, industry) |\n` +
      `| 6 | PUT  | \`/onboarding/profile\` | Update any profile fields later (all fields optional) |\n\n` +
      `All enum fields (goals, careerStage, experienceLevel, etc.) show **all available options** in the schema below.\n\n` +
      `---\n\n` +
      `## 📄 Step 3 — Resume Analysis\n\n` +
      `| Step | Method | Endpoint | Description |\n` +
      `|------|--------|----------|-------------|\n` +
      `| 7 | POST | \`/resume/upload\` | Upload a PDF resume (multipart, field name: \`file\`, max 5MB) → returns \`resumeId\` |\n` +
      `| 8a | POST | \`/resume/analyze\` | **Lens B** — General quality score: send \`{ resumeId }\` only |\n` +
      `| 8b | POST | \`/resume/analyze\` | **Lens A** — JD match score: send \`{ resumeId, jobDescription, jobTitle }\` |\n` +
      `| 9 | GET  | \`/resume/analyses\` | View full analysis history for the logged-in user |\n` +
      `| 10 | GET | \`/resume/{resumeId}/analyses\` | View analyses for one specific resume |\n\n` +
      `**Lens A weights:** relevance_match 35% · ATS 20% · skills 15% · experience 15% · achievement 10% · formatting 5%\n\n` +
      `**Lens B weights:** ATS 25% · content_quality 20% · experience 20% · skills 15% · achievement 10% · structure 10%\n\n` +
      `---\n\n` +
      `## 🔄 Token Management\n\n` +
      `| Method | Endpoint | Description |\n` +
      `|--------|----------|-------------|\n` +
      `| POST | \`/auth/refresh\` | Exchange refreshToken for a new accessToken |\n` +
      `| POST | \`/auth/logout\` | Revoke refresh token (requires Bearer token) |\n` +
      `| POST | \`/auth/forgot-password\` | Send password reset OTP to email |\n` +
      `| POST | \`/auth/reset-password\` | Set new password using reset token |`
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Auth', 'Authentication — signup, login, OTP, token refresh, password reset')
    .addTag('Onboarding', 'Career profile setup — goals, experience, industry (one-time + updatable)')
    .addTag('Resume', 'Resume upload and AI analysis — Lens A (targeted) and Lens B (general)')
    .build();

  app.enableCors({
    origin: configService.get<string>('FRONTEND_URL') || 'http://localhost:8000',
    credentials: true,
  });

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = configService.get<number>('PORT') || 3000;
  await app.listen(port);
  console.log(`🚀 Server running on http://localhost:${port}`);
  console.log(`📚 Swagger UI available at http://localhost:${port}/api`);
}
bootstrap();
