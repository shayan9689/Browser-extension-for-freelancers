import { extractJobPost } from '../src/content/adapters';
import {
  isGetJobPostRequest,
  isPingRequest,
  type ExtensionResponse,
} from '../src/shared/messages';
import { SITE_MATCHES } from '../src/shared/sites';

function currentUrl(): string {
  return window.location.href;
}

function handleMessage(
  message: unknown,
  sendResponse: (response: ExtensionResponse) => void,
): boolean {
  if (isPingRequest(message)) {
    sendResponse({
      type: 'PING_RESULT',
      title: document.title,
      url: currentUrl(),
    });
    return false;
  }

  if (isGetJobPostRequest(message)) {
    const result = extractJobPost(document, currentUrl(), {
      preferSelection: message.preferSelection === true,
    });
    if ('code' in result) {
      sendResponse({ type: 'JOB_POST_ERROR', error: result });
    } else {
      sendResponse({ type: 'JOB_POST', job: result });
    }
    return false;
  }

  return false;
}

function watchSpaNavigation(onNavigate: () => void): void {
  let last = currentUrl();
  let timer: ReturnType<typeof setTimeout> | undefined;

  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      const next = currentUrl();
      if (next !== last) {
        last = next;
        onNavigate();
      }
    }, 300);
  };

  const pushState = history.pushState.bind(history);
  history.pushState = (...args: Parameters<History['pushState']>) => {
    pushState(...args);
    schedule();
  };

  const replaceState = history.replaceState.bind(history);
  history.replaceState = (...args: Parameters<History['replaceState']>) => {
    replaceState(...args);
    schedule();
  };

  window.addEventListener('popstate', schedule);

  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}

export default defineContentScript({
  matches: [...SITE_MATCHES],
  main() {
    chrome.runtime.onMessage.addListener(
      (
        message: unknown,
        sender: chrome.runtime.MessageSender,
        sendResponse: (response: ExtensionResponse) => void,
      ) => {
        // Only accept messages from this extension.
        if (sender.id !== chrome.runtime.id) return false;
        return handleMessage(message, sendResponse);
      },
    );

    // Debounced SPA URL watcher — read-only; does not modify the DOM.
    watchSpaNavigation(() => {
      // No push to the panel; panel re-requests on demand / refresh.
    });
  },
});
