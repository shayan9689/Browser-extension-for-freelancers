import { describe, expect, it } from 'vitest';
import { parseQuestions } from './views';

describe('parseQuestions', () => {
  it('splits lines, strips numbering and bullets, drops blanks', () => {
    expect(
      parseQuestions('1. How soon can you start?\n\n- Share similar work\n•  Rate?  '),
    ).toEqual(['How soon can you start?', 'Share similar work', 'Rate?']);
  });

  it('keeps at most 10 questions', () => {
    const text = Array.from({ length: 12 }, (_, i) => `Q${i}`).join('\n');
    expect(parseQuestions(text)).toHaveLength(10);
  });
});
