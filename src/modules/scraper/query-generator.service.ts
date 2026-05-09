import { Injectable, Logger } from '@nestjs/common';
import Groq from 'groq-sdk';
import { ConfigService } from '@nestjs/config';

export interface GeneratedQueries {
  job_queries: {
    query: string;
    platforms: string[];  // 'rozee' | 'adzuna' | 'jsearch'
    location?: string;
  }[];
  course_queries: {
    query: string;
    platforms: string[];  // 'edx' | 'youtube'
  }[];
}

@Injectable()
export class QueryGeneratorService {
  private readonly logger = new Logger(QueryGeneratorService.name);
  private readonly groq: Groq;

  constructor(private readonly configService: ConfigService) {
    this.groq = new Groq({
      apiKey: this.configService.get<string>('GROQ_API_KEY'),
    });
  }

  async generateQueries(userProfile: any): Promise<GeneratedQueries> {
    const prompt = `You are a job and course search query generator.
Given this user profile, generate targeted search queries for jobs and courses.

User Profile:
${JSON.stringify(userProfile, null, 2)}

Platform rules:
- rozee: ONLY for Pakistan-based jobs (use if location contains Pakistan or openToRemote is false and location is Pakistani city)
- adzuna: for international jobs or remote jobs
- jsearch: for any English-language job market
- edx: for structured courses with certificates
- youtube: for free learning content

Return ONLY a valid JSON object, no explanation, no markdown, no backticks:
{
  "job_queries": [
    {
      "query": "search query here",
      "platforms": ["rozee", "adzuna"],
      "location": "optional location string"
    }
  ],
  "course_queries": [
    {
      "query": "search query here", 
      "platforms": ["edx", "youtube"]
    }
  ]
}

Rules:
- Generate 4-6 job queries and 4-6 course queries
- Use targetRole as primary job query, currentRole as secondary
- Use skills array to create skill-specific job queries (e.g. "TypeScript developer")
- Use interests array for interest-aligned queries (e.g. "Fintech engineer")
- Use targetIndustry to focus industry queries
- If willingToRelocate is false AND openToRemote is false: ONLY use rozee, NO adzuna or jsearch
- If openToRemote is true: include adzuna and jsearch with remote-friendly queries
- If willingToRelocate is true: include adzuna with international queries
- If careerStage is advancing/senior: use Senior/Lead/Principal level titles
- If careerStage is entry/student: use Junior/Graduate/Entry level titles
- Course queries must bridge skill gaps between currentRole and targetRole
- Include courses for skills listed in the skills array
- Keep queries short and targeted (2-5 words)`;

    try {
      const response = await this.groq.chat.completions.create({
        model: this.configService.get<string>('GROQ_MODEL_QUERIES') ?? 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
      });

      let raw = (response.choices[0].message.content ?? "").trim();
      raw = raw.replace(/```json|```/g, '').trim();
      const queries: GeneratedQueries = JSON.parse(raw);

      // Enforce platform rules — AI sometimes ignores the prompt constraints
      const isInPakistan = userProfile.location?.toLowerCase().includes('pakistan') ||
        ['lahore', 'karachi', 'islamabad', 'rawalpindi', 'faisalabad']
          .some((city: string) => userProfile.location?.toLowerCase().includes(city));
      const pakOnly = isInPakistan && !userProfile.openToRemote && !userProfile.willingToRelocate;

      if (pakOnly) {
        // Strip adzuna/jsearch — only rozee allowed for Pakistan-only users
        for (const q of queries.job_queries) {
          q.platforms = q.platforms.filter((p: string) => p === 'rozee');
          if (q.platforms.length === 0) q.platforms = ['rozee'];
        }
        this.logger.log('Enforced Pakistan-only platforms (rozee) for job queries');
      } else if (isInPakistan) {
        // Ensure rozee is included for Pakistan users open to remote
        for (const q of queries.job_queries) {
          if (!q.platforms.includes('rozee')) q.platforms.push('rozee');
        }
      }

      this.logger.log(
        `Generated ${queries.job_queries.length} job queries and ${queries.course_queries.length} course queries`,
      );
      return queries;

    } catch (error) {
      this.logger.error(`Query generation failed: ${error instanceof Error ? error.message : String(error)}`);

      // Fallback: generate basic queries from profile fields
      return this.fallbackQueries(userProfile);
    }
  }

  private fallbackQueries(profile: any): GeneratedQueries {
    const isInPakistan = profile.location?.toLowerCase().includes('pakistan') ||
      ['lahore', 'karachi', 'islamabad', 'rawalpindi', 'faisalabad']
        .some(city => profile.location?.toLowerCase().includes(city));

    const jobPlatforms = [];
    if (isInPakistan) jobPlatforms.push('rozee');
    if (profile.openToRemote || !isInPakistan) jobPlatforms.push('adzuna', 'jsearch');
    if (jobPlatforms.length === 0) jobPlatforms.push('jsearch');

    return {
      job_queries: [
        { query: profile.targetRole || profile.currentRole, platforms: jobPlatforms, location: profile.location },
        { query: `${profile.targetRole} ${profile.targetIndustry || ''}`.trim(), platforms: jobPlatforms },
        { query: (profile.skills || []).slice(0, 2).join(' '), platforms: jobPlatforms },
      ].filter(q => q.query),
      course_queries: [
        { query: profile.targetRole || '', platforms: ['edx', 'youtube'] },
        { query: (profile.skills || []).slice(0, 2).join(' '), platforms: ['youtube'] },
        { query: `${profile.targetIndustry || ''} fundamentals`.trim(), platforms: ['edx'] },
      ].filter(q => q.query),
    };
  }
}
