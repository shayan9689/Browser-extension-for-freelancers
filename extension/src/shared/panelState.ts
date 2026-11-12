/**
 * Panel state shared by the popup, the side panel and the background worker.
 *
 * The popup is destroyed whenever it loses focus (e.g. when the user clicks
 * into the marketplace's proposal box), so the current screen lives in
 * chrome.storage.session and generation runs in the background worker.
 */
import type { Length, ProposalApiResponse, Tone } from './api';
import type { Conversation, JobPost } from './types';

export type UiError = {
  code: string;
  message: string;
  retryAfterSeconds?: number;
};

export type PanelState =
  | { status: 'idle' }
  | { status: 'detecting' }
  /** A chat was found; it is sent to the AI only when the user asks. */
  | { status: 'conversation'; conversation: Conversation }
  | { status: 'analyzing'; conversation: Conversation; requestId: string }
  | { status: 'no-project'; conversation: Conversation; reason: string }
  | { status: 'ready'; job: JobPost; editedDescription: string }
  | {
      status: 'generating';
      job: JobPost;
      editedDescription: string;
      requestId: string;
    }
  | {
      status: 'result';
      job: JobPost;
      editedDescription: string;
      result: ProposalApiResponse;
      draft: string;
      tone: Tone;
      length: Length;
    }
  | {
      status: 'error';
      error: UiError;
      job?: JobPost;
      editedDescription?: string;
    };

export type PersistedPanel = {
  state: PanelState;
  tone: Tone;
  length: Length;
  updatedAt: number;
};

export const PANEL_STATE_KEY = 'panelState';

/** A "generating" screen older than this was orphaned (worker restarted). */
export const GENERATING_STALE_MS = 90_000;

const STATUSES = new Set([
  'idle',
  'detecting',
  'conversation',
  'analyzing',
  'no-project',
  'ready',
  'generating',
  'result',
  'error',
]);

export function isPersistedPanel(value: unknown): value is PersistedPanel {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  const state = v.state as Record<string, unknown> | undefined;
  return (
    typeof v.updatedAt === 'number' &&
    typeof v.tone === 'string' &&
    typeof v.length === 'string' &&
    typeof state === 'object' &&
    state !== null &&
    typeof state.status === 'string' &&
    STATUSES.has(state.status)
  );
}

/** The state to show when a popup or panel reopens. */
export function restorableState(saved: PersistedPanel, now: number = Date.now()): PanelState {
  const { state } = saved;
  if (state.status === 'detecting') return { status: 'idle' };
  if (state.status === 'generating' && now - saved.updatedAt > GENERATING_STALE_MS) {
    return { status: 'ready', job: state.job, editedDescription: state.editedDescription };
  }
  if (state.status === 'analyzing' && now - saved.updatedAt > GENERATING_STALE_MS) {
    return { status: 'conversation', conversation: state.conversation };
  }
  return state;
}

function hasSessionStorage(): boolean {
  return typeof chrome !== 'undefined' && Boolean(chrome.storage?.session);
}

export async function readPanel(): Promise<PersistedPanel | null> {
  if (!hasSessionStorage()) return null;
  try {
    const data = await chrome.storage.session.get(PANEL_STATE_KEY);
    const value: unknown = data[PANEL_STATE_KEY];
    return isPersistedPanel(value) ? value : null;
  } catch {
    return null;
  }
}

export async function writePanel(panel: PersistedPanel): Promise<void> {
  if (!hasSessionStorage()) return;
  try {
    await chrome.storage.session.set({ [PANEL_STATE_KEY]: panel });
  } catch {
    // Session storage is a convenience; the UI keeps working without it.
  }
}

/** The page a state belongs to, used to notice the user moved to another job. */
export function stateUrl(state: PanelState): string | undefined {
  if ('job' in state && state.job) return state.job.url;
  if ('conversation' in state) return state.conversation.url;
  return undefined;
}
