/**
 * Hand-off from the right-click menu (background) to the side panel.
 *
 * On sites without our content script, the panel cannot read the selection:
 * Chrome does not grant activeTab when the toolbar icon opens a side panel.
 * A context-menu click receives the selected text directly, so the background
 * stores it in chrome.storage.session and the panel picks it up.
 */

export const CONTEXT_MENU_ID = 'proposalpilot-draft-selection';
export const PENDING_SELECTION_KEY = 'pendingSelection';

/** Ignore hand-offs older than this (e.g. panel opened much later). */
export const PENDING_MAX_AGE_MS = 5 * 60 * 1000;

export type PendingSelection = {
  text: string;
  url: string;
  createdAt: number;
};

export function isPendingSelection(value: unknown): value is PendingSelection {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.text === 'string' &&
    typeof v.url === 'string' &&
    typeof v.createdAt === 'number'
  );
}

export function isFreshPending(
  pending: PendingSelection,
  now: number = Date.now(),
): boolean {
  const age = now - pending.createdAt;
  return age >= 0 && age <= PENDING_MAX_AGE_MS && pending.text.trim().length > 0;
}
