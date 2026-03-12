import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from '../user.entity';
import {
  ExperienceLevel,
  EducationLevel,
  IndustryType,
  CareerStage,
} from '../../../common/enums/user-enums';

/**
 * Core professional profile information
 * Rich structured data for LLM context
 */
@Entity('user_profiles')
export class UserProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  userId: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  // Professional Information
  @Column({
    type: 'enum',
    enum: ExperienceLevel,
    nullable: true,
  })
  experienceLevel: ExperienceLevel | null;

  @Column({ type: 'int', nullable: true })
  yearsOfExperience: number | null;

  @Column({
    type: 'enum',
    enum: EducationLevel,
    nullable: true,
  })
  educationLevel: EducationLevel | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  currentRole: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  targetRole: string | null;

  @Column({
    type: 'enum',
    enum: IndustryType,
    nullable: true,
  })
  currentIndustry: IndustryType | null;

  @Column({
    type: 'enum',
    enum: IndustryType,
    nullable: true,
  })
  targetIndustry: IndustryType | null;

  @Column({
    type: 'enum',
    enum: CareerStage,
    nullable: true,
  })
  careerStage: CareerStage | null;

  // Location & Preferences
  @Column({ type: 'varchar', length: 100, nullable: true })
  location: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  targetLocation: string | null;

  @Column({ type: 'boolean', default: false })
  willingToRelocate: boolean;

  @Column({ type: 'boolean', default: false })
  openToRemote: boolean;

  // Skills & Interests (JSON for flexibility)
  @Column({ type: 'jsonb', nullable: true })
  skills: string[] | null; // ["JavaScript", "Python", "Leadership"]

  @Column({ type: 'jsonb', nullable: true })
  interests: string[] | null; // ["AI/ML", "Web Development", "Data Science"]

  @Column({ type: 'text', nullable: true })
  bio: string | null;

  // Completion tracking
  @Column({ type: 'int', default: 0 })
  profileCompleteness: number; // 0-100%

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
