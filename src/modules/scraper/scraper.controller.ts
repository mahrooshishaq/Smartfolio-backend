import { Controller, Post, Get, Param, UseGuards, Req } from '@nestjs/common';
import { ScraperService } from './scraper.service';
import { JobsService } from '../jobs/jobs.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Scraper')
@Controller('scraper')
export class ScraperController {
  constructor(
    private readonly scraperService: ScraperService,
    private readonly jobsService: JobsService,
  ) {}

  // ─── POST /scraper/run ───────────────────────────────────────────────────────
  @Post('run')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Run personalized scraper for logged-in user',
    description: 'Reads user onboarding profile, generates targeted queries via AI, scrapes relevant jobs and courses, saves to user-specific file',
  })
  async runScraper(@Req() req: any) {
    const userId = req.user.id;
    return this.scraperService.runForUser(userId);
  }

  // ─── POST /scraper/run/:userId ───────────────────────────────────────────────
  @Post('run/:userId')
  @ApiOperation({ summary: 'Admin: run scraper for a specific user by ID' })
  async runScraperForUser(@Param('userId') userId: string) {
    return this.scraperService.runForUser(userId);
  }

  // ─── GET /scraper/results/:userId ────────────────────────────────────────────
  // Returns normalized jobs (categories fixed) + raw courses
  @Get('results/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get scraped results for a user (jobs are normalized)' })
  getResults(@Param('userId') userId: string) {
    const raw = this.scraperService.getUserResults(userId);
    if (!raw) {
      return { message: 'No results yet. Please run POST /scraper/run first.' };
    }

    // FIX #1: Return normalized jobs instead of raw JSON jobs
    const normalizedJobs = this.jobsService.getUserJobs(userId);

    return {
      jobs:    normalizedJobs,
      courses: raw.courses || [],
    };
  }
}