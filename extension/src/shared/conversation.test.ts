import { describe, expect, it } from 'vitest';
import { jobFromAnalysis } from './conversation';
import type { Conversation } from './types';

const conversation: Conversation = {
  platform: 'fiverr',
  url: 'https://www.fiverr.com/inbox/x',
  messages: [{ role: 'client', text: 'I need a logo' }],
  clientMessages: 1,
  extractedAt: '2026-11-13T00:00:00.000Z',
};

describe('jobFromAnalysis', () => {
  it('builds a reviewable job card from the analysis', () => {
    const job = jobFromAnalysis(conversation, {
      has_project: true,
      title: ' Logo for a bakery ',
      summary: 'The client wants a modern logo.',
      requirements: ['Vector files', 'Two concepts'],
      budget_text: '$40',
      deadline: 'Friday',
      reason: 'r',
    });
    expect(job.platform).toBe('fiverr');
    expect(job.url).toBe(conversation.url);
    expect(job.title).toBe('Logo for a bakery');
    expect(job.budgetText).toBe('$40');
    expect(job.description).toBe(
      'The client wants a modern logo.\n\nRequirements:\n- Vector files\n- Two concepts\n\nDeadline: Friday',
    );
  });

  it('falls back to a generic title and skips empty parts', () => {
    const job = jobFromAnalysis(conversation, {
      has_project: true,
      title: '',
      summary: 'Fix my site.',
      requirements: [],
      budget_text: null,
      deadline: null,
      reason: '',
    });
    expect(job.title).toBe('Project from conversation');
    expect(job.description).toBe('Fix my site.');
    expect(job.budgetText).toBeUndefined();
  });
});
