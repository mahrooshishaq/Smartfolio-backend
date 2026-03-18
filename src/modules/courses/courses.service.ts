import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

// ─── Interfaces ───────────────────────────────────────────────────────────────
export interface Course {
  id: string;
  title: string;
  instructor: string;
  platform: string;
  platform_logo: string;
  category: string;
  level: string;
  duration: string;
  price: string;
  rating: string;
  language: string;
  description: string;
  course_url: string;
  thumbnail: string;
  scraped_at: string;
  source: string;
}

export interface CourseFilters {
  search?: string;
  platform?: string;
  level?: string;
  category?: string;
  price?: string;
  language?: string;
  source?: string;
  page?: number;
  limit?: number;
}

// ─── Platform logos (always available, no API needed) ─────────────────────────
const PLATFORM_LOGOS: Record<string, string> = {
  'edx':      'https://www.edx.org/favicon.ico',
  'youtube':  'https://www.youtube.com/favicon.ico',
  'coursera': 'https://www.coursera.org/favicon.ico',
  'udemy':    'https://www.udemy.com/favicon.ico',
};

const PLATFORM_THUMBNAILS: Record<string, string> = {
  'edx':      'https://www.edx.org/images/logos/edx-logo-elm.svg',
  'youtube':  'https://www.youtube.com/img/desktop/yt_1200.png',
  'coursera': 'https://d3njjcbhbojbot.cloudfront.net/api/utilities/v1/imageproxy/https://coursera.s3.amazonaws.com/media/coursera-logo-square.png',
  'udemy':    'https://www.udemy.com/staticx/udemy/images/v7/logo-udemy.svg',
};

const PLACEHOLDER_LOGO = 'https://ui-avatars.com/api/?background=6366f1&color=fff&name=';

@Injectable()
export class CoursesService {
  private readonly logger = new Logger(CoursesService.name);
  private readonly dataDir = path.join(__dirname, '../../../src/data');

  // ─── Primary: get personalized courses for a user ─────────────────────────
  getUserCourses(userId: string): Course[] {
    const filePath = path.join(this.dataDir, 'users', `${userId}.json`);
    if (!fs.existsSync(filePath)) return [];
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(raw);
      if (!Array.isArray(data.courses)) return [];
      return data.courses.map((r: any, i: number) => this.normalizeCourse(r, i + 1));
    } catch {
      return [];
    }
  }

  // ─── GET /courses/me — paginated + filtered ────────────────────────────────
  getUserCoursesFiltered(userId: string, filters: CourseFilters) {
    let result = this.getUserCourses(userId);

    if (!result.length) {
      return { total: 0, page: 1, limit: 20, totalPages: 0, data: [], message: 'No courses found. Run POST /scraper/run first.' };
    }

    result = this.applyFilters(result, filters);

    const page  = Number(filters.page)  || 1;
    const limit = Number(filters.limit) || 20;
    const total = result.length;

    return {
      total, page, limit,
      totalPages:          Math.ceil(total / limit),
      counts_by_platform:  this.countByField(result, 'platform'),
      counts_by_level:     this.countByField(result, 'level'),
      counts_by_category:  this.countByField(result, 'category'),
      data:                result.slice((page - 1) * limit, page * limit),
    };
  }

  // ─── GET /courses/me/stats ────────────────────────────────────────────────
  getUserStats(userId: string) {
    const courses = this.getUserCourses(userId);
    if (!courses.length) return { total_courses: 0, message: 'No courses found. Run POST /scraper/run first.' };

    return {
      total_courses:       courses.length,
      counts_by_platform:  this.countByField(courses, 'platform'),
      counts_by_level:     this.countByField(courses, 'level'),
      counts_by_category:  this.countByField(courses, 'category'),
      counts_by_price:     this.countByField(courses, 'price'),
      platforms: Object.entries(this.countByField(courses, 'platform')).map(([name, count]) => ({
        name, count,
        logo: PLATFORM_LOGOS[name.toLowerCase()] || PLACEHOLDER_LOGO + name,
      })),
    };
  }

  // ─── GET /courses/me/filters ──────────────────────────────────────────────
  getUserFilterOptions(userId: string) {
    const courses = this.getUserCourses(userId);
    const unique = (field: keyof Course) =>
      [...new Set(courses.map(c => c[field] as string).filter(v => v && v !== 'Not specified'))].sort();

    return {
      platforms:  unique('platform'),
      levels:     ['Beginner', 'Intermediate', 'Advanced', 'All Levels'],
      categories: unique('category'),
      prices:     unique('price'),
      languages:  unique('language'),
      sources:    unique('source'),
    };
  }

  // ─── Normalize a raw course record ────────────────────────────────────────
  private normalizeCourse(raw: any, id: number): Course {
    const source = (raw.source || 'unknown').toLowerCase();
    const platform = raw.platform || this.inferPlatform(source);

    const thumbnail = this.resolveThumbnail(raw.thumbnail, source, raw.course_url);

    return {
      id:           `${source}-${id}`,
      title:        raw.title        || 'Not specified',
      instructor:   raw.instructor   || 'Not specified',
      platform,
      platform_logo: PLATFORM_LOGOS[source] || PLACEHOLDER_LOGO + platform,
      category:     this.normalizeCategory(raw.category, raw.title),
      level:        this.normalizeLevel(raw.level),
      duration:     raw.duration     || 'Not specified',
      price:        raw.price        || 'Not specified',
      rating:       raw.rating       || 'Not specified',
      language:     raw.language     || 'English',
      description:  raw.description  || 'Not specified',
      course_url:   raw.course_url   || 'Not specified',
      thumbnail,
      scraped_at:   raw.scraped_at   || 'Not specified',
      source,
    };
  }

  // ─── Thumbnail resolution with fallbacks ──────────────────────────────────
  private resolveThumbnail(thumbnail: string, source: string, courseUrl: string): string {
    // If we have a real thumbnail URL, use it
    if (thumbnail && thumbnail.startsWith('http')) return thumbnail;

    // edX: construct thumbnail from course URL slug
    if (source === 'edx' && courseUrl && courseUrl.includes('edx.org')) {
      // edX course page thumbnail pattern
      return PLATFORM_THUMBNAILS['edx'];
    }

    // YouTube: thumbnail is usually set by the scraper (ytimg.com)
    // Fall back to platform logo
    return PLATFORM_THUMBNAILS[source] || PLACEHOLDER_LOGO + source;
  }

  // ─── Infer platform from source ───────────────────────────────────────────
  private inferPlatform(source: string): string {
    const map: Record<string, string> = {
      'edx':      'edX',
      'youtube':  'YouTube',
      'coursera': 'Coursera',
      'udemy':    'Udemy',
    };
    return map[source] || source;
  }

  // ─── Normalize level ──────────────────────────────────────────────────────
  private normalizeLevel(raw: string): string {
    if (!raw || raw === 'Not specified') return 'Not specified';
    const val = raw.toLowerCase();
    if (val.includes('beginner') || val.includes('basic') || val.includes('introduct')) return 'Beginner';
    if (val.includes('intermediate') || val.includes('mid'))  return 'Intermediate';
    if (val.includes('advanced') || val.includes('expert'))   return 'Advanced';
    if (val.includes('all'))                                   return 'All Levels';
    return raw;
  }

  // ─── Normalize category ───────────────────────────────────────────────────
  private normalizeCategory(raw: string, title: string): string {
    if (!raw || raw === 'Not specified' || raw === 'General') {
      return this.inferCategoryFromTitle(title);
    }
    return raw;
  }

  private inferCategoryFromTitle(title: string): string {
    if (!title) return 'General';
    const t = title.toLowerCase();
    if (t.match(/typescript|javascript|react|node|python|java|\.net|programming|software|developer|web dev|backend|frontend|fullstack|devops/)) return 'Technology';
    if (t.match(/machine learning|ai |artificial|deep learning|nlp|data science|neural/)) return 'Data & AI';
    if (t.match(/fintech|fin tech|financial technology|blockchain|crypto|defi/)) return 'Finance & Technology';
    if (t.match(/finance|investment|accounting|trading|banking|economics/)) return 'Finance';
    if (t.match(/cyber|security|ethical hacking|penetration/)) return 'Cybersecurity';
    if (t.match(/product|project management|agile|scrum/)) return 'Product Management';
    if (t.match(/marketing|seo|growth|branding/)) return 'Marketing';
    if (t.match(/design|ui|ux|figma|graphic/)) return 'Design';
    if (t.match(/sql|database|postgresql|mongodb/)) return 'Database';
    if (t.match(/cloud|aws|azure|gcp|kubernetes|docker/)) return 'Cloud & DevOps';
    return 'General';
  }

  // ─── Apply filters ────────────────────────────────────────────────────────
  private applyFilters(courses: Course[], filters: CourseFilters): Course[] {
    let result = [...courses];

    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(c =>
        c.title?.toLowerCase().includes(q) ||
        c.instructor?.toLowerCase().includes(q) ||
        c.category?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q)
      );
    }
    if (filters.platform)  result = result.filter(c => c.platform?.toLowerCase().includes(filters.platform!.toLowerCase()));
    if (filters.level)     result = result.filter(c => c.level?.toLowerCase().includes(filters.level!.toLowerCase()));
    if (filters.category)  result = result.filter(c => c.category?.toLowerCase().includes(filters.category!.toLowerCase()));
    if (filters.price)     result = result.filter(c => c.price?.toLowerCase().includes(filters.price!.toLowerCase()));
    if (filters.language)  result = result.filter(c => c.language?.toLowerCase().includes(filters.language!.toLowerCase()));
    if (filters.source)    result = result.filter(c => c.source?.toLowerCase().includes(filters.source!.toLowerCase()));

    return result;
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────
  private countByField(courses: Course[], field: keyof Course): Record<string, number> {
    return courses.reduce((acc, c) => {
      const val = c[field] as string || 'Not specified';
      acc[val] = (acc[val] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
}
