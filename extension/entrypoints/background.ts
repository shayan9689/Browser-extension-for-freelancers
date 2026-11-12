import { ApiError, analyzeConversation, generateProposal } from '../src/shared/api';
import {
  isAnalyzeMessage,
  isCancelGenerateMessage,
  isGenerateMessage,
  withSignOff,
  type AnalyzeMessage,
  type GenerateMessage,
} from '../src/shared/bgMessages';
import { jobFromAnalysis } from '../src/shared/conversation';
import { readPanel, writePanel, type PanelState } from '../src/shared/panelState';
import {
  CONTEXT_MENU_ID,
  PENDING_SELECTION_KEY,
  type PendingSelection,
} from '../src/shared/pending';
import { addHistoryItem, loadStore } from '../src/shared/storage';

/** In-flight generations, so the UI can cancel them. */
const running = new Map<string, AbortController>();

/** Write the outcome only if the UI is still waiting for this request. */
async function finishIfCurrent(requestId: string, next: PanelState): Promise<boolean> {
  const saved = await readPanel();
  const waiting =
    saved &&
    (saved.state.status === 'generating' || saved.state.status === 'analyzing') &&
    saved.state.requestId === requestId;
  if (!saved || !waiting) return false;
  await writePanel({ ...saved, state: next, updatedAt: Date.now() });
  return true;
}

async function runGeneration(msg: GenerateMessage): Promise<void> {
  const controller = new AbortController();
  running.set(msg.requestId, controller);
  const { job, editedDescription } = msg;
  try {
    const result = await generateProposal(msg.payload, controller.signal);
    const draft = withSignOff(result.proposal, msg.signOff);
    const shown = await finishIfCurrent(msg.requestId, {
      status: 'result',
      job,
      editedDescription,
      result,
      draft,
      tone: msg.tone,
      length: msg.length,
    });
    if (shown) {
      await addHistoryItem({
        id: crypto.randomUUID(),
        jobTitle: job.title,
        platform: job.platform,
        createdAt: new Date().toISOString(),
        proposal: draft,
        priceAmount: result.suggested_price.amount,
        priceCurrency: result.suggested_price.currency,
      });
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return;
    const error =
      err instanceof ApiError
        ? { code: err.code, message: err.message, retryAfterSeconds: err.retryAfterSeconds }
        : { code: 'NETWORK', message: 'Unexpected error while generating.' };
    await finishIfCurrent(msg.requestId, { status: 'error', error, job, editedDescription });
  } finally {
    running.delete(msg.requestId);
  }
}

async function runAnalysis(msg: AnalyzeMessage): Promise<void> {
  const controller = new AbortController();
  running.set(msg.requestId, controller);
  const { conversation } = msg;
  try {
    const analysis = await analyzeConversation(msg.payload, controller.signal);
    if (analysis.has_project) {
      const job = jobFromAnalysis(conversation, analysis);
      await finishIfCurrent(msg.requestId, {
        status: 'ready',
        job,
        editedDescription: job.description,
      });
    } else {
      await finishIfCurrent(msg.requestId, {
        status: 'no-project',
        conversation,
        reason: analysis.reason,
      });
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return;
    const error =
      err instanceof ApiError
        ? { code: err.code, message: err.message, retryAfterSeconds: err.retryAfterSeconds }
        : { code: 'NETWORK', message: 'Unexpected error while checking the chat.' };
    await finishIfCurrent(msg.requestId, { status: 'error', error });
  } finally {
    running.delete(msg.requestId);
  }
}

export default defineBackground(() => {
  // The toolbar icon opens the popup; the side panel opens from its button.
  void chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: false })
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
    if (info.menuItemId !== CONTEXT_MENU_ID) return;
    const pending: PendingSelection = {
      text: info.selectionText ?? '',
      url: info.pageUrl ?? tab?.url ?? '',
      createdAt: Date.now(),
    };
    void chrome.storage.session.set({ [PENDING_SELECTION_KEY]: pending });
    // Open the popup (an open side panel also picks the selection up).
    // If Chrome refuses, flag the icon so the user knows to click it.
    void chrome.action.openPopup().catch(() => {
      void chrome.action.setBadgeBackgroundColor({ color: '#14b8a6' });
      void chrome.action.setBadgeText({ text: '1' });
    });
  });

  chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
    // Only our own extension pages (popup, side panel) may start generation.
    // Content scripts share our extension id but report the web page's URL.
    const fromOwnPage =
      sender.id === chrome.runtime.id &&
      (sender.url ?? '').startsWith(chrome.runtime.getURL(''));
    if (!fromOwnPage) return false;
    if (isGenerateMessage(message)) {
      void runGeneration(message);
      sendResponse({ ok: true });
      return false;
    }
    if (isAnalyzeMessage(message)) {
      void runAnalysis(message);
      sendResponse({ ok: true });
      return false;
    }
    if (isCancelGenerateMessage(message)) {
      running.get(message.requestId)?.abort();
      running.delete(message.requestId);
      sendResponse({ ok: true });
      return false;
    }
    return false;
  });
});
