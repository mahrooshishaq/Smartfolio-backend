import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GroqService } from '../ai/groq.service';
import {
  GeneratedDocument,
  DocumentType,
} from './entities/generated-document.entity';
import { GenerateDocumentDto } from './dto/generate-document.dto';
import { UserProfile } from '../users/entities/user-profile.entity';
import { User } from '../users/user.entity';
import {
  COVER_LETTER_PROMPT,
  PROFESSIONAL_EMAIL_PROMPT,
  UNIVERSITY_STATEMENT_PROMPT,
} from './prompts/document.prompts';

@Injectable()
export class DocumentGenerationService {
  private readonly logger = new Logger(DocumentGenerationService.name);

  constructor(
    @InjectRepository(GeneratedDocument)
    private readonly docRepo: Repository<GeneratedDocument>,
    @InjectRepository(UserProfile)
    private readonly profileRepo: Repository<UserProfile>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly groq: GroqService,
  ) {}

  async generate(
    userId: string,
    dto: GenerateDocumentDto,
  ): Promise<{ documentId: string; content: string; title: string }> {
    this.validateFormData(dto.documentType, dto.formData);

    const [user, profile] = await Promise.all([
      this.userRepo.findOne({ where: { id: userId } }),
      this.profileRepo.findOne({ where: { userId } }),
    ]);

    const profileBlock = this.buildProfileBlock(user, profile);
    const systemPrompt = this.getSystemPrompt(dto.documentType);
    const userMessage = this.buildUserMessage(dto, profileBlock);

    const content = await this.groq.analyzeWithSystemPrompt(
      systemPrompt,
      userMessage,
      { temperature: 0.7, maxTokens: 1500 },
    );

    const cleaned = content.trim();
    const title = this.buildTitle(dto.documentType, dto.formData);

    const saved = await this.docRepo.save(
      this.docRepo.create({
        userId,
        documentType: dto.documentType,
        formData: dto.formData,
        content: cleaned,
        title,
      }),
    );

    return { documentId: saved.id, content: cleaned, title };
  }

  async getHistory(userId: string) {
    const docs = await this.docRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    return docs.map((d) => ({
      id: d.id,
      documentType: d.documentType,
      title: d.title,
      preview: d.content.slice(0, 200),
      createdAt: d.createdAt,
    }));
  }

  async getDocumentDetail(userId: string, docId: string) {
    const doc = await this.docRepo.findOne({ where: { id: docId } });
    if (!doc) throw new NotFoundException('Document not found.');
    if (doc.userId !== userId) throw new ForbiddenException('Access denied.');
    return doc;
  }

  // ─── helpers ──────────────────────────────────────────────────────────
  private validateFormData(type: DocumentType, data: Record<string, any>) {
    const requiredByType: Record<DocumentType, string[]> = {
      [DocumentType.COVER_LETTER]: ['companyName', 'position'],
      [DocumentType.PROFESSIONAL_EMAIL]: ['recipient', 'purpose'],
      [DocumentType.UNIVERSITY_STATEMENT]: ['universityName', 'program', 'motivation'],
    };
    const required = requiredByType[type];
    const missing = required.filter((f) => !data[f] || String(data[f]).trim().length === 0);
    if (missing.length > 0) {
      throw new BadRequestException(`Missing required fields: ${missing.join(', ')}`);
    }
  }

  private getSystemPrompt(type: DocumentType): string {
    switch (type) {
      case DocumentType.COVER_LETTER:
        return COVER_LETTER_PROMPT;
      case DocumentType.PROFESSIONAL_EMAIL:
        return PROFESSIONAL_EMAIL_PROMPT;
      case DocumentType.UNIVERSITY_STATEMENT:
        return UNIVERSITY_STATEMENT_PROMPT;
    }
  }

  private buildProfileBlock(user: User | null, profile: UserProfile | null): string {
    const lines: string[] = [];
    if (user?.name) lines.push(`Name: ${user.name}`);
    if (profile) {
      if (profile.currentRole) lines.push(`Current Role: ${profile.currentRole}`);
      if (profile.targetRole) lines.push(`Target Role: ${profile.targetRole}`);
      if (profile.experienceLevel) lines.push(`Experience Level: ${profile.experienceLevel}`);
      if (profile.yearsOfExperience != null) lines.push(`Years of Experience: ${profile.yearsOfExperience}`);
      if (profile.educationLevel) lines.push(`Education: ${profile.educationLevel}`);
      if (profile.skills?.length) lines.push(`Skills: ${profile.skills.join(', ')}`);
      if (profile.interests?.length) lines.push(`Interests: ${profile.interests.join(', ')}`);
      if (profile.location) lines.push(`Location: ${profile.location}`);
    }
    return lines.length > 0
      ? `Applicant profile:\n${lines.join('\n')}`
      : 'Applicant profile: (not yet completed)';
  }

  private buildUserMessage(dto: GenerateDocumentDto, profileBlock: string): string {
    const { documentType, formData } = dto;
    const formBlock = `Form details:\n${Object.entries(formData)
      .filter(([_, v]) => v != null && String(v).trim().length > 0)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n')}`;
    return `${profileBlock}\n\n${formBlock}\n\nGenerate the ${documentType.replace('_', ' ')} now.`;
  }

  private buildTitle(type: DocumentType, data: Record<string, any>): string {
    switch (type) {
      case DocumentType.COVER_LETTER:
        return `Cover Letter — ${data.companyName ?? 'Untitled'}`;
      case DocumentType.PROFESSIONAL_EMAIL:
        return `Email — ${data.subject || data.purpose?.slice(0, 40) || 'Untitled'}`;
      case DocumentType.UNIVERSITY_STATEMENT:
        return `Personal Statement — ${data.universityName ?? 'Untitled'}`;
    }
  }
}
