/** Discriminated union of extension messages — zero `any`. */

export type PingRequest = {
  type: 'PING';
};

export type PingResponse = {
  type: 'PING_RESULT';
  title: string;
  url: string;
};

export type ContentErrorResponse = {
  type: 'CONTENT_ERROR';
  code: 'NO_CONTENT_SCRIPT' | 'UNKNOWN';
  message: string;
};

export type ExtensionRequest = PingRequest;
export type ExtensionResponse = PingResponse | ContentErrorResponse;

export function isPingRequest(msg: unknown): msg is PingRequest {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    'type' in msg &&
    (msg as { type: unknown }).type === 'PING'
  );
}

export function isExtensionResponse(msg: unknown): msg is ExtensionResponse {
  if (typeof msg !== 'object' || msg === null || !('type' in msg)) return false;
  const type = (msg as { type: unknown }).type;
  return type === 'PING_RESULT' || type === 'CONTENT_ERROR';
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
        'This page has no ProposalPilot content script. Open a supported freelance job site.',
    };
  }
}
