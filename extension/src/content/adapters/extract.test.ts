import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Window } from 'happy-dom';
import { describe, expect, it } from 'vitest';
import { DESCRIPTION_MAX, normalizeDescription } from './normalize';
import { extractJobPost } from './index';

const fixturesDir = join(process.cwd(), 'tests', 'fixtures');

function loadDocument(name: string): Document {
  const html = readFileSync(join(fixturesDir, name), 'utf8');
  const window = new Window({ url: 'https://example.com/' });
  window.document.write(html);
  return window.document as unknown as Document;
}

describe('fiverr fixture', () => {
  it('extracts title, description length, and budget', () => {
    const doc = loadDocument('fiverr-job.html');
    const result = extractJobPost(
      doc,
      'https://www.fiverr.com/users/buyer/requests/abc',
    );
    expect('title' in result).toBe(true);
    if (!('title' in result)) return;
    expect(result.platform).toBe('fiverr');
    expect(result.title).toContain('React landing page');
    expect(result.description.length).toBeGreaterThan(40);
    expect(result.budgetText).toContain('$300');
    expect(result.skills).toContain('React');
    expect(result.truncated).toBe(false);
  });
});

describe('upwork fixture', () => {
  it('extracts title, description length, and budget', () => {
    const doc = loadDocument('upwork-job.html');
    const result = extractJobPost(
      doc,
      'https://www.upwork.com/jobs/~0123456789abcdef',
    );
    expect('title' in result).toBe(true);
    if (!('title' in result)) return;
    expect(result.platform).toBe('upwork');
    expect(result.title).toContain('Stripe');
    expect(result.description.length).toBeGreaterThan(40);
    expect(result.budgetText).toMatch(/\$40/);
    expect(result.experienceLevel).toBe('Intermediate');
    expect(result.skills).toContain('Python');
  });
});

describe('upwork 2026 layout', () => {
  it('extracts title, all description paragraphs, rate, level and skills', () => {
    const doc = loadDocument('upwork-job-2026.html');
    const result = extractJobPost(doc, 'https://www.upwork.com/jobs/AI-chatbot_~0123');
    expect('title' in result).toBe(true);
    if (!('title' in result)) return;
    expect(result.platform).toBe('upwork');
    expect(result.title).toBe('AI chatbot developer for a task app');
    expect(result.description).toContain('manage daily tasks');
    expect(result.description).toContain('suggests actions');
    expect(result.description).not.toMatch(/^Summary/);
    expect(result.budgetText).toBe('$19.00 - $40.00 · Hourly');
    expect(result.experienceLevel).toBe('Intermediate');
    expect(result.skills).toEqual([
      'Mobile App Development',
      'Chatbot Development',
      'OpenAI API',
    ]);
  });

  it('reads a fixed-price budget', () => {
    const doc = loadDocument('upwork-job-2026.html');
    const li = doc.querySelector('[data-cy="clock-timelog"]')?.closest('li');
    if (!li) throw new Error('fixture changed');
    li.innerHTML =
      '<div data-cy="fixed-price"></div><div><p><strong>$500.00</strong></p></div><div class="description">Fixed-price</div>';
    const result = extractJobPost(doc, 'https://www.upwork.com/jobs/AI-chatbot_~0123');
    expect('title' in result && result.budgetText).toBe('$500.00 · Fixed-price');
  });

  it('falls back to the page title when the heading is missing', () => {
    const doc = loadDocument('upwork-job-2026.html');
    doc.querySelector('.job-details-card h4')?.remove();
    const result = extractJobPost(doc, 'https://www.upwork.com/jobs/AI-chatbot_~0123');
    expect('title' in result && result.title).toBe('AI chatbot developer for a task app');
  });
});

describe('non-job pages', () => {
  it('returns NOT_A_JOB_PAGE for fiverr home', () => {
    const doc = loadDocument('fiverr-home.html');
    const result = extractJobPost(doc, 'https://www.fiverr.com/');
    expect(result).toMatchObject({ code: 'NOT_A_JOB_PAGE' });
  });

  it('returns NOT_A_JOB_PAGE for upwork home', () => {
    const doc = loadDocument('upwork-home.html');
    const result = extractJobPost(doc, 'https://www.upwork.com/');
    expect(result).toMatchObject({ code: 'NOT_A_JOB_PAGE' });
  });
});

describe('description cap', () => {
  it('truncates at 12,000 characters and sets truncated true', () => {
    const long = 'a'.repeat(DESCRIPTION_MAX + 500);
    const { description, truncated } = normalizeDescription(long);
    expect(description.length).toBe(DESCRIPTION_MAX);
    expect(truncated).toBe(true);
  });
});

describe('generic selection', () => {
  it('returns EMPTY_SELECTION when nothing is highlighted', () => {
    const doc = loadDocument('fiverr-home.html');
    const result = extractJobPost(doc, 'https://example.com/', {
      preferSelection: true,
    });
    expect(result).toMatchObject({ code: 'EMPTY_SELECTION' });
  });
});
