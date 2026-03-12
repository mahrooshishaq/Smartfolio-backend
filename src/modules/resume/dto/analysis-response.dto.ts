import { LensType, ConfidenceLevel } from '../entities/resume-analysis.entity';

export class AnalysisResponseDto {
  analysisId: string;
  resumeId: string;
  lensType: LensType;

  overallScore: number;
  categoryScores: {
    ats_compatibility: number;
    content_quality: number;
    experience_strength: number;
    skills_alignment: number;
    achievement_impact: number;
    formatting_clarity: number;
    relevance_match?: number; // only Lens A
  };

  interpretationBand: string;
  confidenceLevel: ConfidenceLevel;

  remarks: {
    strengths: string[];
    weaknesses: string[];
    actionable: string[];
  };

  processingTimeMs: number;
  createdAt: Date;
}
