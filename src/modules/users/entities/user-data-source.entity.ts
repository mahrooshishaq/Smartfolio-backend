import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from '../user.entity';
import { DataSourceType } from '../../../common/enums/user-enums';

/**
 * Tracks all information sources about the user
 * Maintains data lineage for quality and debugging
 */
@Entity('user_data_sources')
export class UserDataSource {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: DataSourceType,
  })
  sourceType: DataSourceType;

  @Column({ type: 'varchar', length: 100 })
  sourceName: string; // "onboarding_v1", "resume_2024.pdf", "search_history_jan"

  /**
   * Raw extracted data from this source
   * Can be processed and distributed to other tables
   */
  @Column({ type: 'jsonb' })
  rawData: Record<string, any>;

  @Column({ type: 'boolean', default: false })
  isProcessed: boolean;

  @Column({ type: 'int', default: 100 })
  confidence: number; // Data quality score 0-100

  @CreateDateColumn()
  createdAt: Date;
}
