import type { ChatMessage, Conversation, ExtractError, JobPost } from '../../shared/types';
import {
  allTexts,
  collapseWhitespace,
  firstText,
  hasAny,
  normalizeDescription,
  textWithBreaks,
} from './normalize';
import { fiverrBriefSelectors, fiverrChatSelectors, fiverrSelectors } from './selectors';
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

/** Limits that keep a request inside the backend's conversation size cap. */
const CHAT_MAX_MESSAGES = 60;
const CHAT_MAX_MESSAGE_CHARS = 3_900;
const CHAT_MAX_TOTAL_CHARS = 22_000;

function avatarUser(el: Element | null | undefined): string {
  return el?.getAttribute('data-track-value')?.trim() ?? '';
}

/** Message body without the sender's name, time and buttons. */
function messageText(node: Element): string {
  const clone = node.cloneNode(true) as Element;
  // A message with an avatar starts with the sender's display name; grouped
  // follow-up messages have neither.
  if (clone.querySelector(fiverrChatSelectors.avatar)) {
    clone.querySelector('p[data-track-tag="typography"]')?.remove();
  }
  clone.querySelectorAll(fiverrChatSelectors.chrome).forEach((el) => el.remove());
  return collapseWhitespace(textWithBreaks(clone));
}

/**
 * All messages of the open Fiverr inbox thread, labelled "client" / "me".
 * Usernames are used only to tell the two people apart and are not returned.
 */
export function extractFiverrConversation(
  document: Document,
  url: string,
): Conversation | null {
  if (!isInbox(url)) return null;
  const nodes = Array.from(document.querySelectorAll(fiverrChatSelectors.message));
  if (!nodes.length) return null;

  // The other person: shown in the details pane (fallback: any avatar outside
  // messages and the contact list that also sent a message).
  const senders = nodes.map((n) => avatarUser(n.querySelector(fiverrChatSelectors.avatar)));
  let client = avatarUser(
    document.querySelector(`${fiverrChatSelectors.detailsPane} ${fiverrChatSelectors.avatar}`),
  );
  if (!client || !senders.includes(client)) {
    // You: the first avatar on the page (top navigation), outside the thread.
    const me = avatarUser(
      Array.from(document.querySelectorAll(fiverrChatSelectors.avatar)).find(
        (el) =>
          !el.closest(fiverrChatSelectors.message) &&
          !el.closest(fiverrChatSelectors.contactList),
      ),
    );
    client = senders.find((s) => s && s !== me) ?? '';
  }

  const messages: ChatMessage[] = [];
  let lastSender = '';
  nodes.forEach((node, i) => {
    const sender = senders[i] || lastSender; // grouped messages repeat no avatar
    lastSender = sender;
    const text = messageText(node).slice(0, CHAT_MAX_MESSAGE_CHARS);
    if (!text) return;
    messages.push({ role: sender && sender === client ? 'client' : 'me', text });
  });

  // Keep the most recent messages within the size limits.
  const kept: ChatMessage[] = [];
  let total = 0;
  for (const m of messages.slice(-CHAT_MAX_MESSAGES).reverse()) {
    if (total + m.text.length > CHAT_MAX_TOTAL_CHARS) break;
    total += m.text.length;
    kept.unshift(m);
  }
  if (!kept.length) return null;

  return {
    platform: 'fiverr',
    url,
    messages: kept,
    clientMessages: kept.filter((m) => m.role === 'client').length,
    extractedAt: new Date().toISOString(),
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
