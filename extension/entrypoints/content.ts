import { isPingRequest, type ExtensionResponse } from '../src/shared/messages';
import { SITE_MATCHES } from '../src/shared/sites';

export default defineContentScript({
  matches: [...SITE_MATCHES],
  main() {
    chrome.runtime.onMessage.addListener(
      (
        message: unknown,
        _sender: chrome.runtime.MessageSender,
        sendResponse: (response: ExtensionResponse) => void,
      ) => {
        if (!isPingRequest(message)) return false;

        sendResponse({
          type: 'PING_RESULT',
          title: document.title,
          url: window.location.href,
        });
        return false;
      },
    );
  },
});
