import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/user.entity';
import { Resume } from './resume.entity';

export enum LensType {
  TARGETED = 'targeted',   // Lens A — JD provided
  GENERAL = 'general',     // Lens B — no JD
}

export enum ConfidenceLevel {
  HIGH = 'High',
  MEDIUM = 'Medium',
  LOW = 'Low',
}

@Entity('resume_analyses')
export class ResumeAnalysis {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  resumeId: string;

  @ManyToOne(() => Resume, (resume) => resume.analyses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'resumeId' })
  resume: Resume;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'enum', enum: LensType })
  lensType: LensType;

  // ── Optional JD (Lens A only) ──────────────────────────────────
  @Column({ type: 'text', nullable: true })
  jobDescription: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  jobTitle: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  company: string | null;

  // ── Scores ─────────────────────────────────────────────────────
  @Column({ type: 'numeric', precision: 5, scale: 2 })
  overallScore: number;

  @Column({ type: 'numeric', precision: 5, scale: 2 })
  atsScore: number;

  @Column({ type: 'numeric', precision: 5, scale: 2 })
  contentQualityScore: number;

  @Column({ type: 'numeric', precision: 5, scale: 2 })
  experienceScore: number;

  @Column({ type: 'numeric', precision: 5, scale: 2 })
  skillsScore: number;

  @Column({ type: 'numeric', precision: 5, scale: 2 })
  achievementScore: number;

  @Column({ type: 'numeric', precision: 5, scale: 2 })
  formattingScore: number;

  // Only populated for Lens A
  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  relevanceScore: number | null;

  // ── Results ────────────────────────────────────────────────────
  @Column({ type: 'varchar', length: 100 })
  interpretationBand: string; // e.g. "Good Match – Needs Minor Tailoring"

  @Column({ type: 'enum', enum: ConfidenceLevel, default: ConfidenceLevel.HIGH })
  confidenceLevel: ConfidenceLevel;

  @Column({ type: 'jsonb' })
  remarks: {
    strengths: string[];
    weaknesses: string[];
    actionable: string[];
  };

  // Full raw LLM response stored for debugging / future reprocessing
  @Column({ type: 'text', nullable: true })
  rawLlmResponse: string | null;

  @Column({ type: 'int', nullable: true })
  processingTimeMs: number | null;

  @Column({ type: 'varchar', length: 20, default: 'v1.0' })
  analysisVersion: string;

  @CreateDateColumn()
  createdAt: Date;
}
