/**
 * Upwork "Submit a proposal" page (/ab/proposals/job/~id/apply/): job details and the
 * client's screening questions. Read-only: nothing on the page is clicked or typed.
 *
 * The visible description is truncated ("more"), so the full text is taken from the
 * page's Nuxt data (a JSON script tag, serialized with devalue), when available.
 */
import type { JobPost } from '../../shared/types';
import { allTexts, collapseWhitespace, textWithBreaks } from './normalize';

export const upworkApplySelectors = {
  root: '.fe-job-details',
  title: '.fe-job-details h3',
  description: '.fe-job-details .description',
  skills: ['.fe-job-details .air3-token'],
  features: '.fe-job-details .fe-ui-job-features li',
  questionsArea: '.fe-proposal-job-questions',
  nuxtData: 'script[type="application/json"][data-nuxt-data]',
} as const;

type Payload = unknown[];

/** devalue wrappers Nuxt uses for reactive state, e.g. ["Reactive", 12]. */
const WRAPPERS = new Set([
  'Reactive',
  'ShallowReactive',
  'Ref',
  'ShallowRef',
  'EmptyRef',
]);

export function readNuxtPayload(document: Document): Payload | null {
  const script = document.querySelector(upworkApplySelectors.nuxtData);
  if (!script?.textContent) return null;
  try {
    const data: unknown = JSON.parse(script.textContent);
    return Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

/** Resolve an index in a devalue payload into a plain value (bounded depth). */
export function resolve(data: Payload, index: unknown, depth = 0): unknown {
  if (typeof index !== 'number' || index < 0 || index >= data.length || depth > 6) {
    return undefined;
  }
  const value = data[index];
  if (Array.isArray(value)) {
    if (typeof value[0] === 'string' && WRAPPERS.has(value[0])) {
      return resolve(data, value[1], depth + 1);
    }
    return value.map((i) => resolve(data, i, depth + 1));
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, i] of Object.entries(value)) out[k] = resolve(data, i, depth + 1);
    return out;
  }
  return value;
}

/** The longest string in the payload that starts like the visible (truncated) text. */
export function fullDescription(data: Payload, visible: string): string | null {
  const prefix = collapseWhitespace(visible).slice(0, 50);
  if (prefix.length < 20) return null;
  let best: string | null = null;
  for (const value of data) {
    if (typeof value !== 'string' || value.length <= prefix.length) continue;
    if (!collapseWhitespace(value.slice(0, 200)).startsWith(prefix)) continue;
    if (!best || value.length > best.length) best = value;
  }
  return best;
}

const QUESTION_KEYS = ['question', 'text', 'label', 'title', 'description', 'content'];

function questionText(item: unknown): string | null {
  if (typeof item === 'string') return item.trim() || null;
  if (!item || typeof item !== 'object') return null;
  const obj = item as Record<string, unknown>;
  for (const key of QUESTION_KEYS) {
    const v = obj[key];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return null;
}

/** Screening questions from any non-empty `questions` list in the payload. */
export function payloadQuestions(data: Payload): string[] {
  const found: string[] = [];
  for (let i = 0; i < data.length; i++) {
    const value = data[i];
    if (
      !value ||
      typeof value !== 'object' ||
      Array.isArray(value) ||
      !('questions' in value)
    ) {
      continue;
    }
    let list = resolve(data, i);
    // Unwrap nested { questions: { questions: [...] } } shapes.
    for (
      let n = 0;
      n < 3 && list && typeof list === 'object' && !Array.isArray(list);
      n++
    ) {
      list = (list as Record<string, unknown>).questions;
    }
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      const text = questionText(item);
      if (text && !found.includes(text)) found.push(text);
    }
  }
  return found;
}

/** Labels of the answer boxes in the questions area of the form. */
export function domQuestions(document: Document): string[] {
  const area = document.querySelector(upworkApplySelectors.questionsArea);
  if (!area) return [];
  const found: string[] = [];
  for (const field of Array.from(area.querySelectorAll('textarea, input[type="text"]'))) {
    const ids = field.getAttribute('aria-labelledby')?.split(/\s+/) ?? [];
    let label = ids.map((id) => document.getElementById(id)?.textContent ?? '').join(' ');
    if (!label.trim() && field.id) {
      const forLabel = Array.from(document.querySelectorAll('label')).find(
        (l) => l.getAttribute('for') === field.id,
      );
      label = forLabel?.textContent ?? '';
    }
    if (!label.trim()) {
      const group =
        field.closest('.form-group, fieldset, li, section') ?? field.parentElement;
      label = group?.querySelector('label, legend, strong, h4, h5, p')?.textContent ?? '';
    }
    const text = collapseWhitespace(label);
    if (text && !found.includes(text)) found.push(text);
  }
  return found;
}

function visibleDescription(document: Document): string {
  const el = document.querySelector(upworkApplySelectors.description);
  if (!el) return '';
  const clone = el.cloneNode(true) as Element;
  clone
    .querySelectorAll('button, .air3-truncation-labels, .sr-only')
    .forEach((n) => n.remove());
  return collapseWhitespace(textWithBreaks(clone)).replace(/\s*(…|\.\.\.|�)\s*$/, '');
}

/** "Fixed-price" / "Hourly" budget and the experience level from the sidebar. */
function features(document: Document): { budgetText?: string; experienceLevel?: string } {
  let budgetText: string | undefined;
  let experienceLevel: string | undefined;
  for (const li of Array.from(document.querySelectorAll(upworkApplySelectors.features))) {
    const value = collapseWhitespace(li.querySelector('strong')?.textContent ?? '');
    const label = collapseWhitespace(li.querySelector('small')?.textContent ?? '');
    if (!value) continue;
    if (/experience/i.test(label)) experienceLevel = value;
    else if (!budgetText && value.includes('$')) {
      budgetText = label ? `${value} · ${label}` : value;
    }
  }
  return { budgetText, experienceLevel };
}

export type ApplyExtract = Pick<
  JobPost,
  'title' | 'description' | 'budgetText' | 'skills' | 'experienceLevel' | 'questions'
>;

export function isApplyPage(document: Document): boolean {
  return Boolean(document.querySelector(upworkApplySelectors.root));
}

export function extractApply(document: Document): ApplyExtract | null {
  const title = collapseWhitespace(
    document.querySelector(upworkApplySelectors.title)?.textContent ?? '',
  );
  const visible = visibleDescription(document);
  if (!title || !visible) return null;

  const data = readNuxtPayload(document);
  const description = (data && fullDescription(data, visible)) || visible;
  const questions = [...(data ? payloadQuestions(data) : [])];
  for (const q of domQuestions(document)) if (!questions.includes(q)) questions.push(q);

  return {
    title,
    description,
    skills: allTexts(document, upworkApplySelectors.skills),
    ...features(document),
    questions: questions.slice(0, 10),
  };
}
