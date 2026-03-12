import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiUnauthorizedResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';
import { ResumeUploadService } from './services/resume-upload.service';
import { ResumeAnalysisService } from './services/resume-analysis.service';
import { ResumeStorageService } from './services/resume-storage.service';
import { AnalyzeResumeDto } from './dto/analyze-resume.dto';
import { AnalysisResponseDto } from './dto/analysis-response.dto';

@ApiTags('Resume')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
@Controller('resume')
@UseGuards(JwtAuthGuard)
export class ResumeController {
  constructor(
    private readonly uploadService: ResumeUploadService,
    private readonly analysisService: ResumeAnalysisService,
    private readonly storageService: ResumeStorageService,
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Upload a resume PDF',
    description: 'Upload a PDF resume (max 5MB). Returns a resumeId to use with POST /resume/analyze.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'PDF file only, max 5MB',
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Resume uploaded. Use resumeId to analyze.',
    schema: {
      example: {
        resumeId: 'uuid-here',
        fileName: 'my-resume.pdf',
        message: 'Resume uploaded successfully. Use the resumeId to run analysis.',
      },
    },
  })
  async uploadResume(
    @Req() req: AuthenticatedRequest,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ resumeId: string; fileName: string; message: string }> {
    const resume = await this.uploadService.saveUpload(req.user.id, file);
    return {
      resumeId: resume.id,
      fileName: resume.originalFileName,
      message: 'Resume uploaded successfully. Use the resumeId to run analysis.',
    };
  }

  @Post('analyze')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Analyze a resume (Lens A or Lens B)',
    description:
      '**Lens A (Targeted):** Provide `jobDescription` to score resume against a specific JD. Weights: relevance 35%, ATS 20%, skills 15%, experience 15%, achievement 10%, formatting 5%.\n\n' +
      '**Lens B (General):** Omit `jobDescription` for market-readiness scoring. Weights: ATS 25%, content quality 20%, experience 20%, skills 15%, achievement 10%, structure 10%.',
  })
  @ApiOkResponse({ description: 'Analysis result with scores and actionable remarks', type: AnalysisResponseDto })
  async analyzeResume(
    @Req() req: AuthenticatedRequest,
    @Body() dto: AnalyzeResumeDto,
  ): Promise<AnalysisResponseDto> {
    return this.analysisService.analyze(req.user.id, dto);
  }

  @Get('analyses')
  @ApiOperation({
    summary: 'Get all analyses for current user',
    description: 'Returns the full analysis history (Lens A and B) across all uploaded resumes.',
  })
  @ApiOkResponse({ description: 'List of all analyses', type: [AnalysisResponseDto] })
  async getMyAnalyses(
    @Req() req: AuthenticatedRequest,
  ): Promise<AnalysisResponseDto[]> {
    const analyses = await this.storageService.getAnalysesForUser(req.user.id);
    return analyses.map((a) => this.storageService.toResponseDto(a));
  }

  @Get(':resumeId/analyses')
  @ApiOperation({
    summary: 'Get all analyses for a specific resume',
    description: 'Returns analysis history for a single uploaded resume by its ID.',
  })
  @ApiOkResponse({ description: 'List of analyses for the resume', type: [AnalysisResponseDto] })
  async getAnalysesForResume(
    @Req() req: AuthenticatedRequest,
    @Param('resumeId') resumeId: string,
  ): Promise<AnalysisResponseDto[]> {
    const resume = await this.storageService.findResumeById(resumeId);
    if (!resume || resume.userId !== req.user.id) {
      return [];
    }
    const analyses = await this.storageService.getAnalysesForResume(resumeId);
    return analyses.map((a) => this.storageService.toResponseDto(a));
  }
}
