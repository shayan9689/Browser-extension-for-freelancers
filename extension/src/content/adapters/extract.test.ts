import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Window } from 'happy-dom';
import { describe, expect, it } from 'vitest';
import { DESCRIPTION_MAX, normalizeDescription } from './normalize';
import { extractConversation, extractJobPost } from './index';

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

describe('fiverr inbox conversation', () => {
  const url = 'https://www.fiverr.com/inbox/buyer_demo';

  it('labels every message as client or me', () => {
    const c = extractConversation(loadDocument('fiverr-inbox-chat.html'), url);
    expect(c).not.toBeNull();
    if (!c) return;
    expect(c.platform).toBe('fiverr');
    expect(c.messages.map((m) => m.role)).toEqual(['client', 'me', 'client', 'client']);
    expect(c.clientMessages).toBe(3);
    expect(c.messages[0]?.text).toBe('Hi! I saw your gig and have a question.');
    expect(c.messages[3]?.text).toBe('Also, can you start this week?');
  });

  it('keeps the custom order request text but drops names, times and buttons', () => {
    const c = extractConversation(loadDocument('fiverr-inbox-chat.html'), url);
    const all = c?.messages.map((m) => m.text).join(' ') ?? '';
    expect(all).toContain('Budget $80');
    expect(all).toContain('booking page for my yoga studio. It must work on phones.');
    for (const hidden of ['buyer_demo', 'seller_demo', 'Buyer Demo', '10:09', 'Create an offer']) {
      expect(all).not.toContain(hidden);
    }
  });

  it('finds the client without a details pane', () => {
    const doc = loadDocument('fiverr-inbox-chat.html');
    doc.querySelector('[data-testid="details-pane"]')?.remove();
    const c = extractConversation(doc, url);
    expect(c?.messages.map((m) => m.role)).toEqual(['client', 'me', 'client', 'client']);
  });

  it('only runs in the inbox', () => {
    const doc = loadDocument('fiverr-inbox-chat.html');
    expect(extractConversation(doc, 'https://www.fiverr.com/users/x')).toBeNull();
  });
});

describe('fiverr inbox custom order request', () => {
  const url = 'https://www.fiverr.com/inbox/buyer_demo';

  it('reads the brief message, budget and delivery', () => {
    const result = extractJobPost(loadDocument('fiverr-inbox-brief.html'), url);
    expect('title' in result).toBe(true);
    if (!('title' in result)) return;
    expect(result.platform).toBe('fiverr');
    expect(result.title).toBe('Custom Order Request');
    expect(result.budgetText).toBe('$120');
    expect(result.description).toContain('landing page redesign for my bakery website. Milestone 1');
    expect(result.description).toContain('Request details: Budget $120; 3 days delivery');
    expect(result.description).not.toContain('Create an offer');
  });

  it('guides the user when the conversation has no brief', () => {
    const doc = loadDocument('fiverr-inbox-brief.html');
    doc.querySelector('[data-testid="brief-entry"]')?.remove();
    expect(extractJobPost(doc, url)).toMatchObject({ code: 'NOT_A_JOB_PAGE' });
  });
});

describe('upwork slider (job viewer) layout', () => {
  const url = 'https://www.upwork.com/nx/find-work/best-matches/details/~0123';

  it('reads the open job, not the feed behind it', () => {
    const result = extractJobPost(loadDocument('upwork-slider-2026.html'), url);
    expect('title' in result).toBe(true);
    if (!('title' in result)) return;
    expect(result.platform).toBe('upwork');
    expect(result.title).toBe('Telegram bot and API integration for a booking app');
    expect(result.skills).toEqual(['Bot Development', 'Node.js', 'API Integration']);
    expect(result.experienceLevel).toBe('Expert');
    expect(result.budgetText).toBe('$25.00 - $45.00 · Hourly');
  });

  it('keeps words apart at line breaks and drops the More toggle', () => {
    const result = extractJobPost(loadDocument('upwork-slider-2026.html'), url);
    if (!('description' in result)) throw new Error('expected a job');
    expect(result.description.startsWith('Hello, We need a Telegram bot')).toBe(true);
    expect(result.description).toContain('REST API. - Node.js preferred - Must handle payments');
    expect(result.description).not.toMatch(/More$/);
  });

  it('treats the feed without an open job as not a job page', () => {
    const doc = loadDocument('upwork-slider-2026.html');
    doc.querySelector('[data-test="drawer"]')?.remove();
    expect(extractJobPost(doc, 'https://www.upwork.com/nx/find-work/')).toMatchObject({
      code: 'NOT_A_JOB_PAGE',
    });
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
