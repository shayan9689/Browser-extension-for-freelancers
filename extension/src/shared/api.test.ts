import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, generateProposal } from './api';

describe('generateProposal', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('maps network failures', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    );
    await expect(
      generateProposal({
        install_id: '11111111-1111-4111-8111-111111111111',
        job: {
          platform: 'generic',
          title: 't',
          description: 'd',
          skills: [],
        },
        profile: {
          name: 'n',
          headline: 'h',
          skills: [],
          years_experience: 1,
          currency: 'USD',
          highlights: [],
        },
        options: { tone: 'friendly', length: 'short' },
      }),
    ).rejects.toBeInstanceOf(ApiError);
  });

  it('maps rate limit', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: { code: 'RATE_LIMITED', message: 'wait' } }), {
          status: 429,
          headers: { 'Retry-After': '30' },
        }),
      ),
    );
    try {
      await generateProposal({
        install_id: '11111111-1111-4111-8111-111111111111',
        job: {
          platform: 'generic',
          title: 't',
          description: 'd',
          skills: [],
        },
        profile: {
          name: 'n',
          headline: 'h',
          skills: [],
          years_experience: 1,
          currency: 'USD',
          highlights: [],
        },
        options: { tone: 'friendly', length: 'short' },
      });
      expect.fail('should throw');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).code).toBe('RATE_LIMITED');
      expect((err as ApiError).retryAfterSeconds).toBe(30);
    }
  });
});
