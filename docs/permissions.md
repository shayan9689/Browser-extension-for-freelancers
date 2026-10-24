# Chrome permission justifications

| Permission / match | Why it is needed | What breaks if removed |
|--------------------|------------------|------------------------|
| `storage` | Persist profile, history, install_id, onboarding flag in `chrome.storage.local` | Profile and history reset every session |
| `sidePanel` | Keep the drafting UI open while reading a job post | Cannot open the product UI as a side panel |
| `activeTab` | On user gesture, read the active tab URL/title and selected text | Selection fallback and tab context fail |
| `scripting` | `executeScript` to read `window.getSelection()` for the generic fallback | “Use selected text” stops working on non-matched pages |
| `https://www.fiverr.com/*` (content script) | Inject read-only extractor on Fiverr job pages the user opens | Fiverr auto-detection fails |
| `https://www.upwork.com/*` (content script) | Inject read-only extractor on Upwork job pages the user opens | Upwork auto-detection fails |

No broad `<all_urls>` host permission. No remote code. Default MV3 CSP is not weakened.
