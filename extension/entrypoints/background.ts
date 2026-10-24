import { loadStore } from '../src/shared/storage';

export default defineBackground(() => {
  void chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch(() => undefined);

  chrome.runtime.onInstalled.addListener((details) => {
    void (async () => {
      const store = await loadStore();
      if (details.reason === 'install' || !store.onboardingComplete) {
        void chrome.runtime.openOptionsPage();
      }
    })();
  });
});
