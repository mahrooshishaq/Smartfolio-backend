import { IsString, IsOptional, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AnalyzeResumeDto {
  @ApiProperty({ example: 'uuid-of-uploaded-resume', description: 'ID returned from POST /resume/upload' })
  @IsString()
  resumeId: string;

  @ApiPropertyOptional({
    example: 'We are looking for a Senior NestJS developer with 3+ years experience in TypeScript...',
    description: 'Provide job description to trigger Lens A (targeted match). Omit for Lens B (general quality).',
    minLength: 50,
    maxLength: 10000,
  })
  @IsOptional()
  @IsString()
  @MinLength(50, { message: 'Job description must be at least 50 characters' })
  @MaxLength(10000)
  jobDescription?: string;

  @ApiPropertyOptional({ example: 'Senior Software Engineer', description: 'Job title (used in Lens A context)' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  jobTitle?: string;

  @ApiPropertyOptional({ example: 'Google', description: 'Company name (used in Lens A context)' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  company?: string;
}
