import type { ExtractError, JobPost } from '../../shared/types';
import {
  allTexts,
  collapseWhitespace,
  firstText,
  hasAny,
  normalizeDescription,
  textWithBreaks,
} from './normalize';
import { fiverrBriefSelectors, fiverrSelectors } from './selectors';
import type { Adapter } from './types';

function text(el: Element | null | undefined): string {
  return el ? collapseWhitespace(el.textContent ?? '') : '';
}

/** The newest "Custom Order Request" in an inbox conversation, if any. */
function extractBrief(document: Document, url: string): JobPost | null {
  const entries = document.querySelectorAll(fiverrBriefSelectors.entry);
  const entry = entries[entries.length - 1];
  const body = entry?.querySelector(fiverrBriefSelectors.body);
  if (!entry || !body) return null;

  // The buyer's message is a paragraph directly inside the brief card.
  const message = Array.from(body.children)
    .filter((el) => el.tagName === 'P')
    .map((el) => collapseWhitespace(textWithBreaks(el)))
    .filter(Boolean)
    .join('\n\n');
  if (!message) return null;

  const specs = Array.from(body.querySelectorAll(fiverrBriefSelectors.specValues))
    .map((p) => text(p))
    .filter(Boolean);
  const budgetLine =
    text(
      body
        .querySelector(fiverrBriefSelectors.budgetIcon)
        ?.closest('section > div')
        ?.querySelector('p'),
    ) || specs.find((s) => /budget|\$/i.test(s));
  const budgetText = budgetLine?.replace(/^budget\s*/i, '') || undefined;

  const label = text(entry.querySelector('article > p')) || 'Custom Order Request';
  const details = specs.length ? `\n\nRequest details: ${specs.join('; ')}` : '';
  const { description, truncated } = normalizeDescription(`${message}${details}`);

  return {
    platform: 'fiverr',
    url,
    title: label,
    description,
    budgetText,
    skills: [],
    extractedAt: new Date().toISOString(),
    truncated,
  };
}

function isInbox(url: string): boolean {
  try {
    return new URL(url).pathname.startsWith('/inbox');
  } catch {
    return false;
  }
}

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
    const brief = extractBrief(document, url);
    if (brief) return brief;

    if (isInbox(url)) {
      return {
        code: 'NOT_A_JOB_PAGE',
        message:
          "No custom order request in this conversation. Highlight the buyer's message and click Use selected text.",
      };
    }

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
