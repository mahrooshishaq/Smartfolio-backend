import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MockInterviewController } from './mock-interview.controller';
import { MockInterviewService } from './mock-interview.service';
import { InterviewSession } from './entities/interview-session.entity';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [TypeOrmModule.forFeature([InterviewSession]), AiModule],
  controllers: [MockInterviewController],
  providers: [MockInterviewService],
  exports: [MockInterviewService],
})
export class MockInterviewModule {}
