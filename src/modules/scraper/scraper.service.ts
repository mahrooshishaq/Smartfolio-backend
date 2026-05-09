import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';
import { UserProfile } from '../users/entities/user-profile.entity';
import { UserGoal } from '../users/entities/user-goal.entity';
import { User } from '../users/user.entity';
import { QueryGeneratorService, GeneratedQueries } from './query-generator.service';

const execAsync = promisify(exec);

export interface ScraperRunResult {
  userId: string;
  status: 'success' | 'partial' | 'failed';
  jobs_found: number;
  courses_found: number;
  platforms_scraped: string[];
  errors: string[];
  file_path: string;
}

@Injectable()
export class ScraperService {
  private readonly logger = new Logger(ScraperService.name);
  private readonly scrapersDir = path.join(__dirname, '../../../src/scrapers');
  private readonly dataDir = path.join(__dirname, '../../../src/data');
  private readonly venvPython = process.platform === 'win32'
    ? path.join(__dirname, '../../../src/scrapers/venv/Scripts/python.exe')
    : path.join(__dirname, '../../../src/scrapers/venv/bin/python3');

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserProfile)
    private userProfileRepository: Repository<UserProfile>,
    @InjectRepository(UserGoal)
    private userGoalRepository: Repository<UserGoal>,
    private readonly queryGenerator: QueryGeneratorService,
  ) {}

  async runForUser(userId: string): Promise<ScraperRunResult> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const profile = await this.userProfileRepository.findOne({ where: { userId } });
    if (!profile) throw new NotFoundException('User has not completed onboarding');

    const goals = await this.userGoalRepository.find({
      where: { userId, isActive: true },
      order: { priority: 'ASC' },
    });

    const fullProfile = {
      goals: goals.map(g => g.goalType),
      careerStage: profile.careerStage,
      experienceLevel: profile.experienceLevel,
      yearsOfExperience: profile.yearsOfExperience,
      currentRole: profile.currentRole,
      targetRole: profile.targetRole,
      currentIndustry: profile.currentIndustry,
      targetIndustry: profile.targetIndustry,
      location: profile.location,
      openToRemote: profile.openToRemote,
      willingToRelocate: profile.willingToRelocate,
      skills: profile.skills,
      interests: profile.interests,
    };

    this.logger.log(`Generating queries for user ${userId}`);
    const queries = await this.queryGenerator.generateQueries(fullProfile);
    this.logger.log(`Queries: ${JSON.stringify(queries)}`);

    const userDataDir = path.join(this.dataDir, 'users');
    if (!fs.existsSync(userDataDir)) {
      fs.mkdirSync(userDataDir, { recursive: true });
    }

    const outputFile = path.join(userDataDir, `${userId}.json`);
    const tempDir = path.join(userDataDir, `${userId}_tmp`);
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const result: ScraperRunResult = {
      userId,
      status: 'success',
      jobs_found: 0,
      courses_found: 0,
      platforms_scraped: [],
      errors: [],
      file_path: outputFile,
    };

    // Run job and course scrapers IN PARALLEL (each to its own temp file)
    const [jobResults, courseResults] = await Promise.all([
      this.runJobScrapers(queries, userId, tempDir),
      this.runCourseScrapers(queries, userId, tempDir),
    ]);

    result.platforms_scraped.push(...jobResults.platforms, ...courseResults.platforms);
    result.errors.push(...jobResults.errors, ...courseResults.errors);

    // Merge all temp files into the final user JSON
    this.mergeResults(tempDir, outputFile);

    // Clean up temp dir
    fs.rmSync(tempDir, { recursive: true, force: true });

    // Count from final merged file
    const counts = this.countFromFile(outputFile);
    result.jobs_found = counts.jobs;
    result.courses_found = counts.courses;

    if (result.errors.length > 0 && result.jobs_found === 0 && result.courses_found === 0) {
      result.status = 'failed';
    } else if (result.errors.length > 0) {
      result.status = 'partial';
    }

    this.logger.log(
      `Scraper finished for ${userId}: ${result.jobs_found} jobs, ${result.courses_found} courses`,
    );
    return result;
  }

  // ─── Merge all temp JSON files into final user file (APPENDS to existing) ───
  private mergeResults(tempDir: string, outputFile: string) {
    // Start with existing data so we never lose previous results
    const merged = { jobs: [] as any[], courses: [] as any[] };
    const seenJobUrls = new Set<string>();
    const seenCourseUrls = new Set<string>();

    // Load existing user data first
    if (fs.existsSync(outputFile)) {
      try {
        const existing = JSON.parse(fs.readFileSync(outputFile, 'utf-8'));
        for (const job of existing.jobs || []) {
          const key = job.apply_url || job.title;
          if (key && !seenJobUrls.has(key)) {
            seenJobUrls.add(key);
            merged.jobs.push(job);
          }
        }
        for (const course of existing.courses || []) {
          const key = course.course_url || course.title;
          if (key && !seenCourseUrls.has(key)) {
            seenCourseUrls.add(key);
            merged.courses.push(course);
          }
        }
        this.logger.log(`Loaded existing data: ${merged.jobs.length} jobs, ${merged.courses.length} courses`);
      } catch (e) {
        this.logger.warn(`Failed to read existing file, starting fresh: ${e}`);
      }
    }

    // Append new scraped results (deduped)
    const files = fs.readdirSync(tempDir).filter(f => f.endsWith('.json'));
    for (const file of files) {
      try {
        const raw = fs.readFileSync(path.join(tempDir, file), 'utf-8');
        const data = JSON.parse(raw);

        for (const job of data.jobs || []) {
          const key = job.apply_url || job.title;
          if (key && !seenJobUrls.has(key)) {
            seenJobUrls.add(key);
            merged.jobs.push(job);
          }
        }
        for (const course of data.courses || []) {
          const key = course.course_url || course.title;
          if (key && !seenCourseUrls.has(key)) {
            seenCourseUrls.add(key);
            merged.courses.push(course);
          }
        }
      } catch (e) {
        this.logger.warn(`Failed to parse temp file ${file}: ${e}`);
      }
    }

    fs.writeFileSync(outputFile, JSON.stringify(merged, null, 2));
    this.logger.log(`Merged ${merged.jobs.length} jobs, ${merged.courses.length} courses → ${outputFile}`);
  }

  // ─── Count from final file ───────────────────────────────────────────────────
  private countFromFile(filePath: string): { jobs: number; courses: number } {
    try {
      if (!fs.existsSync(filePath)) return { jobs: 0, courses: 0 };
      const raw = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(raw);
      return {
        jobs:    Array.isArray(data.jobs)    ? data.jobs.length    : 0,
        courses: Array.isArray(data.courses) ? data.courses.length : 0,
      };
    } catch {
      return { jobs: 0, courses: 0 };
    }
  }

  // ─── Run Job Scrapers IN PARALLEL (each writes to its own temp file) ─────────
  private async runJobScrapers(queries: GeneratedQueries, userId: string, tempDir: string) {
    const platforms: string[] = [];
    const errors: string[] = [];

    const platformQueries: Record<string, string[]> = {
      rozee: [], adzuna: [], jsearch: [],
    };

    for (const q of queries.job_queries) {
      for (const platform of q.platforms) {
        if (platformQueries[platform]) platformQueries[platform].push(q.query);
      }
    }

    const scraperPromises = Object.entries(platformQueries)
      .filter(([_, queryList]) => queryList.length > 0)
      .map(async ([platform, queryList]) => {
        const scraperFile = this.getScraperFile(platform);
        if (!scraperFile) return;

        // Each scraper writes to its OWN temp file to avoid race conditions
        const tempFile = path.join(tempDir, `${platform}.json`);

        try {
          const queriesArg = queryList.join(',');
          const cmd = `"${this.venvPython}" "${scraperFile}" --queries "${queriesArg}" --output "${tempFile}" --mode append`;
          this.logger.log(`[PARALLEL] Starting ${platform} scraper: ${cmd}`);
          await execAsync(cmd, { timeout: 300_000 });
          platforms.push(platform);
          this.logger.log(`[PARALLEL] ${platform} scraper done`);
        } catch (error) {
          this.logger.error(`${platform} failed: ${error instanceof Error ? error.message : String(error)}`);
          errors.push(`${platform}: ${error instanceof Error ? error.message : String(error)}`);
        }
      });

    await Promise.all(scraperPromises);
    return { platforms, errors };
  }

  // ─── Run Course Scrapers IN PARALLEL (each writes to its own temp file) ──────
  private async runCourseScrapers(queries: GeneratedQueries, userId: string, tempDir: string) {
    const platforms: string[] = [];
    const errors: string[] = [];

    const platformQueries: Record<string, string[]> = {
      edx: [], youtube: [],
    };

    for (const q of queries.course_queries) {
      for (const platform of q.platforms) {
        if (platformQueries[platform]) platformQueries[platform].push(q.query);
      }
    }

    const scraperPromises = Object.entries(platformQueries)
      .filter(([_, queryList]) => queryList.length > 0)
      .map(async ([platform, queryList]) => {
        const scraperFile = this.getScraperFile(platform);
        if (!scraperFile) return;

        const tempFile = path.join(tempDir, `${platform}.json`);

        try {
          const queriesArg = queryList.join(',');
          const cmd = `"${this.venvPython}" "${scraperFile}" --queries "${queriesArg}" --output "${tempFile}" --mode append`;
          this.logger.log(`[PARALLEL] Starting ${platform} scraper: ${cmd}`);
          await execAsync(cmd, { timeout: 180_000 });
          platforms.push(platform);
          this.logger.log(`[PARALLEL] ${platform} scraper done`);
        } catch (error) {
          this.logger.error(`${platform} failed: ${error instanceof Error ? error.message : String(error)}`);
          errors.push(`${platform}: ${error instanceof Error ? error.message : String(error)}`);
        }
      });

    await Promise.all(scraperPromises);
    return { platforms, errors };
  }

  // ─── Get Scraper File Path ───────────────────────────────────────────────────
  private getScraperFile(platform: string): string | null {
    const map: Record<string, string> = {
      rozee:   path.join(this.scrapersDir, 'rozee.scraper.py'),
      adzuna:  path.join(this.scrapersDir, 'adzuna.scraper.py'),
      jsearch: path.join(this.scrapersDir, 'jsearch.scraper.py'),
      edx:     path.join(this.scrapersDir, 'edX_scraper.py'),
      youtube: path.join(this.scrapersDir, 'youtube_courses.scraper.py'),
    };
    return map[platform] || null;
  }

  // ─── Run custom search query (user-typed) — APPENDS to existing data ────────
  async runCustomSearch(
    userId: string,
    query: string,
    type: 'jobs' | 'courses' | 'both' = 'both',
  ): Promise<ScraperRunResult> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    this.logger.log(`Custom search for user ${userId}: "${query}" (type: ${type})`);

    const userDataDir = path.join(this.dataDir, 'users');
    if (!fs.existsSync(userDataDir)) fs.mkdirSync(userDataDir, { recursive: true });

    const outputFile = path.join(userDataDir, `${userId}.json`);
    const tempDir = path.join(userDataDir, `${userId}_tmp`);
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const result: ScraperRunResult = {
      userId,
      status: 'success',
      jobs_found: 0,
      courses_found: 0,
      platforms_scraped: [],
      errors: [],
      file_path: outputFile,
    };

    // Build queries from the user's raw search string
    const queries: GeneratedQueries = {
      job_queries: type !== 'courses'
        ? [{ query, platforms: ['adzuna', 'jsearch'] }]
        : [],
      course_queries: type !== 'jobs'
        ? [{ query, platforms: ['edx', 'youtube'] }]
        : [],
    };

    const promises: Promise<{ platforms: string[]; errors: string[] }>[] = [];

    if (type !== 'courses') {
      promises.push(this.runJobScrapers(queries, userId, tempDir));
    }
    if (type !== 'jobs') {
      promises.push(this.runCourseScrapers(queries, userId, tempDir));
    }

    const results = await Promise.all(promises);
    for (const r of results) {
      result.platforms_scraped.push(...r.platforms);
      result.errors.push(...r.errors);
    }

    // Merge new results INTO existing user data (append, not overwrite)
    this.mergeResults(tempDir, outputFile);
    fs.rmSync(tempDir, { recursive: true, force: true });

    const counts = this.countFromFile(outputFile);
    result.jobs_found = counts.jobs;
    result.courses_found = counts.courses;

    if (result.errors.length > 0 && result.jobs_found === 0 && result.courses_found === 0) {
      result.status = 'failed';
    } else if (result.errors.length > 0) {
      result.status = 'partial';
    }

    this.logger.log(`Custom search finished for ${userId}: ${result.jobs_found} jobs, ${result.courses_found} courses`);
    return result;
  }

  // ─── Read User Results ───────────────────────────────────────────────────────
  getUserResults(userId: string): { jobs: any[]; courses: any[] } | null {
    const filePath = path.join(this.dataDir, 'users', `${userId}.json`);
    if (!fs.existsSync(filePath)) return null;
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
}