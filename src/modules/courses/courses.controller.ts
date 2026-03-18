import { Controller, Get, Query, Param, UseGuards, Req } from '@nestjs/common';
import { CoursesService, CourseFilters } from './courses.service';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Courses')
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  // ─── GET /courses/me ──────────────────────────────────────────────────────
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get personalized courses for logged-in user' })
  @ApiQuery({ name: 'search',   required: false })
  @ApiQuery({ name: 'platform', required: false, enum: ['edX', 'YouTube', 'Coursera', 'Udemy'] })
  @ApiQuery({ name: 'level',    required: false, enum: ['Beginner', 'Intermediate', 'Advanced', 'All Levels'] })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'price',    required: false, enum: ['Free', 'Paid'] })
  @ApiQuery({ name: 'language', required: false })
  @ApiQuery({ name: 'page',     required: false, type: Number })
  @ApiQuery({ name: 'limit',    required: false, type: Number })
  getMyCourses(@Req() req: any, @Query() filters: CourseFilters) {
    return this.coursesService.getUserCoursesFiltered(req.user.id, filters);
  }

  // ─── GET /courses/me/stats ────────────────────────────────────────────────
  @Get('me/stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get course stats for logged-in user'
   })
  getMyStats(@Req() req: any) {
    return this.coursesService.getUserStats(req.user.id);
  }

  // ─── GET /courses/me/filters ──────────────────────────────────────────────
  @Get('me/filters')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get available filter options for logged-in user courses' })
  getMyFilters(@Req() req: any) {
    return this.coursesService.getUserFilterOptions(req.user.id);
  }

  // ─── GET /courses/user/:userId — admin ────────────────────────────────────
  @Get('user/:userId')
  @ApiOperation({ summary: 'Admin: get personalized courses for any user' })
  @ApiQuery({ name: 'page',  required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getUserCourses(@Param('userId') userId: string, @Query() filters: CourseFilters) {
    return this.coursesService.getUserCoursesFiltered(userId, filters);
  }
}
