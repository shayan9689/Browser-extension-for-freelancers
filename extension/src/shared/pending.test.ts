import { describe, expect, it } from 'vitest';
import {
  PENDING_MAX_AGE_MS,
  isFreshPending,
  isPendingSelection,
  type PendingSelection,
} from './pending';

const base: PendingSelection = {
  text: 'Build a FastAPI webhook service',
  url: 'https://example.com/job',
  createdAt: 1_000_000,
};

describe('pending selection hand-off', () => {
  it('accepts a well-formed hand-off', () => {
    expect(isPendingSelection(base)).toBe(true);
  });

  it('rejects malformed values', () => {
    expect(isPendingSelection(null)).toBe(false);
    expect(isPendingSelection('text')).toBe(false);
    expect(isPendingSelection({ ...base, createdAt: 'now' })).toBe(false);
    expect(isPendingSelection({ text: 'x', url: 'y' })).toBe(false);
  });

  it('is fresh only within the max age and with text', () => {
    expect(isFreshPending(base, base.createdAt + 1000)).toBe(true);
    expect(isFreshPending(base, base.createdAt + PENDING_MAX_AGE_MS + 1)).toBe(false);
    expect(isFreshPending(base, base.createdAt - 1)).toBe(false);
    expect(isFreshPending({ ...base, text: '   ' }, base.createdAt)).toBe(false);
  });
});
