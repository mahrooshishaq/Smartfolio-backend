import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from '../user.entity';
import { PersonalityTraitCategory } from '../../../common/enums/user-enums';

/**
 * Stores personality traits and quiz results
 * Can be populated from multiple sources over time
 */
@Entity('user_personality_traits')
export class UserPersonalityTrait {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: PersonalityTraitCategory,
  })
  category: PersonalityTraitCategory;

  @Column({ type: 'varchar', length: 100 })
  traitKey: string; // e.g., "prefers_collaborative_work", "analytical_thinker"

  @Column({ type: 'varchar', length: 255 })
  traitValue: string; // e.g., "high", "true", "introvert"

  @Column({ type: 'int', nullable: true })
  score: number | null; // Optional numeric score (0-100)

  @Column({ type: 'varchar', length: 50 })
  source: string; // "onboarding_quiz", "personality_test_v1", etc.

  @CreateDateColumn()
  createdAt: Date;
}
