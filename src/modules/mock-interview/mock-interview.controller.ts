import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';
import { MockInterviewService } from './mock-interview.service';
import { GenerateTestDto } from './dto/generate-test.dto';
import { SubmitAnswersDto } from './dto/submit-answers.dto';

@ApiTags('Mock Interview')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
@Controller('mock-interview')
@UseGuards(JwtAuthGuard)
export class MockInterviewController {
  constructor(private readonly service: MockInterviewService) {}

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate a screening test from a job description',
    description: 'Returns 8 questions (4 MCQs, 3 short answers, 1 scenario) plus a sessionId to use in /submit.',
  })
  @ApiOkResponse({
    description: 'Test generated successfully',
    schema: {
      example: {
        sessionId: 'uuid',
        questions: [
          { id: 1, type: 'mcq', question: '...', options: ['A', 'B', 'C', 'D'] },
        ],
      },
    },
  })
  async generate(
    @Req() req: AuthenticatedRequest,
    @Body() dto: GenerateTestDto,
  ) {
    return this.service.generateTest(req.user.id, dto);
  }

  @Post('submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Submit answers and get evaluation',
    description: 'Returns overall score, per-question feedback, and improvement tips.',
  })
  async submit(
    @Req() req: AuthenticatedRequest,
    @Body() dto: SubmitAnswersDto,
  ) {
    return this.service.submitAnswers(req.user.id, dto);
  }

  @Get('sessions')
  @ApiOperation({ summary: 'Get current user past interview sessions' })
  async listSessions(@Req() req: AuthenticatedRequest) {
    return this.service.getUserSessions(req.user.id);
  }
}
