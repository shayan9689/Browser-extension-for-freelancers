export default defineBackground(() => {
  void chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch(() => {
      // Side panel API unavailable in unexpected contexts; ignore.
    });
});
