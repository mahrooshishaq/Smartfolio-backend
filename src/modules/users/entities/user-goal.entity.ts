import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from '../user.entity';
import { UserGoalType, DataSourceType } from '../../../common/enums/user-enums';

/**
 * Stores user goals with priority and tracking
 * Enables filtering users by primary intent for targeted LLM prompts
 */
@Entity('user_goals')
export class UserGoal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: UserGoalType,
  })
  goalType: UserGoalType;

  @Column({ type: 'int', default: 5 })
  priority: number; // 1 (highest) to 5 (lowest)

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({
    type: 'enum',
    enum: DataSourceType,
    default: DataSourceType.ONBOARDING_QUIZ,
  })
  source: DataSourceType;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
