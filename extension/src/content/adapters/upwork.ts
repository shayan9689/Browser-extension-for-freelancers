import type { ExtractError, JobPost } from '../../shared/types';
import {
  allTexts,
  collapseWhitespace,
  firstText,
  hasAny,
  normalizeDescription,
} from './normalize';
import { upworkSelectors } from './selectors';
import type { Adapter } from './types';

/** All description paragraphs, falling back to the container minus its label. */
function descriptionText(document: Document): string | null {
  const container = document.querySelector('[data-test="Description"]');
  if (container) {
    const paragraphs = Array.from(container.querySelectorAll('p'))
      .map((p) => collapseWhitespace(p.textContent ?? ''))
      .filter(Boolean);
    if (paragraphs.length) return paragraphs.join('\n\n');
    const text = collapseWhitespace(container.textContent ?? '').replace(/^Summary\s*/i, '');
    if (text) return text;
  }
  return firstText(document, upworkSelectors.description);
}

/** "$19.00 - $40.00 · Hourly" or "$500.00 · Fixed-price" from the features list. */
function budgetText(document: Document): string | undefined {
  for (const li of Array.from(document.querySelectorAll(upworkSelectors.features[0]))) {
    if (!(li.textContent ?? '').includes('$')) continue;
    const amounts = Array.from(li.querySelectorAll('strong'))
      .map((el) => collapseWhitespace(el.textContent ?? ''))
      .filter((t) => t.includes('$'));
    const kind = collapseWhitespace(li.querySelector('.description')?.textContent ?? '');
    if (amounts.length) return kind ? `${amounts.join(' - ')} · ${kind}` : amounts.join(' - ');
  }
  return firstText(document, upworkSelectors.budget) ?? undefined;
}

/** Page title looks like "Job title - Freelance Job in Category - Upwork". */
function titleFromDocument(document: Document): string | null {
  const title = collapseWhitespace(document.title ?? '');
  const first = title.split(/\s+-\s+/)[0]?.trim();
  return first && first.toLowerCase() !== 'upwork' ? first : null;
}

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

    const title = firstText(document, upworkSelectors.title) ?? titleFromDocument(document);
    const rawDescription = descriptionText(document);
    if (!title || !rawDescription) {
      return {
        code: 'EXTRACTION_FAILED',
        message: 'Could not find a job title or description on this page.',
      };
    }

    const { description, truncated } = normalizeDescription(rawDescription);
    const skills = allTexts(document, upworkSelectors.skills);
    const experienceLevel =
      firstText(document, upworkSelectors.experience) ?? undefined;

    return {
      platform: 'upwork',
      url,
      title,
      description,
      budgetText: budgetText(document),
      skills,
      experienceLevel,
      extractedAt: new Date().toISOString(),
      truncated,
    };
  },
};
