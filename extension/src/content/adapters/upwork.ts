import type { ExtractError, JobPost } from '../../shared/types';
import {
  allTexts,
  collapseWhitespace,
  firstText,
  hasAny,
  normalizeDescription,
  textWithBreaks,
} from './normalize';
import { upworkSelectors, upworkViewerSelectors } from './selectors';
import type { Adapter } from './types';

type Extracted = Pick<
  JobPost,
  'title' | 'description' | 'budgetText' | 'skills' | 'experienceLevel'
> | null;

function firstElement(root: ParentNode, selectors: readonly string[]): Element | null {
  for (const sel of selectors) {
    const el = root.querySelector(sel);
    if (el) return el;
  }
  return null;
}

/** Newer viewer: "Best matches" slider and job pages (Nov 2026). */
function extractViewer(document: Document): Extracted {
  const root = firstElement(document, upworkViewerSelectors.root);
  if (!root) return null;

  const title = firstText(root, upworkViewerSelectors.title);
  const descEl = firstElement(root, upworkViewerSelectors.description);
  const description = descEl
    ? collapseWhitespace(textWithBreaks(descEl)).replace(/\s*\b(More|Less)$/, '')
    : '';
  if (!title || !description) return null;

  let budgetText: string | undefined;
  for (const tile of Array.from(root.querySelectorAll(upworkViewerSelectors.metrics))) {
    if (!(tile.textContent ?? '').includes('$')) continue;
    const parts = Array.from(tile.querySelectorAll(':scope > div > span'))
      .map((el) => collapseWhitespace(el.textContent ?? ''))
      .filter(Boolean);
    budgetText = parts.length ? parts.join(' · ') : collapseWhitespace(tile.textContent ?? '');
    break;
  }

  return {
    title,
    description,
    budgetText,
    skills: allTexts(root, upworkViewerSelectors.skills),
    experienceLevel: firstText(root, upworkViewerSelectors.experience) ?? undefined,
  };
}

/** All description paragraphs, falling back to the container minus its label. */
function cardDescription(document: Document): string | null {
  const container = document.querySelector('[data-test="Description"]');
  if (container) {
    const paragraphs = Array.from(container.querySelectorAll('p'))
      .map((p) => collapseWhitespace(textWithBreaks(p)))
      .filter(Boolean);
    if (paragraphs.length) return paragraphs.join('\n\n');
    const text = collapseWhitespace(container.textContent ?? '').replace(/^Summary\s*/i, '');
    if (text) return text;
  }
  return firstText(document, upworkSelectors.description);
}

/** "$19.00 - $40.00 · Hourly" or "$500.00 · Fixed-price" from the features list. */
function cardBudget(document: Document): string | undefined {
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

/** Job details card on full job pages (and older layouts). */
function extractCard(document: Document): Extracted {
  const title = firstText(document, upworkSelectors.title) ?? titleFromDocument(document);
  const description = cardDescription(document);
  if (!title || !description) return null;
  return {
    title,
    description,
    budgetText: cardBudget(document),
    skills: allTexts(document, upworkSelectors.skills),
    experienceLevel: firstText(document, upworkSelectors.experience) ?? undefined,
  };
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

    const found = extractViewer(document) ?? extractCard(document);
    if (!found) {
      return {
        code: 'EXTRACTION_FAILED',
        message: 'Could not find a job title or description on this page.',
      };
    }

    const { description, truncated } = normalizeDescription(found.description);
    return {
      platform: 'upwork',
      url,
      ...found,
      description,
      extractedAt: new Date().toISOString(),
      truncated,
    };
  },
};
