/**
 * Enums for structured user categorization
 * These enable consistent data storage and easy LLM context generation
 */

export enum UserGoalType {
  UNIVERSITY_SEARCH = 'university_search',
  COURSE_RECOMMENDATION = 'course_recommendation',
  JOB_MATCHING = 'job_matching',
  CAREER_GUIDANCE = 'career_guidance',
  SKILL_DEVELOPMENT = 'skill_development',
  RESUME_IMPROVEMENT = 'resume_improvement',
  INTERVIEW_PREPARATION = 'interview_preparation',
  NETWORKING = 'networking',
  SALARY_NEGOTIATION = 'salary_negotiation',
  CAREER_TRANSITION = 'career_transition',
}

export enum ExperienceLevel {
  STUDENT = 'student',
  RECENT_GRADUATE = 'recent_graduate',
  ENTRY_LEVEL = 'entry_level', // 0-2 years
  MID_LEVEL = 'mid_level', // 3-5 years
  SENIOR = 'senior', // 6-10 years
  LEAD = 'lead', // 10+ years
  EXECUTIVE = 'executive',
}

export enum EducationLevel {
  HIGH_SCHOOL = 'high_school',
  ASSOCIATE = 'associate',
  BACHELORS = 'bachelors',
  MASTERS = 'masters',
  PHD = 'phd',
  PROFESSIONAL_CERT = 'professional_cert',
  BOOTCAMP = 'bootcamp',
}

export enum IndustryType {
  TECHNOLOGY = 'technology',
  FINANCE = 'finance',
  HEALTHCARE = 'healthcare',
  EDUCATION = 'education',
  MARKETING = 'marketing',
  ENGINEERING = 'engineering',
  DESIGN = 'design',
  SALES = 'sales',
  CONSULTING = 'consulting',
  MANUFACTURING = 'manufacturing',
  RETAIL = 'retail',
  HOSPITALITY = 'hospitality',
  LEGAL = 'legal',
  MEDIA = 'media',
  REAL_ESTATE = 'real_estate',
  OTHER = 'other',
}

export enum CareerStage {
  EXPLORING = 'exploring', // Exploring options
  TRANSITIONING = 'transitioning', // Changing careers
  ADVANCING = 'advancing', // Moving up in current field
  PIVOTING = 'pivoting', // Shifting within industry
  RETURNING = 'returning', // Returning to workforce
}

export enum PersonalityTraitCategory {
  WORK_STYLE = 'work_style',
  COMMUNICATION = 'communication',
  PROBLEM_SOLVING = 'problem_solving',
  LEADERSHIP = 'leadership',
  LEARNING = 'learning',
  MOTIVATION = 'motivation',
}

export enum DataSourceType {
  ONBOARDING_QUIZ = 'onboarding_quiz',
  PERSONALITY_QUIZ = 'personality_quiz',
  RESUME_ANALYSIS = 'resume_analysis',
  SEARCH_BEHAVIOR = 'search_behavior',
  USER_INPUT = 'user_input',
  SYSTEM_INFERENCE = 'system_inference',
}
