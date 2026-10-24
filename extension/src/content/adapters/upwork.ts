import type { ExtractError, JobPost } from '../../shared/types';
import {
  allTexts,
  firstText,
  hasAny,
  normalizeDescription,
} from './normalize';
import { upworkSelectors } from './selectors';
import type { Adapter } from './types';

export const upworkAdapter: Adapter = {
  name: 'upwork',
  canHandle(url: string) {
    try {
      return new URL(url).hostname === 'www.upwork.com';
    } catch {
      return false;
    }
  },
  extract(document: Document, url: string): JobPost | ExtractError {
    if (!hasAny(document, upworkSelectors.jobPageMarker)) {
      return {
        code: 'NOT_A_JOB_PAGE',
        message: 'This Upwork page does not look like a job post.',
      };
    }

    const title = firstText(document, upworkSelectors.title);
    const rawDescription = firstText(document, upworkSelectors.description);
    if (!title || !rawDescription) {
      return {
        code: 'EXTRACTION_FAILED',
        message: 'Could not find a job title or description on this page.',
      };
    }

    const { description, truncated } = normalizeDescription(rawDescription);
    const budgetText = firstText(document, upworkSelectors.budget) ?? undefined;
    const skills = allTexts(document, upworkSelectors.skills);
    const experienceLevel =
      firstText(document, upworkSelectors.experience) ?? undefined;

    return {
      platform: 'upwork',
      url,
      title,
      description,
      budgetText,
      skills,
      experienceLevel,
      extractedAt: new Date().toISOString(),
      truncated,
    };
  },
};
