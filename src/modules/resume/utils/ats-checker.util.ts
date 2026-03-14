/**
 * Rule-based ATS compatibility checker.
 * Fast and deterministic — no LLM cost.
 * Penalises known ATS-breaking patterns.
 */
export class AtsChecker {
  static check(
    text: string,
    metadata: {
      hasTables?: boolean;
      hasImages?: boolean;
      pageCount?: number;
      confidence?: number;
    } | null,
  ): { score: number; issues: string[] } {
    let score = 100;
    const issues: string[] = [];

    // ── Metadata-based checks ──────────────────────────────────────
    if (metadata?.hasTables) {
      score -= 15;
      issues.push('Tables detected — may break ATS column parsing.');
    }
    if (metadata?.hasImages) {
      score -= 10;
      issues.push('Images or icons detected — invisible to ATS.');
    }
    if (metadata?.confidence != null && metadata.confidence < 0.8) {
      score -= 10;
      issues.push('Low text extraction confidence — possible scanned/image PDF.');
    }

    // ── Section header checks ──────────────────────────────────────
    const lowerText = text.toLowerCase();
    const requiredSections = ['experience', 'education', 'skills'];
    for (const section of requiredSections) {
      if (!lowerText.includes(section)) {
        score -= 10;
        issues.push(`Missing standard section: "${section}".`);
      }
    }

    // ── Date format check (basic) ──────────────────────────────────
    const inconsistentDates =
      /(\bjan\b|\bfeb\b|\bmar\b|\bapr\b|\bmay\b|\bjun\b|\bjul\b|\baug\b|\bsep\b|\boct\b|\bnov\b|\bdec\b)/i.test(
        text,
      ) && /\d{1,2}\/\d{4}/.test(text);

    if (inconsistentDates) {
      score -= 5;
      issues.push('Inconsistent date formats detected.');
    }

    // ── Dense paragraph check ──────────────────────────────────────
    const avgLineLength =
      text.split('\n').reduce((sum, l) => sum + l.length, 0) /
      (text.split('\n').length || 1);

    if (avgLineLength > 120) {
      score -= 5;
      issues.push('Dense paragraphs detected — prefer bullet points.');
    }

    return { score: Math.max(0, score), issues };
  }
}
