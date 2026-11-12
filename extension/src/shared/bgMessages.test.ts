import { describe, expect, it } from 'vitest';
import {
  isAnalyzeMessage,
  isCancelGenerateMessage,
  isGenerateMessage,
  withSignOff,
} from './bgMessages';

describe('background messages', () => {
  it('recognises generate and cancel messages', () => {
    expect(
      isGenerateMessage({
        type: 'PP_GENERATE',
        requestId: 'r',
        payload: {},
        job: {},
        editedDescription: 'd',
      }),
    ).toBe(true);
    expect(isGenerateMessage({ type: 'PP_GENERATE', requestId: 'r' })).toBe(false);
    expect(isGenerateMessage({ type: 'GET_JOB_POST' })).toBe(false);
    expect(isCancelGenerateMessage({ type: 'PP_CANCEL_GENERATE', requestId: 'r' })).toBe(true);
    expect(isCancelGenerateMessage({ type: 'PP_CANCEL_GENERATE' })).toBe(false);
    expect(
      isAnalyzeMessage({ type: 'PP_ANALYZE', requestId: 'r', payload: {}, conversation: {} }),
    ).toBe(true);
    expect(isAnalyzeMessage({ type: 'PP_ANALYZE', requestId: 'r' })).toBe(false);
  });

  it('appends the sign-off once', () => {
    expect(withSignOff('Hello', 'Best, Alex')).toBe('Hello\n\nBest, Alex');
    expect(withSignOff('Hello\n\nBest, Alex', 'Best, Alex')).toBe('Hello\n\nBest, Alex');
    expect(withSignOff('Hello', '  ')).toBe('Hello');
    expect(withSignOff('Hello')).toBe('Hello');
  });
});
