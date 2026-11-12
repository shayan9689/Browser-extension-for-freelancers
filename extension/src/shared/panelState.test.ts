import { describe, expect, it } from 'vitest';
import {
  GENERATING_STALE_MS,
  isPersistedPanel,
  restorableState,
  stateUrl,
  type PersistedPanel,
} from './panelState';
import type { JobPost } from './types';

const job: JobPost = {
  platform: 'generic',
  url: 'https://example.com',
  title: 'T',
  description: 'D',
  skills: [],
  extractedAt: '2026-11-12T00:00:00.000Z',
  truncated: false,
};

function saved(state: PersistedPanel['state'], updatedAt = 1_000): PersistedPanel {
  return { state, tone: 'friendly', length: 'short', updatedAt };
}

describe('panel state persistence', () => {
  it('validates the stored shape', () => {
    expect(isPersistedPanel(saved({ status: 'idle' }))).toBe(true);
    expect(isPersistedPanel(null)).toBe(false);
    expect(isPersistedPanel({ state: { status: 'idle' }, tone: 'x', length: 'y' })).toBe(false);
    expect(isPersistedPanel(saved({ status: 'bogus' } as never))).toBe(false);
  });

  it('never restores a half-finished detection', () => {
    expect(restorableState(saved({ status: 'detecting' }))).toEqual({ status: 'idle' });
  });

  it('keeps a recent generation and drops an orphaned one', () => {
    const generating = saved({
      status: 'generating',
      job,
      editedDescription: 'D',
      requestId: 'r1',
    });
    expect(restorableState(generating, 1_000 + 5_000).status).toBe('generating');
    expect(restorableState(generating, 1_000 + GENERATING_STALE_MS + 1)).toEqual({
      status: 'ready',
      job,
      editedDescription: 'D',
    });
  });

  it('restores results unchanged', () => {
    const state = {
      status: 'result' as const,
      job,
      editedDescription: 'D',
      result: {
        proposal: 'P',
        suggested_price: { amount: 1, currency: 'USD', rationale: 'r' },
        delivery_days: 2,
        questions_to_ask: [],
        warnings: [],
      },
      draft: 'P',
      tone: 'friendly' as const,
      length: 'short' as const,
    };
    expect(restorableState(saved(state))).toBe(state);
  });

  it('drops an orphaned chat check back to the conversation', () => {
    const conversation = {
      platform: 'fiverr' as const,
      url: 'https://www.fiverr.com/inbox/x',
      messages: [{ role: 'client' as const, text: 'hi' }],
      clientMessages: 1,
      extractedAt: '2026-11-13T00:00:00.000Z',
    };
    const analyzing = saved({ status: 'analyzing', conversation, requestId: 'a1' });
    expect(restorableState(analyzing, 1_000 + 1_000).status).toBe('analyzing');
    expect(restorableState(analyzing, 1_000 + GENERATING_STALE_MS + 1)).toEqual({
      status: 'conversation',
      conversation,
    });
    expect(stateUrl(analyzing.state)).toBe(conversation.url);
    expect(stateUrl({ status: 'ready', job, editedDescription: 'D' })).toBe(job.url);
    expect(stateUrl({ status: 'idle' })).toBeUndefined();
  });
});
