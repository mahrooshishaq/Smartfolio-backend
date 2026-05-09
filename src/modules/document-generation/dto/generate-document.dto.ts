import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsObject } from 'class-validator';
import { DocumentType } from '../entities/generated-document.entity';

export class GenerateDocumentDto {
  @ApiProperty({
    enum: DocumentType,
    description: 'Type of document to generate',
    example: DocumentType.COVER_LETTER,
  })
  @IsEnum(DocumentType)
  documentType: DocumentType;

  @ApiProperty({
    description:
      'Free-form fields for the document. Cover letter: { companyName, position, jobDescription?, highlights? }. Email: { recipient, subject, purpose, tone, keyPoints }. University statement: { universityName, program, motivation, achievements }.',
    example: {
      companyName: 'Acme Corp',
      position: 'Senior Frontend Engineer',
      jobDescription: 'We are hiring...',
      highlights: 'Led migration to React 18, mentored junior devs',
    },
  })
  @IsObject()
  @IsNotEmpty()
  formData: Record<string, any>;
}
