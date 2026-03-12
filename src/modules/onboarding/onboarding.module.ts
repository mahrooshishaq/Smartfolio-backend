import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';
import { UserContextService } from './user-context.service';
import { User } from '../users/user.entity';
import { UserGoal } from '../users/entities/user-goal.entity';
import { UserProfile } from '../users/entities/user-profile.entity';
import { UserDataSource } from '../users/entities/user-data-source.entity';
import { UserPersonalityTrait } from '../users/entities/user-personality.entity';
import { UserContextSnapshot } from '../users/entities/user-context-snapshot.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserGoal,
      UserProfile,
      UserDataSource,
      UserPersonalityTrait,
      UserContextSnapshot,
    ]),
  ],
  controllers: [OnboardingController],
  providers: [OnboardingService, UserContextService],
  exports: [OnboardingService, UserContextService],
})
export class OnboardingModule {}
