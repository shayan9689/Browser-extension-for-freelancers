import { describe, expect, it } from 'vitest';
import { jobFromText, titleFromText } from './jobFromText';

describe('jobFromText', () => {
  it('returns null for empty text', () => {
    expect(jobFromText('   \n  ', 'https://example.com')).toBeNull();
  });

  it('builds a generic job with collapsed description', () => {
    const job = jobFromText(
      'Build a small FastAPI service\n\nBudget: $400\nNeed  Stripe webhooks.',
      'https://example.com/job',
    );
    expect(job).not.toBeNull();
    expect(job?.platform).toBe('generic');
    expect(job?.url).toBe('https://example.com/job');
    expect(job?.title).toBe('Build a small FastAPI service');
    expect(job?.description).toBe(
      'Build a small FastAPI service Budget: $400 Need Stripe webhooks.',
    );
    expect(job?.skills).toEqual([]);
    expect(job?.truncated).toBe(false);
  });

  it('caps long text at 12,000 characters', () => {
    const job = jobFromText('word '.repeat(5000), 'https://example.com');
    expect(job?.description.length).toBe(12_000);
    expect(job?.truncated).toBe(true);
  });
});

describe('titleFromText', () => {
  it('uses the first short line', () => {
    expect(titleFromText('\n  Logo for a bakery  \nMore details here.')).toBe(
      'Logo for a bakery',
    );
  });

  it('falls back to the first sentence when the first line is long', () => {
    const text = `Need a developer. ${'x'.repeat(200)}`;
    expect(titleFromText(text)).toBe('Need a developer');
  });

  it('truncates a very long first sentence', () => {
    const title = titleFromText('a'.repeat(300));
    expect(title.length).toBe(100);
    expect(title.endsWith('…')).toBe(true);
  });
});
