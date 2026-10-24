import type { ExtractError, JobPost } from './types';

/** Discriminated union of extension messages — zero `any`. */

export type PingRequest = { type: 'PING' };

export type PingResponse = {
  type: 'PING_RESULT';
  title: string;
  url: string;
};

export type GetJobPostRequest = {
  type: 'GET_JOB_POST';
  preferSelection?: boolean;
};

export type GetJobPostResponse =
  | { type: 'JOB_POST'; job: JobPost }
  | { type: 'JOB_POST_ERROR'; error: ExtractError };

export type ContentErrorResponse = {
  type: 'CONTENT_ERROR';
  code: 'NO_CONTENT_SCRIPT' | 'UNKNOWN';
  message: string;
};

export type ExtensionRequest = PingRequest | GetJobPostRequest;
export type ExtensionResponse =
  | PingResponse
  | GetJobPostResponse
  | ContentErrorResponse;

export function isPingRequest(msg: unknown): msg is PingRequest {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    'type' in msg &&
    (msg as { type: unknown }).type === 'PING'
  );
}

export function isGetJobPostRequest(msg: unknown): msg is GetJobPostRequest {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    'type' in msg &&
    (msg as { type: unknown }).type === 'GET_JOB_POST'
  );
}

export function isExtensionResponse(msg: unknown): msg is ExtensionResponse {
  if (typeof msg !== 'object' || msg === null || !('type' in msg)) return false;
  const type = (msg as { type: unknown }).type;
  return (
    type === 'PING_RESULT' ||
    type === 'CONTENT_ERROR' ||
    type === 'JOB_POST' ||
    type === 'JOB_POST_ERROR'
  );
}

/**
 * Send a typed message to the active tab's content script.
 * Resolves with a friendly error if no content script is present.
 */
export async function sendToActiveTab(
  request: ExtensionRequest,
): Promise<ExtensionResponse> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id === undefined) {
    return {
      type: 'CONTENT_ERROR',
      code: 'NO_CONTENT_SCRIPT',
      message: 'No active tab found.',
    };
  }

  try {
    const response: unknown = await chrome.tabs.sendMessage(tab.id, request);
    if (isExtensionResponse(response)) return response;
    return {
      type: 'CONTENT_ERROR',
      code: 'UNKNOWN',
      message: 'Unexpected response from the page.',
    };
  } catch {
    return {
      type: 'CONTENT_ERROR',
      code: 'NO_CONTENT_SCRIPT',
      message:
        'This page has no ProposalPilot content script. Open a supported freelance job site, or use selected text.',
    };
  }
}

/** Read selected text via scripting.executeScript (activeTab). */
export async function getSelectedTextFromActiveTab(): Promise<string> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id === undefined) return '';

  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => window.getSelection()?.toString() ?? '',
  });

  const first = results[0]?.result;
  return typeof first === 'string' ? first : '';
}
