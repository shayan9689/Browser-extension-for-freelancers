import type { Conversation, ExtractError, JobPost } from '../../shared/types';
import { extractFiverrConversation, fiverrAdapter } from './fiverr';
import { genericAdapter } from './generic';
import { upworkAdapter } from './upwork';
import type { Adapter } from './types';

const siteAdapters: Adapter[] = [fiverrAdapter, upworkAdapter];

export function extractJobPost(
  document: Document,
  url: string,
  options?: { preferSelection?: boolean },
): JobPost | ExtractError {
  if (options?.preferSelection) {
    return genericAdapter.extract(document, url);
  }

  const adapter = siteAdapters.find((a) => a.canHandle(url));
  if (!adapter) {
    return genericAdapter.extract(document, url);
  }
  return adapter.extract(document, url);
}

/** The open conversation thread, on sites that have one (Fiverr inbox). */
export function extractConversation(document: Document, url: string): Conversation | null {
  return extractFiverrConversation(document, url);
}

export { fiverrAdapter, upworkAdapter, genericAdapter };
