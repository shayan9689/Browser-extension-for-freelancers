import { describe, expect, it } from 'vitest';
import {
  isExtensionResponse,
  isPingRequest,
  type PingRequest,
  type PingResponse,
} from './messages';

describe('messages helpers', () => {
  it('accepts a valid PING request', () => {
    const msg: PingRequest = { type: 'PING' };
    expect(isPingRequest(msg)).toBe(true);
  });

  it('rejects non-PING messages', () => {
    expect(isPingRequest({ type: 'OTHER' })).toBe(false);
    expect(isPingRequest(null)).toBe(false);
    expect(isPingRequest('PING')).toBe(false);
  });

  it('accepts PING_RESULT and CONTENT_ERROR responses', () => {
    const ok: PingResponse = {
      type: 'PING_RESULT',
      title: 'Hello',
      url: 'https://www.fiverr.com/job/1',
    };
    expect(isExtensionResponse(ok)).toBe(true);
    expect(
      isExtensionResponse({
        type: 'CONTENT_ERROR',
        code: 'NO_CONTENT_SCRIPT',
        message: 'missing',
      }),
    ).toBe(true);
  });

  it('rejects unknown response shapes', () => {
    expect(isExtensionResponse({ type: 'PING' })).toBe(false);
    expect(isExtensionResponse({})).toBe(false);
  });
});
