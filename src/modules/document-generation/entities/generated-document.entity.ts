import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/user.entity';

export enum DocumentType {
  COVER_LETTER = 'cover_letter',
  PROFESSIONAL_EMAIL = 'professional_email',
  UNIVERSITY_STATEMENT = 'university_statement',
}

@Entity('generated_documents')
export class GeneratedDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'enum', enum: DocumentType })
  documentType: DocumentType;

  @Column({ type: 'jsonb' })
  formData: Record<string, any>;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  title: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
