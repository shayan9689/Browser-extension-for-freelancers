import { loadStore } from '../src/shared/storage';
import {
  CONTEXT_MENU_ID,
  PENDING_SELECTION_KEY,
  type PendingSelection,
} from '../src/shared/pending';

export default defineBackground(() => {
  void chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch(() => undefined);

  chrome.runtime.onInstalled.addListener((details) => {
    // Recreate on install and update so the item never duplicates.
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({
        id: CONTEXT_MENU_ID,
        title: 'Draft proposal with ProposalPilot',
        contexts: ['selection'],
      });
    });

    void (async () => {
      const store = await loadStore();
      if (details.reason === 'install' || !store.onboardingComplete) {
        void chrome.runtime.openOptionsPage();
      }
    })();
  });

  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId !== CONTEXT_MENU_ID || tab?.id === undefined) return;
    // sidePanel.open() must run synchronously inside the click's user gesture.
    void chrome.sidePanel.open({ tabId: tab.id }).catch(() => undefined);
    const pending: PendingSelection = {
      text: info.selectionText ?? '',
      url: info.pageUrl ?? tab.url ?? '',
      createdAt: Date.now(),
    };
    void chrome.storage.session.set({ [PENDING_SELECTION_KEY]: pending });
  });
});
