import { Controller, Get, Query, Param, UseGuards, Req } from '@nestjs/common';
import { JobsService, JobFilters } from './jobs.service';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Jobs')
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  // ─── GET /jobs/me ─────────────────────────────────────────────────────────
  // Primary endpoint — personalized jobs for the logged-in user
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get personalized jobs for logged-in user' })
  @ApiQuery({ name: 'search',           required: false })
  @ApiQuery({ name: 'location',         required: false })
  @ApiQuery({ name: 'country',          required: false })
  @ApiQuery({ name: 'job_type',         required: false, enum: ['Full Time', 'Part Time', 'Remote', 'Hybrid', 'Onsite', 'Contract', 'Internship'] })
  @ApiQuery({ name: 'experience_level', required: false })
  @ApiQuery({ name: 'category',         required: false })
  @ApiQuery({ name: 'source',           required: false })
  @ApiQuery({ name: 'salary_min',       required: false, type: Number })
  @ApiQuery({ name: 'salary_max',       required: false, type: Number })
  @ApiQuery({ name: 'page',             required: false, type: Number })
  @ApiQuery({ name: 'limit',            required: false, type: Number })
  getMyJobs(@Req() req: any, @Query() filters: JobFilters) {
    return this.jobsService.getUserJobsFiltered(req.user.id, filters);
  }

  // ─── GET /jobs/me/stats ───────────────────────────────────────────────────
  @Get('me/stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get job stats for logged-in user' })
  getMyStats(@Req() req: any) {
    return this.jobsService.getUserStats(req.user.id);
  }

  // ─── GET /jobs/me/filters ─────────────────────────────────────────────────
  @Get('me/filters')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get available filter options for logged-in user jobs' })
  getMyFilters(@Req() req: any) {
    return this.jobsService.getUserFilterOptions(req.user.id);
  }

  // ─── GET /jobs/user/:userId ───────────────────────────────────────────────
  // Admin endpoint
  @Get('user/:userId')
  @ApiOperation({ summary: 'Admin: get personalized jobs for any user' })
  @ApiQuery({ name: 'page',  required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getUserJobs(@Param('userId') userId: string, @Query() filters: JobFilters) {
    return this.jobsService.getUserJobsFiltered(userId, filters);
  }
}