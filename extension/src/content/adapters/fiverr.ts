import type { ExtractError, JobPost } from '../../shared/types';
import {
  allTexts,
  firstText,
  hasAny,
  normalizeDescription,
} from './normalize';
import { fiverrSelectors } from './selectors';
import type { Adapter } from './types';

export const fiverrAdapter: Adapter = {
  name: 'fiverr',
  canHandle(url: string) {
    try {
      return new URL(url).hostname === 'www.fiverr.com';
    } catch {
      return false;
    }
  },
  extract(document: Document, url: string): JobPost | ExtractError {
    if (!hasAny(document, fiverrSelectors.jobPageMarker)) {
      return {
        code: 'NOT_A_JOB_PAGE',
        message: 'This Fiverr page does not look like a job post.',
      };
    }

    const title = firstText(document, fiverrSelectors.title);
    const rawDescription = firstText(document, fiverrSelectors.description);
    if (!title || !rawDescription) {
      return {
        code: 'EXTRACTION_FAILED',
        message: 'Could not find a job title or description on this page.',
      };
    }

    const { description, truncated } = normalizeDescription(rawDescription);
    const budgetText = firstText(document, fiverrSelectors.budget) ?? undefined;
    const skills = allTexts(document, fiverrSelectors.skills);

    return {
      platform: 'fiverr',
      url,
      title,
      description,
      budgetText,
      skills,
      extractedAt: new Date().toISOString(),
      truncated,
    };
  },
};
