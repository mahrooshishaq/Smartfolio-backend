import {
  Injectable,
  Logger,
  InternalServerErrorException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GroqService } from '../ai/groq.service';
import {
  InterviewSession,
  InterviewQuestion,
  InterviewEvaluation,
} from './entities/interview-session.entity';
import { GenerateTestDto } from './dto/generate-test.dto';
import { SubmitAnswersDto } from './dto/submit-answers.dto';
import {
  QUESTION_GENERATION_PROMPT,
  EVALUATION_PROMPT,
} from './prompts/interview.prompts';

/**
 * PublicQuestion — what the frontend sees (no answer keys leaked).
 */
export interface PublicQuestion {
  id: number;
  round: 'hr' | 'technical' | 'problem_solving';
  type: 'mcq' | 'short_answer' | 'scenario' | 'fill_in_the_blank' | 'behavioral';
  question: string;
  options?: string[];
}

@Injectable()
export class MockInterviewService {
  private readonly logger = new Logger(MockInterviewService.name);

  constructor(
    @InjectRepository(InterviewSession)
    private readonly sessionRepo: Repository<InterviewSession>,
    private readonly groq: GroqService,
  ) {}

  // ─── POST /mock-interview/generate ────────────────────────────────────
  async generateTest(
    userId: string,
    dto: GenerateTestDto,
  ): Promise<{ sessionId: string; questions: PublicQuestion[] }> {
    const raw = await this.groq.analyzeWithSystemPrompt(
      QUESTION_GENERATION_PROMPT,
      `Job description:\n\n${dto.jobDescription}`,
      { temperature: 0.4, maxTokens: 2500 },
    );

    let parsed: { questions: InterviewQuestion[] };
    try {
      parsed = JSON.parse(this.stripJsonFence(raw));
    } catch (err) {
      this.logger.error(`Failed to parse Groq question JSON: ${raw.slice(0, 300)}`);
      throw new InternalServerErrorException('Failed to generate test. Please try again.');
    }

    if (!parsed.questions || !Array.isArray(parsed.questions) || parsed.questions.length !== 15) {
      this.logger.error(`Unexpected question count: got ${parsed.questions?.length ?? 0}`);
      throw new InternalServerErrorException('AI returned an unexpected response. Please try again.');
    }

    // Persist the full session (with answer keys) — they stay server-side
    const session = this.sessionRepo.create({
      userId,
      jobDescription: dto.jobDescription,
      questions: parsed.questions,
      answers: null,
      evaluation: null,
      overallScore: null,
      submittedAt: null,
    });
    const saved = await this.sessionRepo.save(session);

    return {
      sessionId: saved.id,
      questions: this.stripAnswerKeys(parsed.questions),
    };
  }

  // ─── POST /mock-interview/submit ──────────────────────────────────────
  async submitAnswers(
    userId: string,
    dto: SubmitAnswersDto,
  ): Promise<{ sessionId: string; evaluation: InterviewEvaluation }> {
    const session = await this.sessionRepo.findOne({ where: { id: dto.sessionId } });
    if (!session) throw new NotFoundException('Interview session not found.');
    if (session.userId !== userId) throw new ForbiddenException('Not your session.');
    if (session.evaluation) {
      throw new BadRequestException('This session has already been submitted.');
    }
    if (dto.answers.length !== session.questions.length) {
      throw new BadRequestException(
        `Expected ${session.questions.length} answers, received ${dto.answers.length}.`,
      );
    }

    const evaluationInput = {
      jobDescription: session.jobDescription,
      questions: session.questions,
      answers: dto.answers,
    };

    const raw = await this.groq.analyzeWithSystemPrompt(
      EVALUATION_PROMPT,
      JSON.stringify(evaluationInput),
      { temperature: 0.2, maxTokens: 2000 },
    );

    let evaluation: InterviewEvaluation;
    try {
      evaluation = JSON.parse(this.stripJsonFence(raw));
    } catch (err) {
      this.logger.error(`Failed to parse evaluation JSON: ${raw.slice(0, 300)}`);
      throw new InternalServerErrorException('Failed to evaluate answers. Please try again.');
    }

    // Persist
    session.answers = dto.answers;
    session.evaluation = evaluation;
    session.overallScore = evaluation.overallScore;
    session.submittedAt = new Date();
    await this.sessionRepo.save(session);

    return { sessionId: session.id, evaluation };
  }

  // ─── GET /mock-interview/sessions ─────────────────────────────────────
  async getUserSessions(userId: string) {
    const sessions = await this.sessionRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    return sessions.map((s) => ({
      id: s.id,
      createdAt: s.createdAt,
      submittedAt: s.submittedAt,
      overallScore: s.overallScore,
      jobDescriptionPreview: s.jobDescription.slice(0, 140),
      isSubmitted: !!s.evaluation,
    }));
  }

  // ─── helpers ──────────────────────────────────────────────────────────
  private stripAnswerKeys(questions: InterviewQuestion[]): PublicQuestion[] {
    return questions.map((q) => ({
      id: q.id,
      round: q.round,
      type: q.type,
      question: q.question,
      options: q.options,
    }));
  }

  private stripJsonFence(raw: string): string {
    return raw.replace(/```json|```/g, '').trim();
  }
}
