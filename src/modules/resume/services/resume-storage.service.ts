import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Resume } from '../entities/resume.entity';
import {
  ResumeAnalysis,
  LensType,
  ConfidenceLevel,
} from '../entities/resume-analysis.entity';
import { AnalysisResponseDto } from '../dto/analysis-response.dto';

@Injectable()
export class ResumeStorageService {
  constructor(
    @InjectRepository(Resume)
    private readonly resumeRepository: Repository<Resume>,
    @InjectRepository(ResumeAnalysis)
    private readonly analysisRepository: Repository<ResumeAnalysis>,
  ) {}

  async findResumeById(resumeId: string): Promise<Resume | null> {
    return this.resumeRepository.findOne({ where: { id: resumeId } });
  }

  async updateExtraction(
    resume: Resume,
    extractedText: string,
    metadata: Resume['extractionMetadata'],
  ): Promise<Resume> {
    resume.extractedText = extractedText;
    resume.extractionMetadata = metadata;
    resume.isExtracted = true;
    return this.resumeRepository.save(resume);
  }

  async saveAnalysis(data: {
    resumeId: string;
    userId: string;
    lensType: LensType;
    jobDescription?: string;
    jobTitle?: string;
    company?: string;
    scores: {
      overall: number;
      ats: number;
      contentQuality: number;
      experience: number;
      skills: number;
      achievement: number;
      formatting: number;
      relevance?: number;
    };
    interpretationBand: string;
    confidenceLevel: ConfidenceLevel;
    remarks: { strengths: string[]; weaknesses: string[]; actionable: string[] };
    rawLlmResponse: string;
    processingTimeMs: number;
  }): Promise<ResumeAnalysis> {
    const analysis = this.analysisRepository.create({
      resumeId: data.resumeId,
      userId: data.userId,
      lensType: data.lensType,
      jobDescription: data.jobDescription ?? null,
      jobTitle: data.jobTitle ?? null,
      company: data.company ?? null,
      overallScore: data.scores.overall,
      atsScore: data.scores.ats,
      contentQualityScore: data.scores.contentQuality,
      experienceScore: data.scores.experience,
      skillsScore: data.scores.skills,
      achievementScore: data.scores.achievement,
      formattingScore: data.scores.formatting,
      relevanceScore: data.scores.relevance ?? null,
      interpretationBand: data.interpretationBand,
      confidenceLevel: data.confidenceLevel,
      remarks: data.remarks,
      rawLlmResponse: data.rawLlmResponse,
      processingTimeMs: data.processingTimeMs,
    });

    return this.analysisRepository.save(analysis);
  }

  async getAnalysesForResume(resumeId: string): Promise<ResumeAnalysis[]> {
    return this.analysisRepository.find({
      where: { resumeId },
      order: { createdAt: 'DESC' },
    });
  }

  async getAnalysesForUser(userId: string): Promise<ResumeAnalysis[]> {
    return this.analysisRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      relations: ['resume'],
    });
  }

  toResponseDto(analysis: ResumeAnalysis): AnalysisResponseDto {
    return {
      analysisId: analysis.id,
      resumeId: analysis.resumeId,
      lensType: analysis.lensType,
      overallScore: Number(analysis.overallScore),
      categoryScores: {
        ats_compatibility: Number(analysis.atsScore),
        content_quality: Number(analysis.contentQualityScore),
        experience_strength: Number(analysis.experienceScore),
        skills_alignment: Number(analysis.skillsScore),
        achievement_impact: Number(analysis.achievementScore),
        formatting_clarity: Number(analysis.formattingScore),
        ...(analysis.relevanceScore != null && {
          relevance_match: Number(analysis.relevanceScore),
        }),
      },
      interpretationBand: analysis.interpretationBand,
      confidenceLevel: analysis.confidenceLevel,
      remarks: analysis.remarks,
      processingTimeMs: analysis.processingTimeMs ?? 0,
      createdAt: analysis.createdAt,
    };
  }
}
