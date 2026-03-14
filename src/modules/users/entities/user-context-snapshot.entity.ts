import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from '../user.entity';

/**
 * Stores aggregated user context snapshots for LLM feeding
 * Pre-computed structured data ready for prompt injection
 * Updated whenever user information changes
 */
@Entity('user_context_snapshots')
export class UserContextSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'varchar', length: 50 })
  contextType: string; // "career_guidance", "resume_analysis", "job_matching", etc.

  /**
   * Structured context data ready for LLM
   * Example format:
   * {
   *   "primary_goals": ["job_matching", "resume_improvement"],
   *   "professional_context": {
   *     "experience_level": "mid_level",
   *     "years": 4,
   *     "current_role": "Software Engineer",
   *     "target_role": "Senior Engineer",
   *     "industry": "technology"
   *   },
   *   "personality_insights": {
   *     "work_style": "collaborative",
   *     "learning_preference": "hands_on"
   *   },
   *   "skills": ["JavaScript", "React", "Node.js"],
   *   "location": "New York, NY",
   *   "preferences": {
   *     "remote": true,
   *     "willing_to_relocate": false
   *   }
   * }
   */
  @Column({ type: 'jsonb' })
  structuredContext: Record<string, any>;

  @Column({ type: 'text' })
  llmReadyPrompt: string; // Pre-formatted natural language context for LLM

  @Column({ type: 'int', default: 1 })
  version: number; // Track updates to context

  @CreateDateColumn()
  createdAt: Date;
}
