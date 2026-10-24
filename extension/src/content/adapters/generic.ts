import type { ExtractError, JobPost } from '../../shared/types';
import { normalizeDescription } from './normalize';
import type { Adapter } from './types';

export const genericAdapter: Adapter = {
  name: 'generic',
  canHandle() {
    return true;
  },
  extract(document: Document, url: string): JobPost | ExtractError {
    const selection = document.getSelection()?.toString().trim() ?? '';
    if (!selection) {
      return {
        code: 'EMPTY_SELECTION',
        message: 'Highlight the job text on the page, then try again.',
      };
    }

    const { description, truncated } = normalizeDescription(selection);
    const title =
      description.slice(0, 80).split(/[.!?\n]/)[0]?.trim() || 'Selected text';

    return {
      platform: 'generic',
      url,
      title,
      description,
      skills: [],
      extractedAt: new Date().toISOString(),
      truncated,
    };
  },
};
