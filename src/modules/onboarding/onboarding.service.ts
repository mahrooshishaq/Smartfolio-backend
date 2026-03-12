import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { UserGoal } from '../users/entities/user-goal.entity';
import { UserProfile } from '../users/entities/user-profile.entity';
import { UserDataSource } from '../users/entities/user-data-source.entity';
import { OnboardingDto, UpdateProfileDto, UserContextDto } from '../../common/dto/onboarding.dto';
import { DataSourceType } from '../../common/enums/user-enums';

@Injectable()
export class OnboardingService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserGoal)
    private userGoalRepository: Repository<UserGoal>,
    @InjectRepository(UserProfile)
    private userProfileRepository: Repository<UserProfile>,
    @InjectRepository(UserDataSource)
    private userDataSourceRepository: Repository<UserDataSource>,
  ) {}

  /**
   * Complete initial onboarding and create structured user data
   */
  async completeOnboarding(userId: string, onboardingDto: OnboardingDto): Promise<UserContextDto> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if already onboarded
    const existingProfile = await this.userProfileRepository.findOne({
      where: { userId },
    });
    if (existingProfile) {
      throw new BadRequestException('User has already completed onboarding');
    }

    // 1. Store raw onboarding data for lineage tracking
    const dataSource = this.userDataSourceRepository.create({
      userId,
      sourceType: DataSourceType.ONBOARDING_QUIZ,
      sourceName: 'onboarding_v1',
      rawData: onboardingDto,
      isProcessed: false,
      confidence: 100,
    });
    await this.userDataSourceRepository.save(dataSource);

    // Create user goals — array order implies priority (index 0 = highest priority)
    const goalPriorities = onboardingDto.goals.map((_, index) => index + 1);

    const userGoals = onboardingDto.goals.map((goalType, index) =>
      this.userGoalRepository.create({
        userId,
        goalType,
        priority: goalPriorities[index] || index + 1,
        isActive: true,
        source: DataSourceType.ONBOARDING_QUIZ,
      }),
    );
    await this.userGoalRepository.save(userGoals);

    // 3. Create comprehensive user profile
    const profile = this.userProfileRepository.create({
      userId,
      experienceLevel: onboardingDto.experienceLevel,
      yearsOfExperience: onboardingDto.yearsOfExperience,
      educationLevel: onboardingDto.educationLevel,
      currentRole: onboardingDto.currentRole,
      targetRole: onboardingDto.targetRole,
      currentIndustry: onboardingDto.currentIndustry,
      targetIndustry: onboardingDto.targetIndustry || onboardingDto.currentIndustry,
      careerStage: onboardingDto.careerStage,
      location: onboardingDto.location,
      openToRemote: onboardingDto.openToRemote || false,
      willingToRelocate: onboardingDto.willingToRelocate || false,
      skills: onboardingDto.skills || [],
      interests: onboardingDto.interests || [],
      profileCompleteness: this.calculateProfileCompleteness(onboardingDto),
    });
    await this.userProfileRepository.save(profile);

    // 4. Mark data source as processed
    dataSource.isProcessed = true;
    await this.userDataSourceRepository.save(dataSource);

    // 5. Return user context
    return this.getUserContext(userId);
  }

  /**
   * Update user profile information
   */
  async updateProfile(userId: string, updateDto: UpdateProfileDto): Promise<UserContextDto> {
    const profile = await this.userProfileRepository.findOne({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('User profile not found. Please complete onboarding first.');
    }

    // Update only provided fields
    Object.assign(profile, {
      ...updateDto,
      profileCompleteness: this.calculateProfileCompleteness({
        ...profile,
        ...updateDto,
      }),
    });

    await this.userProfileRepository.save(profile);

    // Track the update
    await this.userDataSourceRepository.save(
      this.userDataSourceRepository.create({
        userId,
        sourceType: DataSourceType.USER_INPUT,
        sourceName: 'profile_update',
        rawData: updateDto,
        isProcessed: true,
        confidence: 100,
      }),
    );

    return this.getUserContext(userId);
  }

  /**
   * Get structured user context for LLM or frontend display
   */
  async getUserContext(userId: string): Promise<UserContextDto> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const profile = await this.userProfileRepository.findOne({
      where: { userId },
    });

    const goals = await this.userGoalRepository.find({
      where: { userId, isActive: true },
      order: { priority: 'ASC' },
    });

    return {
      userId: user.id,
      profileCompleteness: profile?.profileCompleteness || 0,
      primaryGoals: goals.map((g) => g.goalType),
      experienceLevel: profile?.experienceLevel!,
      careerStage: profile?.careerStage!,
      currentRole: profile?.currentRole || undefined,
      targetRole: profile?.targetRole || undefined,
      skills: profile?.skills || undefined,
      hasCompletedOnboarding: !!profile,
    };
  }

  /**
   * Check if user has completed onboarding
   */
  async hasCompletedOnboarding(userId: string): Promise<boolean> {
    const profile = await this.userProfileRepository.findOne({
      where: { userId },
    });
    return !!profile;
  }

  /**
   * Calculate profile completeness percentage
   */
  private calculateProfileCompleteness(data: Partial<OnboardingDto | UserProfile>): number {
    const fields = [
      'experienceLevel',
      'educationLevel',
      'currentRole',
      'targetRole',
      'currentIndustry',
      'careerStage',
      'location',
      'skills',
      'interests',
    ];

    const filledFields = fields.filter((field) => {
      const value = data[field as keyof typeof data];
      if (Array.isArray(value)) return value.length > 0;
      return value != null && value !== '';
    }).length;

    return Math.round((filledFields / fields.length) * 100);
  }
}
