import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ProfileModule } from './modules/profile/profile.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { ResumeModule } from './modules/resume/resume.module';
import { ScheduleModule } from '@nestjs/schedule';
import { ScraperModule } from './modules/scraper/scraper.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { CoursesModule } from './modules/courses/courses.module';
import { MockInterviewModule } from './modules/mock-interview/mock-interview.module';
import { DocumentGenerationModule } from './modules/document-generation/document-generation.module';

@Module({
  imports: [
    ConfigModule.forRoot({ 
      isGlobal: true,
      envFilePath: '.env',
    }), 
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isProd = config.get<string>('NODE_ENV') === 'production';
        return {
          type: 'postgres',
          host: config.get<string>('DB_HOST'),
          port: config.get<number>('DB_PORT'),
          username: config.get<string>('DB_USERNAME'),
          password: config.get<string>('DB_PASSWORD'),
          database: config.get<string>('DB_NAME') || config.get<string>('DB_DATABASE'),
          entities: [__dirname + '/modules/**/*.entity{.ts,.js}'],
          synchronize: true, // Enabled for automatic table creation
          logging: config.get<string>('NODE_ENV') === 'development',
          ssl: isProd ? { rejectUnauthorized: false } : false,
        };
      },
    }),
    UsersModule,
    AuthModule,
    ProfileModule,
    OnboardingModule,
    ResumeModule,
    ScraperModule,
    ScheduleModule.forRoot(),
    JobsModule,
    CoursesModule,
    MockInterviewModule,
    DocumentGenerationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
