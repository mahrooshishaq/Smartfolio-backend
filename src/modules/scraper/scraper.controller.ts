import { Controller, Post, Get, Param, Body, UseGuards, Req } from '@nestjs/common';
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

  // ─── POST /scraper/search — Custom query search ─────────────────────────────
  @Post('search')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Search and scrape for a custom query',
    description: 'Scrapes jobs/courses for a user-typed search query. Results are ADDED to existing data.',
  })
  async searchScraper(
    @Req() req: any,
    @Body() body: { query: string; type?: 'jobs' | 'courses' | 'both' },
  ) {
    const userId = req.user.id;
    return this.scraperService.runCustomSearch(userId, body.query, body.type || 'both');
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
  @ApiOperation({ summary: 'Get scraped results for a user.',   
    description: 'Returned fields for courses: title, instructor, platform, category, level, duration, price, rating, language, description, course_url, thumbnail, scraped_at, source. Returned fields for jobs:title, company, location, salary_min, salary_max, job_type, experience_level, category, country, source, apply_url, scraped_at ' })
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