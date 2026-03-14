import { LensType } from '../entities/resume-analysis.entity';

interface ParsedScores {
  overall: number;
  contentQuality: number;
  experience: number;
  skills: number;
  achievement: number;
  formatting: number;
  relevance?: number;
  remarks: {
    strengths: string[];
    weaknesses: string[];
    actionable: string[];
  };
}

/**
 * Parses and validates the raw JSON response from Groq.
 * Falls back to safe defaults if the model returns malformed output.
 */
export class ScoreParser {
  static parse(rawResponse: string, lensType: LensType): ParsedScores {
    let parsed: any;

    try {
      // Strip any accidental markdown code fences
      const clean = rawResponse
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();
      parsed = JSON.parse(clean);
    } catch {
      return ScoreParser.fallback();
    }

    const s = parsed.scores ?? {};
    const r = parsed.remarks ?? {};

    const contentQuality = ScoreParser.clamp(s.content_quality ?? 50);
    const experience = ScoreParser.clamp(s.experience_strength ?? 50);
    const skills = ScoreParser.clamp(s.skills_alignment ?? 50);
    const achievement = ScoreParser.clamp(s.achievement_impact ?? 50);
    const formatting = ScoreParser.clamp(s.formatting_clarity ?? 50);
    const relevance =
      lensType === LensType.TARGETED && s.relevance_match != null
        ? ScoreParser.clamp(s.relevance_match)
        : undefined;

    const overall = ScoreParser.computeOverall(
      { contentQuality, experience, skills, achievement, formatting, relevance },
      lensType,
    );

    return {
      overall,
      contentQuality,
      experience,
      skills,
      achievement,
      formatting,
      relevance,
      remarks: {
        strengths: Array.isArray(r.strengths) ? r.strengths : [],
        weaknesses: Array.isArray(r.weaknesses) ? r.weaknesses : [],
        actionable: Array.isArray(r.actionable) ? r.actionable : [],
      },
    };
  }

  private static computeOverall(
    scores: {
      contentQuality: number;
      experience: number;
      skills: number;
      achievement: number;
      formatting: number;
      relevance?: number;
    },
    lensType: LensType,
  ): number {
    if (lensType === LensType.TARGETED) {
      // Lens A weights (relevance carries 35%, ATS already baked into prompt context)
      return Math.round(
        (scores.relevance ?? 50) * 0.35 +
          scores.skills * 0.15 +
          scores.experience * 0.15 +
          scores.achievement * 0.10 +
          scores.formatting * 0.05 +
          scores.contentQuality * 0.20,
      );
    } else {
      // Lens B weights
      return Math.round(
        scores.contentQuality * 0.20 +
          scores.experience * 0.20 +
          scores.skills * 0.15 +
          scores.achievement * 0.10 +
          scores.formatting * 0.10 +
          scores.contentQuality * 0.25, // ATS stands in via content quality
      );
    }
  }

  private static clamp(value: number): number {
    return Math.min(100, Math.max(0, Math.round(value)));
  }

  private static fallback(): ParsedScores {
    return {
      overall: 0,
      contentQuality: 0,
      experience: 0,
      skills: 0,
      achievement: 0,
      formatting: 0,
      remarks: {
        strengths: [],
        weaknesses: ['Analysis could not be completed. Please try again.'],
        actionable: [],
      },
    };
  }
}
