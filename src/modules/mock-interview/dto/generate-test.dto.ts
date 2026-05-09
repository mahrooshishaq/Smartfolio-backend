import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class GenerateTestDto {
  @ApiProperty({
    description: 'The job description to base the screening test on',
    example: 'We are hiring a Senior Frontend Engineer with strong React, TypeScript, and Next.js experience...',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(20, { message: 'Job description must be at least 20 characters long' })
  jobDescription: string;
}
