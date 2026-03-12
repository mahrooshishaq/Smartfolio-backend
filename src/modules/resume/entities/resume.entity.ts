import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/user.entity';
import { ResumeAnalysis } from './resume-analysis.entity';

@Entity('resumes')
export class Resume {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'varchar', length: 255 })
  originalFileName: string;

  @Column({ type: 'varchar', length: 500 })
  filePath: string; // local disk path

  @Column({ type: 'int' })
  fileSizeBytes: number;

  // Cached extraction — populated on first analysis
  @Column({ type: 'text', nullable: true })
  extractedText: string | null;

  @Column({ type: 'jsonb', nullable: true })
  extractionMetadata: {
    pageCount: number;
    hasTables: boolean;
    hasImages: boolean;
    confidence: number;
  } | null;

  @Column({ type: 'boolean', default: false })
  isExtracted: boolean;

  @OneToMany(() => ResumeAnalysis, (analysis) => analysis.resume)
  analyses: ResumeAnalysis[];

  @CreateDateColumn()
  uploadedAt: Date;
}
