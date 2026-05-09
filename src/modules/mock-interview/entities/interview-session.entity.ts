import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/user.entity';

export type InterviewQuestionType = 'mcq' | 'short_answer' | 'scenario' | 'fill_in_the_blank' | 'behavioral';
export type InterviewRound = 'hr' | 'technical' | 'problem_solving';

export interface InterviewQuestion {
  id: number;
  round: InterviewRound;
  type: InterviewQuestionType;
  question: string;
  options?: string[];        // for MCQs
  correctIndex?: number;     // for MCQs (server-side only)
  expectedKeywords?: string[]; // for short answers / behavioral (server-side only)
  expectedAnswer?: string;     // for fill_in_the_blank (server-side only)
  acceptableAnswers?: string[]; // for fill_in_the_blank (server-side only)
  evaluationCriteria?: string; // for behavioral / scenario — what a good answer demonstrates (server-side only)
}

export interface InterviewAnswer {
  questionId: number;
  answer: string | number;   // string for text, number (option index) for MCQ
}

export interface QuestionFeedback {
  questionId: number;
  verdict: 'correct' | 'partial' | 'incorrect';
  explanation: string;
}

export interface RoundScore {
  hr: number;
  technical: number;
  problem_solving: number;
}

export interface InterviewEvaluation {
  overallScore: number;
  roundScores: RoundScore;
  perQuestion: QuestionFeedback[];
  improvementTips: string[];
  summary: string;
  strengths: string[];
  areasToImprove: string[];
}

@Entity('interview_sessions')
export class InterviewSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'text' })
  jobDescription: string;

  @Column({ type: 'jsonb' })
  questions: InterviewQuestion[];

  @Column({ type: 'jsonb', nullable: true })
  answers: InterviewAnswer[] | null;

  @Column({ type: 'jsonb', nullable: true })
  evaluation: InterviewEvaluation | null;

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  overallScore: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  submittedAt: Date | null;
}
