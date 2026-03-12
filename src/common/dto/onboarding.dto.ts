import {
  IsEnum,
  IsArray,
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  Max,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  UserGoalType,
  ExperienceLevel,
  EducationLevel,
  IndustryType,
  CareerStage,
} from '../enums/user-enums';

// ─── Reusable enum descriptions (shown in Swagger) ───────────────────────────

const GOAL_DESCRIPTION = [
  'Pick 1–5 career goals (send as an array of strings). Available values:',
  '  • job_matching          – Match with relevant job postings',
  '  • resume_improvement    – Improve resume quality and ATS score',
  '  • career_guidance       – Get AI-powered personalised career advice',
  '  • skill_development     – Identify and track skills to develop',
  '  • interview_preparation – Prepare for upcoming job interviews',
  '  • university_search     – Find and compare universities/programs',
  '  • course_recommendation – Get personalised course/certification suggestions',
  '  • networking            – Build professional connections',
  '  • salary_negotiation    – Learn salary benchmarks and negotiation tactics',
  '  • career_transition     – Navigate a career change into a new field',
].join('\n');

const CAREER_STAGE_DESCRIPTION = [
  'Where you currently are in your career journey. Available values:',
  '  • exploring    – Still figuring out career options (e.g. student)',
  '  • advancing    – Moving up the ladder in your current field',
  '  • transitioning – Actively switching careers or industries',
  '  • pivoting     – Shifting to a different role within the same industry',
  '  • returning    – Returning to the workforce after a break',
].join('\n');

const EXPERIENCE_DESCRIPTION = [
  'Your professional experience level. Available values:',
  '  • student         – Currently enrolled as a student',
  '  • recent_graduate – Graduated within the last year, limited work exp',
  '  • entry_level     – 0–2 years of professional work experience',
  '  • mid_level       – 3–5 years of professional work experience',
  '  • senior          – 6–10 years of work experience',
  '  • lead            – 10+ years, leading a team or department',
  '  • executive       – C-level, VP, or Director position',
].join('\n');

const EDUCATION_DESCRIPTION = [
  'Highest level of education completed. Available values:',
  '  • high_school       – High school diploma or equivalent',
  '  • associate         – 2-year associate degree',
  "  • bachelors         – Bachelor's degree (4-year)",
  "  • masters           – Master's degree",
  '  • phd               – Doctoral degree',
  '  • professional_cert – Industry certification (AWS, PMP, CFA, etc.)',
  '  • bootcamp          – Coding bootcamp or intensive skills program',
].join('\n');

const INDUSTRY_DESCRIPTION = [
  'Industry sector. Available values:',
  '  technology • finance • healthcare • education • marketing',
  '  engineering • design • sales • consulting • manufacturing',
  '  retail • hospitality • legal • media • real_estate • other',
].join('\n');

// ─── DTOs ─────────────────────────────────────────────────────────────────────

/**
 * POST /onboarding/complete
 * Submit the initial career questionnaire.
 */
export class OnboardingDto {
  @ApiProperty({
    enum: UserGoalType,
    isArray: true,
    enumName: 'UserGoalType',
    example: [UserGoalType.JOB_MATCHING, UserGoalType.RESUME_IMPROVEMENT],
    description: GOAL_DESCRIPTION,
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Please select at least one goal' })
  @ArrayMaxSize(5, { message: 'Please select up to 5 goals' })
  @IsEnum(UserGoalType, { each: true })
  goals: UserGoalType[];

  @ApiProperty({
    enum: CareerStage,
    enumName: 'CareerStage',
    example: CareerStage.ADVANCING,
    description: CAREER_STAGE_DESCRIPTION,
  })
  @IsEnum(CareerStage)
  careerStage: CareerStage;

  @ApiProperty({
    enum: ExperienceLevel,
    enumName: 'ExperienceLevel',
    example: ExperienceLevel.MID_LEVEL,
    description: EXPERIENCE_DESCRIPTION,
  })
  @IsEnum(ExperienceLevel)
  experienceLevel: ExperienceLevel;

  @ApiPropertyOptional({
    example: 3,
    minimum: 0,
    maximum: 50,
    description: 'Total years of professional work experience (0–50). Use 0 for students.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  yearsOfExperience?: number;

  @ApiProperty({
    enum: EducationLevel,
    enumName: 'EducationLevel',
    example: EducationLevel.BACHELORS,
    description: EDUCATION_DESCRIPTION,
  })
  @IsEnum(EducationLevel)
  educationLevel: EducationLevel;

  @ApiProperty({
    enum: IndustryType,
    enumName: 'IndustryType',
    example: IndustryType.TECHNOLOGY,
    description: INDUSTRY_DESCRIPTION,
  })
  @IsEnum(IndustryType)
  currentIndustry: IndustryType;

  @ApiPropertyOptional({
    enum: IndustryType,
    enumName: 'IndustryType',
    example: IndustryType.FINANCE,
    description: 'Target industry to move into. Omit if staying in the same industry.',
  })
  @IsOptional()
  @IsEnum(IndustryType)
  targetIndustry?: IndustryType;

  @ApiPropertyOptional({
    example: 'Software Engineer',
    description: 'Current job title. Leave blank if student or unemployed.',
  })
  @IsOptional()
  @IsString()
  currentRole?: string;

  @ApiPropertyOptional({
    example: 'Senior Software Engineer',
    description: 'The role you are aiming for next.',
  })
  @IsOptional()
  @IsString()
  targetRole?: string;

  @ApiPropertyOptional({ example: 'Karachi, Pakistan', description: 'Current city and country.' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ example: true, description: 'Open to fully remote positions.' })
  @IsOptional()
  @IsBoolean()
  openToRemote?: boolean;

  @ApiPropertyOptional({ example: false, description: 'Willing to relocate to a different city.' })
  @IsOptional()
  @IsBoolean()
  willingToRelocate?: boolean;

  @ApiPropertyOptional({
    type: [String],
    example: ['TypeScript', 'NestJS', 'PostgreSQL', 'React'],
    description: 'Top technical or professional skills (up to 10). Personalises AI analysis.',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  skills?: string[];

  @ApiPropertyOptional({
    type: [String],
    example: ['AI/ML', 'Open Source', 'Fintech'],
    description: 'Professional interests or areas you want to grow in (up to 10).',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  interests?: string[];
}

/**
 * PUT /onboarding/profile
 * Update any profile fields after initial onboarding. All fields optional.
 * Only the fields you include will be updated.
 */
export class UpdateProfileDto {
  @ApiPropertyOptional({
    enum: CareerStage,
    enumName: 'CareerStage',
    example: CareerStage.ADVANCING,
    description: CAREER_STAGE_DESCRIPTION,
  })
  @IsOptional()
  @IsEnum(CareerStage)
  careerStage?: CareerStage;

  @ApiPropertyOptional({
    enum: ExperienceLevel,
    enumName: 'ExperienceLevel',
    example: ExperienceLevel.SENIOR,
    description: EXPERIENCE_DESCRIPTION,
  })
  @IsOptional()
  @IsEnum(ExperienceLevel)
  experienceLevel?: ExperienceLevel;

  @ApiPropertyOptional({
    enum: IndustryType,
    enumName: 'IndustryType',
    example: IndustryType.TECHNOLOGY,
    description: INDUSTRY_DESCRIPTION,
  })
  @IsOptional()
  @IsEnum(IndustryType)
  currentIndustry?: IndustryType;

  @ApiPropertyOptional({
    enum: IndustryType,
    enumName: 'IndustryType',
    example: IndustryType.FINANCE,
    description: 'Target industry to move into.',
  })
  @IsOptional()
  @IsEnum(IndustryType)
  targetIndustry?: IndustryType;

  @ApiPropertyOptional({ example: 'Software Engineer', description: 'Updated current job title' })
  @IsOptional()
  @IsString()
  currentRole?: string;

  @ApiPropertyOptional({ example: 'Senior Software Engineer', description: 'Updated target role' })
  @IsOptional()
  @IsString()
  targetRole?: string;

  @ApiPropertyOptional({ example: 'Karachi, Pakistan', description: 'Current city and country' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ example: 'Dubai, UAE', description: 'Preferred target city/country' })
  @IsOptional()
  @IsString()
  targetLocation?: string;

  @ApiPropertyOptional({ example: true, description: 'Open to remote positions' })
  @IsOptional()
  @IsBoolean()
  openToRemote?: boolean;

  @ApiPropertyOptional({ example: false, description: 'Willing to relocate' })
  @IsOptional()
  @IsBoolean()
  willingToRelocate?: boolean;

  @ApiPropertyOptional({
    type: [String],
    example: ['React', 'Node.js', 'Docker'],
    description: 'Updated skills list (replaces previous list)',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @ApiPropertyOptional({
    type: [String],
    example: ['Cloud Computing', 'DevOps'],
    description: 'Updated interests list (replaces previous list)',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interests?: string[];

  @ApiPropertyOptional({
    example: 'Passionate backend developer with a focus on scalable systems.',
    description: 'Short professional bio',
  })
  @IsOptional()
  @IsString()
  bio?: string;
}

/**
 * Response DTO — snapshot of the user's career profile
 */
export class UserContextDto {
  @ApiProperty({ example: 'c80d42ce-dfa3-41be-9676-599b58b93004' })
  userId: string;

  @ApiProperty({ example: 75, description: 'Profile completeness score (0–100)' })
  profileCompleteness: number;

  @ApiProperty({ enum: UserGoalType, isArray: true, example: [UserGoalType.JOB_MATCHING] })
  primaryGoals: UserGoalType[];

  @ApiProperty({ enum: ExperienceLevel, example: ExperienceLevel.MID_LEVEL })
  experienceLevel: ExperienceLevel;

  @ApiProperty({ enum: CareerStage, example: CareerStage.ADVANCING })
  careerStage: CareerStage;

  @ApiPropertyOptional({ example: 'Software Engineer' })
  currentRole?: string;

  @ApiPropertyOptional({ example: 'Senior Software Engineer' })
  targetRole?: string;

  @ApiPropertyOptional({ type: [String], example: ['TypeScript', 'NestJS'] })
  skills?: string[];

  @ApiProperty({ example: true })
  hasCompletedOnboarding: boolean;
}
