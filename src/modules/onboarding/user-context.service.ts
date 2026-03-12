import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { UserGoal } from '../users/entities/user-goal.entity';
import { UserProfile } from '../users/entities/user-profile.entity';
import { UserPersonalityTrait } from '../users/entities/user-personality.entity';
import { UserContextSnapshot } from '../users/entities/user-context-snapshot.entity';

/**
 * Aggregates user data from multiple sources into LLM-ready format
 * This is the key service that transforms structured DB data into prompts
 */
@Injectable()
export class UserContextService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserGoal)
    private userGoalRepository: Repository<UserGoal>,
    @InjectRepository(UserProfile)
    private userProfileRepository: Repository<UserProfile>,
    @InjectRepository(UserPersonalityTrait)
    private personalityTraitRepository: Repository<UserPersonalityTrait>,
    @InjectRepository(UserContextSnapshot)
    private contextSnapshotRepository: Repository<UserContextSnapshot>,
  ) {}

  /**
   * Generate comprehensive user context for LLM
   * @param userId - User ID
   * @param contextType - Type of context needed (career_guidance, resume_analysis, etc.)
   * @returns Structured context object and natural language prompt
   */
  async generateUserContext(
    userId: string,
    contextType: string = 'general',
  ): Promise<{
    structuredContext: Record<string, any>;
    llmPrompt: string;
  }> {
    // Fetch all user data in parallel
    const [user, goals, profile, personalityTraits] = await Promise.all([
      this.userRepository.findOne({ where: { id: userId } }),
      this.userGoalRepository.find({
        where: { userId, isActive: true },
        order: { priority: 'ASC' },
      }),
      this.userProfileRepository.findOne({ where: { userId } }),
      this.personalityTraitRepository.find({ where: { userId } }),
    ]);

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    // If user hasn't completed onboarding yet, return a minimal context
    // so resume analysis still works (just without personalisation)
    if (!profile) {
      const minimalPrompt =
        `User "${user.name}" has not completed profile onboarding yet. ` +
        `Analyze the resume based purely on its content without personalised context.`;
      return {
        structuredContext: { user_info: { name: user.name, email: user.email } },
        llmPrompt: minimalPrompt,
      };
    }

    // Build structured context
    const structuredContext = {
      user_info: {
        name: user.name,
        email: user.email,
      },
      primary_goals: goals.map((g) => ({
        goal: g.goalType,
        priority: g.priority,
      })),
      professional_context: {
        experience_level: profile.experienceLevel,
        years_of_experience: profile.yearsOfExperience,
        education_level: profile.educationLevel,
        current_role: profile.currentRole,
        target_role: profile.targetRole,
        current_industry: profile.currentIndustry,
        target_industry: profile.targetIndustry,
        career_stage: profile.careerStage,
      },
      skills_and_interests: {
        skills: profile.skills || [],
        interests: profile.interests || [],
      },
      location_preferences: {
        location: profile.location,
        target_location: profile.targetLocation,
        open_to_remote: profile.openToRemote,
        willing_to_relocate: profile.willingToRelocate,
      },
      personality_insights: this.groupPersonalityTraits(personalityTraits),
      metadata: {
        profile_completeness: profile.profileCompleteness,
        context_type: contextType,
        generated_at: new Date().toISOString(),
      },
    };

    // Generate natural language prompt
    const llmPrompt = this.generateNaturalLanguagePrompt(
      structuredContext,
      contextType,
    );

    // Save snapshot for future reference
    await this.saveContextSnapshot(userId, contextType, structuredContext, llmPrompt);

    return {
      structuredContext,
      llmPrompt,
    };
  }

  /**
   * Generate natural language prompt from structured data
   * This is what gets injected into LLM system prompts
   */
  private generateNaturalLanguagePrompt(
    context: Record<string, any>,
    contextType: string,
  ): string {
    const prof = context.professional_context;
    const goals = context.primary_goals;

    let prompt = `User Profile Context:\n\n`;

    // Basic info
    prompt += `The user, ${context.user_info.name}, is currently `;

    // Experience level
    if (prof.years_of_experience) {
      prompt += `a ${prof.experience_level?.replace('_', ' ') ?? 'professional'} with ${prof.years_of_experience} years of experience`;
    } else {
      prompt += `at the ${prof.experience_level?.replace('_', ' ') ?? 'professional'} stage`;
    }

    // Current role
    if (prof.current_role) {
      prompt += ` working as a ${prof.current_role}`;
    }

    // Industry
    if (prof.current_industry) {
      prompt += ` in the ${prof.current_industry} industry`;
    }

    prompt += `.\n\n`;

    // Career stage and goals
    if (prof.career_stage) {
      prompt += `Career Stage: ${prof.career_stage.replace('_', ' ')}\n`;
    }
    if (prof.target_role) {
      prompt += `Career Goal: Transitioning to ${prof.target_role}`;
      if (prof.target_industry && prof.target_industry !== prof.current_industry) {
        prompt += ` in the ${prof.target_industry} industry`;
      }
      prompt += `.\n`;
    }

    // Primary objectives
    if (goals.length > 0) {
      prompt += `\nPrimary Objectives (in order of priority):\n`;
      goals.forEach((goal: any, index: number) => {
        const goalText = goal.goal.replace(/_/g, ' ');
        prompt += `${index + 1}. ${goalText}\n`;
      });
    }

    // Skills
    if (context.skills_and_interests.skills.length > 0) {
      prompt += `\nKey Skills: ${context.skills_and_interests.skills.join(', ')}\n`;
    }

    // Interests
    if (context.skills_and_interests.interests.length > 0) {
      prompt += `Interests: ${context.skills_and_interests.interests.join(', ')}\n`;
    }

    // Location preferences
    const loc = context.location_preferences;
    if (loc.location || loc.open_to_remote || loc.willing_to_relocate) {
      prompt += `\nLocation Preferences:\n`;
      if (loc.location) prompt += `- Current location: ${loc.location}\n`;
      if (loc.target_location) prompt += `- Target location: ${loc.target_location}\n`;
      if (loc.open_to_remote) prompt += `- Open to remote work\n`;
      if (loc.willing_to_relocate) prompt += `- Willing to relocate\n`;
    }

    // Personality insights (if any)
    const personality = context.personality_insights;
    if (Object.keys(personality).length > 0) {
      prompt += `\nPersonality Insights:\n`;
      Object.entries(personality).forEach(([category, traits]: [string, any]) => {
        if (Object.keys(traits).length > 0) {
          prompt += `${category.replace('_', ' ')}: ${JSON.stringify(traits)}\n`;
        }
      });
    }

    // Context-specific guidance
    prompt += `\n--- Context Type: ${contextType} ---\n`;
    switch (contextType) {
      case 'resume_analysis':
        prompt += `When analyzing the resume, consider the user's target role and experience level.\n`;
        break;
      case 'job_matching':
        prompt += `When recommending jobs, prioritize roles matching the target position and industry.\n`;
        break;
      case 'career_guidance':
        prompt += `Provide personalized career advice based on the user's current stage and goals.\n`;
        break;
    }

    return prompt;
  }

  /**
   * Group personality traits by category for easy consumption
   */
  private groupPersonalityTraits(traits: UserPersonalityTrait[]): Record<string, any> {
    const grouped: Record<string, any> = {};

    traits.forEach((trait) => {
      if (!grouped[trait.category]) {
        grouped[trait.category] = {};
      }
      grouped[trait.category][trait.traitKey] = {
        value: trait.traitValue,
        score: trait.score,
      };
    });

    return grouped;
  }

  /**
   * Save context snapshot for caching and analysis
   */
  private async saveContextSnapshot(
    userId: string,
    contextType: string,
    structuredContext: Record<string, any>,
    llmPrompt: string,
  ): Promise<void> {
    // Check for existing snapshot of this type
    const existing = await this.contextSnapshotRepository.findOne({
      where: { userId, contextType },
      order: { createdAt: 'DESC' },
    });

    const version = existing ? existing.version + 1 : 1;

    const snapshot = this.contextSnapshotRepository.create({
      userId,
      contextType,
      structuredContext,
      llmReadyPrompt: llmPrompt,
      version,
    });

    await this.contextSnapshotRepository.save(snapshot);
  }

  /**
   * Get latest cached context snapshot (to avoid regenerating)
   */
  async getLatestContext(
    userId: string,
    contextType: string,
    maxAgeMinutes: number = 60,
  ): Promise<{ structuredContext: Record<string, any>; llmPrompt: string } | null> {
    const snapshot = await this.contextSnapshotRepository.findOne({
      where: { userId, contextType },
      order: { createdAt: 'DESC' },
    });

    if (!snapshot) return null;

    // Check if snapshot is fresh enough
    const ageMinutes =
      (Date.now() - snapshot.createdAt.getTime()) / (1000 * 60);

    if (ageMinutes > maxAgeMinutes) {
      return null; // Too old, regenerate
    }

    return {
      structuredContext: snapshot.structuredContext,
      llmPrompt: snapshot.llmReadyPrompt,
    };
  }

  /**
   * Get or generate user context (with caching)
   */
  async getUserContextForLLM(
    userId: string,
    contextType: string = 'general',
    useCache: boolean = true,
  ): Promise<{ structuredContext: Record<string, any>; llmPrompt: string }> {
    if (useCache) {
      const cached = await this.getLatestContext(userId, contextType);
      if (cached) return cached;
    }

    return this.generateUserContext(userId, contextType);
  }
}
