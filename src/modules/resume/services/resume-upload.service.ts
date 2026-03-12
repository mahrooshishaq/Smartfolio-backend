import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Resume } from '../entities/resume.entity';

@Injectable()
export class ResumeUploadService {
  private readonly uploadDir: string;
  private readonly maxFileSizeBytes: number;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Resume)
    private readonly resumeRepository: Repository<Resume>,
  ) {
    const dir = this.configService.get<string>('UPLOAD_DIR') ?? 'uploads';
    this.uploadDir = path.resolve(process.cwd(), dir);
    this.maxFileSizeBytes =
      (this.configService.get<number>('MAX_FILE_SIZE_MB') ?? 5) * 1024 * 1024;

    // Ensure the upload directory exists
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async saveUpload(
    userId: string,
    file: Express.Multer.File,
  ): Promise<Resume> {
    this.validateFile(file);

    const uniqueFileName = this.buildFileName(userId, file.originalname);
    const destPath = path.join(this.uploadDir, uniqueFileName);

    try {
      fs.writeFileSync(destPath, file.buffer);
    } catch {
      throw new InternalServerErrorException('Failed to save uploaded file.');
    }

    const resume = this.resumeRepository.create({
      userId,
      originalFileName: file.originalname,
      filePath: destPath,
      fileSizeBytes: file.size,
      isExtracted: false,
    });

    return this.resumeRepository.save(resume);
  }

  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No file provided.');
    }
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Only PDF files are accepted.');
    }
    if (file.size > this.maxFileSizeBytes) {
      const maxMb = this.maxFileSizeBytes / (1024 * 1024);
      throw new BadRequestException(
        `File size exceeds the ${maxMb}MB limit.`,
      );
    }
  }

  private buildFileName(userId: string, originalName: string): string {
    const timestamp = Date.now();
    const ext = path.extname(originalName);
    return `${userId}_${timestamp}${ext}`;
  }
}
