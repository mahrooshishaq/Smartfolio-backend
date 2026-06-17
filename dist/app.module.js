"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const users_module_1 = require("./modules/users/users.module");
const auth_module_1 = require("./modules/auth/auth.module");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const config_1 = require("@nestjs/config");
const profile_module_1 = require("./modules/profile/profile.module");
const onboarding_module_1 = require("./modules/onboarding/onboarding.module");
const resume_module_1 = require("./modules/resume/resume.module");
const schedule_1 = require("@nestjs/schedule");
const scraper_module_1 = require("./modules/scraper/scraper.module");
const jobs_module_1 = require("./modules/jobs/jobs.module");
const courses_module_1 = require("./modules/courses/courses.module");
const mock_interview_module_1 = require("./modules/mock-interview/mock-interview.module");
const document_generation_module_1 = require("./modules/document-generation/document-generation.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: '.env',
            }),
            typeorm_1.TypeOrmModule.forRootAsync({
                inject: [config_1.ConfigService],
                useFactory: (config) => {
                    const isProd = config.get('NODE_ENV') === 'production';
                    return {
                        type: 'postgres',
                        host: config.get('DB_HOST'),
                        port: config.get('DB_PORT'),
                        username: config.get('DB_USERNAME'),
                        password: config.get('DB_PASSWORD'),
                        database: config.get('DB_NAME') || config.get('DB_DATABASE'),
                        entities: [__dirname + '/modules/**/*.entity{.ts,.js}'],
                        synchronize: true, // Enabled for automatic table creation
                        logging: config.get('NODE_ENV') === 'development',
                        ssl: isProd ? { rejectUnauthorized: false } : false,
                    };
                },
            }),
            users_module_1.UsersModule,
            auth_module_1.AuthModule,
            profile_module_1.ProfileModule,
            onboarding_module_1.OnboardingModule,
            resume_module_1.ResumeModule,
            scraper_module_1.ScraperModule,
            schedule_1.ScheduleModule.forRoot(),
            jobs_module_1.JobsModule,
            courses_module_1.CoursesModule,
            mock_interview_module_1.MockInterviewModule,
            document_generation_module_1.DocumentGenerationModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService],
    })
], AppModule);
