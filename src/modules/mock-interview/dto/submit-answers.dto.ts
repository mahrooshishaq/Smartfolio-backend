import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class InterviewAnswerDto {
  @ApiProperty({ description: 'The question ID (1-based)', example: 1 })
  @IsNotEmpty()
  questionId: number;

  @ApiProperty({
    description: 'The user answer — option index for MCQ, free text for others',
    example: 'I would prioritize the highest-impact bugs first...',
  })
  @IsNotEmpty()
  answer: string | number;
}

export class SubmitAnswersDto {
  @ApiProperty({ description: 'The interview session ID returned from /generate', example: 'uuid-here' })
  @IsUUID()
  sessionId: string;

  @ApiProperty({ description: 'Array of answers, one per question', type: [InterviewAnswerDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InterviewAnswerDto)
  answers: InterviewAnswerDto[];
}
