import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as fs from 'fs';
import { PythonBridgeService } from '../../python-bridge/python-bridge.service';
import { GroqService } from '../../ai/groq.service';
import { UserContextService } from '../../onboarding/user-context.service';
import { ResumeStorageService } from './resume-storage.service';
import { AnalyzeResumeDto } from '../dto/analyze-resume.dto';
import { AnalysisResponseDto } from '../dto/analysis-response.dto';
import { LensType, ConfidenceLevel } from '../entities/resume-analysis.entity';
import { LENS_A_SYSTEM_PROMPT, LENS_B_SYSTEM_PROMPT } from '../prompts/analysis.prompts';
import { ScoreParser } from '../utils/score-parser.util';
import { AtsChecker } from '../utils/ats-checker.util';

@Injectable()
export class ResumeAnalysisService {
  constructor(
    private readonly pythonBridge: PythonBridgeService,
    private readonly groqService: GroqService,
    private readonly userContextService: UserContextService,
    private readonly storageService: ResumeStorageService,
  ) {}

  async analyze(
    userId: string,
    dto: AnalyzeResumeDto,
  ): Promise<AnalysisResponseDto> {
    const startTime = Date.now();

    // 1. Load resume record
    const resume = await this.storageService.findResumeById(dto.resumeId);
    if (!resume) {
      throw new NotFoundException('Resume not found.');
    }
    if (resume.userId !== userId) {
      throw new BadRequestException('You do not have access to this resume.');
    }

    // 2. Extract text on-demand (cache after first extraction)
    if (!resume.isExtracted || !resume.extractedText) {
      const fileBuffer = fs.readFileSync(resume.filePath);
      const extracted = await this.pythonBridge.extractResume(fileBuffer, resume.originalFileName);
      await this.storageService.updateExtraction(
        resume,
        extracted.text,
        extracted.metadata,
      );
      resume.extractedText = extracted.text;
      resume.extractionMetadata = extracted.metadata;
    }

    const resumeText = resume.extractedText;
    if (!resumeText) {
      throw new BadRequestException(
        'Could not extract text from resume. Please ensure the PDF contains selectable text (not a scanned image).',
      );
    }

    // 3. Rule-based ATS score (fast, no LLM cost)
    const atsResult = AtsChecker.check(resumeText, resume.extractionMetadata);

    // 4. Get user context for personalised LLM analysis
    const { llmPrompt: userContextPrompt } =
      await this.userContextService.getUserContextForLLM(userId, 'resume_analysis');

    // 5. Determine lens and run AI scoring
    const lensType = dto.jobDescription ? LensType.TARGETED : LensType.GENERAL;

    const { rawResponse, scores } = await this.runLlmScoring({
      lensType,
      resumeText,
      userContextPrompt,
      atsScore: atsResult.score,
      jobDescription: dto.jobDescription,
      jobTitle: dto.jobTitle,
    });

    // 6. Derive interpretation band
    const interpretationBand = this.getInterpretationBand(
      scores.overall,
      lensType,
    );

    // 7. Persist and return
    const analysis = await this.storageService.saveAnalysis({
      resumeId: dto.resumeId,
      userId,
      lensType,
      jobDescription: dto.jobDescription,
      jobTitle: dto.jobTitle,
      company: dto.company,
      scores: {
        overall: scores.overall,
        ats: atsResult.score,
        contentQuality: scores.contentQuality,
        experience: scores.experience,
        skills: scores.skills,
        achievement: scores.achievement,
        formatting: scores.formatting,
        relevance: scores.relevance,
      },
      interpretationBand,
      confidenceLevel: ConfidenceLevel.HIGH,
      remarks: scores.remarks,
      rawLlmResponse: rawResponse,
      processingTimeMs: Date.now() - startTime,
    });

    return this.storageService.toResponseDto(analysis);
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async runLlmScoring(params: {
    lensType: LensType;
    resumeText: string;
    userContextPrompt: string;
    atsScore: number;
    jobDescription?: string;
    jobTitle?: string;
  }): Promise<{
    rawResponse: string;
    scores: {
      overall: number;
      contentQuality: number;
      experience: number;
      skills: number;
      achievement: number;
      formatting: number;
      relevance?: number;
      remarks: { strengths: string[]; weaknesses: string[]; actionable: string[] };
    };
  }> {
    const systemPrompt =
      params.lensType === LensType.TARGETED
        ? LENS_A_SYSTEM_PROMPT
        : LENS_B_SYSTEM_PROMPT;

    const userMessage = this.buildUserMessage(params);

    const rawResponse = await this.groqService.analyzeWithSystemPrompt(
      systemPrompt,
      userMessage,
      { temperature: 0.2, maxTokens: 2048 },
    );

    const scores = ScoreParser.parse(rawResponse, params.lensType);
    return { rawResponse, scores };
  }

  private buildUserMessage(params: {
    lensType: LensType;
    resumeText: string;
    userContextPrompt: string;
    atsScore: number;
    jobDescription?: string;
    jobTitle?: string;
  }): string {
    let msg = `## User Profile\n${params.userContextPrompt}\n\n`;
    msg += `## ATS Pre-Check Score\nATS Compatibility Score (rule-based): ${params.atsScore}/100\n\n`;
    msg += `## Resume Content\n\`\`\`\n${params.resumeText}\n\`\`\`\n`;

    if (params.lensType === LensType.TARGETED && params.jobDescription) {
      msg += `\n## Target Job\n`;
      if (params.jobTitle) msg += `Title: ${params.jobTitle}\n`;
      msg += `\`\`\`\n${params.jobDescription}\n\`\`\`\n`;
    }

    return msg;
  }

  private getInterpretationBand(score: number, lens: LensType): string {
    if (lens === LensType.TARGETED) {
      if (score >= 85) return 'Strong Match – Ready to Apply';
      if (score >= 70) return 'Good Match – Needs Minor Tailoring';
      if (score >= 55) return 'Moderate – Needs Resume Customization';
      return 'Weak Match – Role Misalignment';
    } else {
      if (score >= 85) return 'Market Ready Resume';
      if (score >= 70) return 'Competitive but Needs Refinement';
      if (score >= 55) return 'Entry-Level Quality – Improve Positioning';
      return 'Needs Major Rewrite';
    }
  }
}
