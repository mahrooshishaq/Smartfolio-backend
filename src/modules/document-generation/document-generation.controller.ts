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
import { DocumentGenerationService } from './document-generation.service';
import { GenerateDocumentDto } from './dto/generate-document.dto';

@ApiTags('Document Generation')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
@Controller('document-generation')
@UseGuards(JwtAuthGuard)
export class DocumentGenerationController {
  constructor(private readonly service: DocumentGenerationService) {}

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate a document (cover letter, email, or personal statement)',
    description: 'Returns the generated document content along with a documentId for retrieval.',
  })
  @ApiOkResponse({
    description: 'Document generated successfully',
    schema: {
      example: {
        documentId: 'uuid',
        title: 'Cover Letter — Acme Corp',
        content: 'Dear Hiring Manager...',
      },
    },
  })
  async generate(
    @Req() req: AuthenticatedRequest,
    @Body() dto: GenerateDocumentDto,
  ) {
    return this.service.generate(req.user.id, dto);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get the current user past generated documents' })
  async history(@Req() req: AuthenticatedRequest) {
    return this.service.getHistory(req.user.id);
  }
}
