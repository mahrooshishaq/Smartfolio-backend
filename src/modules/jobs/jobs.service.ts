import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

// ─── Interfaces ───────────────────────────────────────────────────────────────
export interface Job {
  id: string;
  title: string;
  company: string;
  company_logo: string;
  location: string;
  country: string;
  salary_min: string;
  salary_max: string;
  job_type: string;
  experience_level: string;
  category: string;
  source: string;
  source_logo: string;
  apply_url: string;
  scraped_at: string;
}

export interface JobFilters {
  search?: string;
  location?: string;
  country?: string;
  job_type?: string;
  experience_level?: string;
  category?: string;
  source?: string;
  salary_min?: number;
  salary_max?: number;
  page?: number;
  limit?: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const SOURCE_LOGOS: Record<string, string> = {
  'adzuna':        'https://logo.clearbit.com/adzuna.com',
  'rozee.pk':      'https://logo.clearbit.com/rozee.pk',
  'jsearch':       'https://logo.clearbit.com/indeed.com',
  'indeed':        'https://logo.clearbit.com/indeed.com',
  'linkedin':      'https://logo.clearbit.com/linkedin.com',
  'glassdoor':     'https://logo.clearbit.com/glassdoor.com',
  'bayt':          'https://logo.clearbit.com/bayt.com',
  'naukri':        'https://logo.clearbit.com/naukri.com',
  'monster':       'https://logo.clearbit.com/monster.com',
  'ziprecruiter':  'https://logo.clearbit.com/ziprecruiter.com',
  'jooble':        'https://logo.clearbit.com/jooble.org',
};

const PLACEHOLDER_LOGO = 'https://ui-avatars.com/api/?background=0D8ABC&color=fff&name=';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);
  private readonly dataDir = path.join(__dirname, '../../../src/data');

  // ─── Primary: Get personalized jobs for a user ────────────────────────────
  getUserJobs(userId: string): Job[] {
    const filePath = path.join(this.dataDir, 'users', `${userId}.json`);
    if (!fs.existsSync(filePath)) return [];
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(raw);
      if (!Array.isArray(data.jobs)) return [];
      return data.jobs.map((r: any, i: number) =>
        this.normalizeJob(r, r.source || 'unknown', i + 1)
      );
    } catch {
      return [];
    }
  }

  // ─── GET /jobs/me — paginated + filtered user jobs ────────────────────────
  getUserJobsFiltered(userId: string, filters: JobFilters) {
    let result = this.getUserJobs(userId);

    if (!result.length) {
      return { total: 0, page: 1, limit: 20, totalPages: 0, data: [], message: 'No jobs found. Run POST /scraper/run first.' };
    }

    result = this.applyFilters(result, filters);

    const page  = Number(filters.page)  || 1;
    const limit = Number(filters.limit) || 20;
    const total = result.length;

    return {
      total, page, limit,
      totalPages:       Math.ceil(total / limit),
      counts_by_source: this.countBySource(result),
      counts_by_category: this.countByField(result, 'category'),
      data:             result.slice((page - 1) * limit, page * limit),
    };
  }

  // ─── GET /jobs/me/stats ───────────────────────────────────────────────────
  getUserStats(userId: string) {
    const jobs = this.getUserJobs(userId);
    if (!jobs.length) return { total_jobs: 0, message: 'No jobs found. Run POST /scraper/run first.' };

    const countsBySource = this.countBySource(jobs);
    return {
      total_jobs:         jobs.length,
      counts_by_source:   countsBySource,
      counts_by_type:     this.countByField(jobs, 'job_type'),
      counts_by_country:  this.countByField(jobs, 'country'),
      counts_by_category: this.countByField(jobs, 'category'),
      sources: Object.keys(countsBySource).map(source => ({
        name:  source,
        count: countsBySource[source],
        logo:  SOURCE_LOGOS[source] || PLACEHOLDER_LOGO + source,
      })),
    };
  }

  // ─── GET /jobs/me/filters ─────────────────────────────────────────────────
  getUserFilterOptions(userId: string) {
    const jobs = this.getUserJobs(userId);
    const unique = (field: keyof Job) =>
      [...new Set(jobs.map(j => j[field] as string).filter(v => v && v !== 'Not specified'))].sort();

    return {
      locations:         [...new Set(jobs.map(j => j.location?.split(',')[0]?.trim()).filter(v => v && v !== 'Not specified'))].sort(),
      countries:         unique('country'),
      job_types:         ['Full Time', 'Part Time', 'Remote', 'Hybrid', 'Onsite', 'Contract', 'Internship'],
      experience_levels: unique('experience_level'),
      categories:        unique('category'),
      sources:           unique('source'),
    };
  }

  // ─── Apply filters ────────────────────────────────────────────────────────
  private applyFilters(jobs: Job[], filters: JobFilters): Job[] {
    let result = [...jobs];

    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(j =>
        j.title?.toLowerCase().includes(q) || j.company?.toLowerCase().includes(q) ||
        j.category?.toLowerCase().includes(q) || j.location?.toLowerCase().includes(q)
      );
    }
    if (filters.location)         result = result.filter(j => j.location?.toLowerCase().includes(filters.location!.toLowerCase()));
    if (filters.country)          result = result.filter(j => j.country?.toLowerCase().includes(filters.country!.toLowerCase()));
    if (filters.job_type)         result = result.filter(j => j.job_type?.toLowerCase().includes(filters.job_type!.toLowerCase()));
    if (filters.experience_level) result = result.filter(j => j.experience_level?.toLowerCase().includes(filters.experience_level!.toLowerCase()));
    if (filters.category)         result = result.filter(j => j.category?.toLowerCase().includes(filters.category!.toLowerCase()));
    if (filters.source)           result = result.filter(j => j.source?.toLowerCase().includes(filters.source!.toLowerCase()));
    if (filters.salary_min)       result = result.filter(j => { const min = parseFloat(j.salary_min); return !isNaN(min) && min >= Number(filters.salary_min); });
    if (filters.salary_max)       result = result.filter(j => { const max = parseFloat(j.salary_max); return !isNaN(max) && max <= Number(filters.salary_max); });

    return result;
  }

  // ─── Normalize a raw job record ───────────────────────────────────────────
  private normalizeJob(raw: any, source: string, id: number): Job {
    const company = raw.company || 'Not specified';

    const resolvedSource = (raw.source === 'jsearch' || source === 'jsearch')
      ? this.extractJsearchSource(raw.apply_url)
      : (raw.source || source);

    return {
      id:               `${resolvedSource}-${id}`,
      title:            raw.title            || 'Not specified',
      company,
      company_logo:     this.getCompanyLogo(company),
      location:         raw.location         || raw.city || 'Not specified',
      country:          this.normalizeCountry(raw.country, raw.location),
      salary_min:       raw.salary_min       || raw.salary || 'Not specified',
      salary_max:       raw.salary_max       || 'Not specified',
      job_type:         this.normalizeJobType(raw.job_type),
      experience_level: this.normalizeExperienceLevel(raw.experience_level, raw.title, resolvedSource),
      category:         this.normalizeCategory(raw.category, raw.title),
      source:           resolvedSource,
      source_logo:      SOURCE_LOGOS[resolvedSource] || PLACEHOLDER_LOGO + resolvedSource,
      apply_url:        raw.apply_url        || 'Not specified',
      scraped_at:       raw.scraped_at       || new Date().toISOString().split('T')[0],
    };
  }

  // ─── Source extraction from jsearch apply URLs ────────────────────────────
  private extractJsearchSource(applyUrl: string): string {
    if (!applyUrl) return 'jsearch';
    const url = applyUrl.toLowerCase();
    if (url.includes('linkedin.com'))  return 'linkedin';
    if (url.includes('glassdoor.com')) return 'glassdoor';
    if (url.includes('indeed.com'))    return 'indeed';
    if (url.includes('bayt.com'))      return 'bayt';
    if (url.includes('rozee.pk'))      return 'rozee.pk';
    if (url.includes('naukri.com'))    return 'naukri';
    if (url.includes('monster.com'))   return 'monster';
    if (url.includes('ziprecruiter'))  return 'ziprecruiter';
    if (url.includes('jooble'))        return 'jooble';
    if (url.includes('jobgether'))     return 'jobgether';
    if (url.includes('jobrapido'))     return 'jobrapido';
    if (url.includes('expertini'))     return 'expertini';
    return 'jsearch';
  }

  // ─── Country normalization (handles short codes like "PK", "IN") ──────────
  private normalizeCountry(country: string, location: string): string {
    if (country && country.length > 2) return country;
    const codeMap: Record<string, string> = {
      'PK': 'Pakistan',       'IN': 'India',         'US': 'United States',
      'GB': 'United Kingdom', 'AU': 'Australia',     'CA': 'Canada',
      'DE': 'Germany',        'SG': 'Singapore',     'AE': 'United Arab Emirates',
    };
    const code = (country || '').toUpperCase();
    if (codeMap[code]) return codeMap[code];
    return this.inferCountry(location);
  }

  private inferCountry(location: string): string {
    if (!location) return 'Not specified';
    const l = location.toLowerCase();
    if (l.includes('pakistan') || l.includes('lahore') || l.includes('karachi') ||
        l.includes('islamabad') || l.includes('rawalpindi') || l.includes('faisalabad')) return 'Pakistan';
    if (l.includes('united states') || l.includes(', us') || l.includes(', ny') ||
        l.includes(', ca') || l.includes(', tx')) return 'United States';
    if (l.includes('united kingdom') || l.includes(', uk') || l.includes('london')) return 'United Kingdom';
    if (l.includes('australia') || l.includes('sydney') || l.includes('melbourne')) return 'Australia';
    if (l.includes('canada') || l.includes('toronto') || l.includes('vancouver')) return 'Canada';
    if (l.includes('india') || l.includes('mumbai') || l.includes('bangalore')) return 'India';
    if (l.includes('germany') || l.includes('berlin') || l.includes('munich')) return 'Germany';
    return 'Not specified';
  }

  // ─── Experience level (jsearch always returns "Entry level" — infer from title) ─
  private normalizeExperienceLevel(raw: string, title: string, source: string): string {
    if (source !== 'adzuna' && source !== 'rozee.pk') {
      const t = (title || '').toLowerCase();
      if (t.match(/\bjunior\b|entry|graduate|intern/))       return 'Entry Level';
      if (t.match(/\bsenior\b|sr\.|lead|principal|staff/))   return 'Senior';
      if (t.match(/\bmanager\b|director|vp |head of/))       return 'Management';
      if (t.match(/\bmid\b|intermediate|associate/))         return 'Mid Level';
      return 'Not specified';
    }
    if (!raw || raw === 'Not specified') return 'Not specified';
    return raw;
  }

  // ─── Category normalization ───────────────────────────────────────────────
  private normalizeCategory(raw: string, title: string): string {
    const JUNK_CATEGORIES = [
      'linkedin', 'indeed', 'glassdoor', 'bayt', 'rozee', 'workable',
      'careers', 'jobs', 'smartrecruiters', 'jobgether', 'bebee', 'startup',
      'expertini', 'jobrapido', 'yulys', 'jaabz', 'manatal', 'spglobal',
      's&p', 'cbre', 'pepsico', 'acca', 'wizbii', 'zones', 'terra',
      'unjobnet', 'jobleads', 'crossover', 'kaispe', 'getpakjob', 'afridi',
      'webnet', 'connectx', 'sperton', 'estm', 'oraclecloud', 'ace money',
      'jazzkr', 'jazzhr', 'leading digital',
    ];

    const CATEGORY_MAP: Record<string, string> = {
      'software engineer': 'Technology',           'senior software engineer': 'Technology',
      'lead software engineer': 'Technology',      'web developer': 'Technology',
      'typescript developer': 'Technology',        'devops engineer': 'Technology',
      'cloud engineer': 'Technology',              'mobile developer': 'Technology',
      'frontend developer': 'Technology',          'backend developer': 'Technology',
      'full stack developer': 'Technology',        'database administrator': 'Technology',
      'blockchain developer': 'Technology',        'data scientist': 'Data & AI',
      'machine learning engineer': 'Data & AI',    'ai engineer': 'Data & AI',
      'ai/ml engineer': 'Data & AI',               'data analyst': 'Data & AI',
      'cybersecurity analyst': 'Cybersecurity',    'fintech software engineer': 'Finance & Accounting',
      'senior fintech developer': 'Finance & Accounting', 'finance tech lead': 'Finance & Accounting',
      'finance software engineer': 'Finance & Accounting', 'ai engineer finance': 'Finance & Accounting',
      'finance manager': 'Finance & Accounting',   'accountant': 'Finance & Accounting',
      'investment analyst': 'Finance & Accounting','financial analyst': 'Finance & Accounting',
      'business analyst': 'Product & Project Management', 'product manager': 'Product & Project Management',
      'project manager': 'Product & Project Management',  'supply chain manager': 'Operations',
      'operations manager': 'Operations',          'business development': 'Sales & Business Development',
      'sales manager': 'Sales & Business Development',    'account manager': 'Sales & Business Development',
      'digital marketing': 'Marketing',            'content marketing': 'Marketing',
      'seo specialist': 'Marketing',               'social media manager': 'Marketing',
      'marketing manager': 'Marketing',            'graphic designer': 'Design & Creative',
      'ui ux designer': 'Design & Creative',       'product designer': 'Design & Creative',
      'human resources manager': 'Human Resources','recruiter': 'Human Resources',
      'talent acquisition': 'Human Resources',     'customer service': 'Customer Service',
      'technical support': 'Customer Service',
    };

    if (!raw || raw === 'Not specified') return this.inferCategoryFromTitle(title);

    const rawLower = raw.toLowerCase().trim();
    if (CATEGORY_MAP[rawLower]) return CATEGORY_MAP[rawLower];

    const isJunk = JUNK_CATEGORIES.some(j => rawLower.includes(j));
    if (isJunk) return this.inferCategoryFromTitle(title);

    const looksLikeCompany =
      /\.(com|pk|org|net|io)$/i.test(raw) ||
      (/^[A-Z][a-z]+ [A-Z][a-z]+/.test(raw) &&
        raw.split(' ').length <= 3 &&
        !raw.toLowerCase().match(/manager|engineer|analyst|developer|designer|specialist|officer/));

    if (looksLikeCompany) return this.inferCategoryFromTitle(title);
    return raw;
  }

  private inferCategoryFromTitle(title: string): string {
    if (!title) return 'Not specified';
    const t = title.toLowerCase();
    if (t.match(/software|developer|engineer|frontend|backend|fullstack|full stack|devops|cloud|mobile|flutter|react|angular|vue|node|python|java|\.net/)) return 'Technology';
    if (t.match(/data\s*(scientist|analyst|engineer)|machine learning|ai |artificial|nlp|deep learning/)) return 'Data & AI';
    if (t.match(/cyber|security|infosec|penetration/)) return 'Cybersecurity';
    if (t.match(/product manager|project manager|scrum|agile|program manager/)) return 'Product & Project Management';
    if (t.match(/marketing|seo|content|social media|brand|growth/)) return 'Marketing';
    if (t.match(/sales|account manager|business development|bd /)) return 'Sales & Business Development';
    if (t.match(/finance|financial|accountant|accounting|audit|tax|investment|analyst/)) return 'Finance & Accounting';
    if (t.match(/fintech|fin tech/)) return 'Finance & Accounting';
    if (t.match(/hr |human resource|recruiter|talent|people ops/)) return 'Human Resources';
    if (t.match(/design|ui|ux|graphic|creative|figma|illustrat/)) return 'Design & Creative';
    if (t.match(/customer|support|service|helpdesk|success/)) return 'Customer Service';
    if (t.match(/operations|supply chain|logistics|procurement/)) return 'Operations';
    return 'General';
  }

  // ─── Job type normalization ───────────────────────────────────────────────
  private normalizeJobType(raw: string): string {
    if (!raw || raw === 'Not specified') return 'Not specified';
    const val = raw.toLowerCase().trim();
    if (val.includes('full'))      return 'Full Time';
    if (val.includes('part'))      return 'Part Time';
    if (val.includes('remote'))    return 'Remote';
    if (val.includes('hybrid'))    return 'Hybrid';
    if (val.includes('onsite') || val.includes('on-site') || val.includes('on site')) return 'Onsite';
    if (val.includes('contract'))  return 'Contract';
    if (val.includes('intern'))    return 'Internship';
    if (val.includes('permanent')) return 'Full Time';
    return raw;
  }

  // ─── Company logo via Clearbit ────────────────────────────────────────────
  private getCompanyLogo(company: string): string {
    if (!company || company === 'Not specified') return `${PLACEHOLDER_LOGO}?`;
    const domain = company
      .toLowerCase()
      .replace(/\s+(inc|ltd|llc|corp|limited|pvt|co)\.?$/gi, '')
      .trim()
      .replace(/\s+/g, '') + '.com';
    return `https://logo.clearbit.com/${domain}`;
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────
  private countBySource(jobs: Job[]): Record<string, number> {
    return jobs.reduce((acc, j) => { acc[j.source] = (acc[j.source] || 0) + 1; return acc; }, {} as Record<string, number>);
  }

  private countByField(jobs: Job[], field: keyof Job): Record<string, number> {
    return jobs.reduce((acc, j) => { const val = j[field] as string || 'Not specified'; acc[val] = (acc[val] || 0) + 1; return acc; }, {} as Record<string, number>);
  }
}