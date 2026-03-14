import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ResumeController } from './resume.controller';
import { ResumeUploadService } from './services/resume-upload.service';
import { ResumeAnalysisService } from './services/resume-analysis.service';
import { ResumeStorageService } from './services/resume-storage.service';
import { Resume } from './entities/resume.entity';
import { ResumeAnalysis } from './entities/resume-analysis.entity';
import { AiModule } from '../ai/ai.module';
import { PythonBridgeModule } from '../python-bridge/python-bridge.module';
import { OnboardingModule } from '../onboarding/onboarding.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Resume, ResumeAnalysis]),
    // Store file in memory buffer so we can write to disk in the service
    MulterModule.register({ storage: memoryStorage() }),
    AiModule,
    PythonBridgeModule,
    OnboardingModule,   // gives us UserContextService
  ],
  controllers: [ResumeController],
  providers: [ResumeUploadService, ResumeAnalysisService, ResumeStorageService],
  exports: [ResumeStorageService],
})
export class ResumeModule {}
