import { collapseWhitespace, normalizeDescription } from '../content/adapters/normalize';
import type { JobPost } from '../shared/types';

const TITLE_MAX = 100;

/** First short line (usually the job title), else the first sentence. */
export function titleFromText(raw: string): string {
  const firstLine = raw
    .split(/\r?\n/)
    .map((line) => collapseWhitespace(line))
    .find((line) => line.length > 0);
  if (firstLine && firstLine.length <= TITLE_MAX) return firstLine;
  const flat = collapseWhitespace(raw);
  const sentence = flat.split(/[.!?]/)[0]?.trim() ?? '';
  if (!sentence) return 'Selected text';
  return sentence.length <= TITLE_MAX
    ? sentence
    : `${sentence.slice(0, TITLE_MAX - 1).trimEnd()}…`;
}

/** Build a generic JobPost from selected or pasted text; null when empty. */
export function jobFromText(text: string, url: string): JobPost | null {
  const { description, truncated } = normalizeDescription(text);
  if (!description) return null;
  return {
    platform: 'generic',
    url,
    title: titleFromText(text),
    description,
    skills: [],
    extractedAt: new Date().toISOString(),
    truncated,
  };
}
