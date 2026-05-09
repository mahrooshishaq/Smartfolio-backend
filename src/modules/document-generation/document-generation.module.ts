import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentGenerationController } from './document-generation.controller';
import { DocumentGenerationService } from './document-generation.service';
import { GeneratedDocument } from './entities/generated-document.entity';
import { UserProfile } from '../users/entities/user-profile.entity';
import { User } from '../users/user.entity';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([GeneratedDocument, UserProfile, User]),
    AiModule,
  ],
  controllers: [DocumentGenerationController],
  providers: [DocumentGenerationService],
  exports: [DocumentGenerationService],
})
export class DocumentGenerationModule {}
