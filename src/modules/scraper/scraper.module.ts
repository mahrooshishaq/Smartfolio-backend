import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScraperService } from './scraper.service';
import { ScraperController } from './scraper.controller';
import { QueryGeneratorService } from './query-generator.service';
import { User } from '../users/user.entity';
import { UserProfile } from '../users/entities/user-profile.entity';
import { UserGoal } from '../users/entities/user-goal.entity';
import { JobsModule } from '../jobs/jobs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserProfile, UserGoal]),JobsModule,
  ],
  providers: [ScraperService, QueryGeneratorService],
  controllers: [ScraperController],
  exports: [ScraperService],
  
})
export class ScraperModule {}
