import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GenerateMessage, CancelGenerateMessage } from '../shared/bgMessages';
import { getSelectedTextFromActiveTab, sendToActiveTab } from '../shared/messages';
import {
  PANEL_STATE_KEY,
  isPersistedPanel,
  readPanel,
  restorableState,
} from '../shared/panelState';
import {
  PENDING_SELECTION_KEY,
  isFreshPending,
  isPendingSelection,
} from '../shared/pending';
import { loadStore, profileIsEmpty, type Profile } from '../shared/storage';
import type { JobPost } from '../shared/types';
import { jobFromText } from './jobFromText';
import { usePanelStore, type PanelState } from './store';
import {
  DetectingView,
  ErrorView,
  Footer,
  GeneratingView,
  GuideView,
  Header,
  IdleView,
  JobReadyView,
  ProfileBanner,
  ResultView,
  Stepper,
  type StepIndex,
} from './views';

export type PanelMode = 'popup' | 'sidepanel';

const ERROR_TITLES: Record<string, string> = {
  NETWORK: "Can't reach the server",
  RATE_LIMITED: 'Please wait a moment',
  UPSTREAM: "Couldn't generate a draft",
  INVALID_RESPONSE: "Couldn't generate a draft",
  SERVER: 'Server error',
  // Guidance (not failures): the page can't be read automatically.
  NO_CONTENT_SCRIPT: 'Use your selection on this site',
  PAGE_ACCESS: 'Use your selection on this site',
  EMPTY_SELECTION: 'Nothing selected',
  NOT_A_JOB_PAGE: 'No job post on this page',
  EXTRACTION_FAILED: "Couldn't find the job details",
};

/** Codes that mean "read the job another way", shown as friendly guidance. */
const GUIDE_CODES = new Set([
  'NO_CONTENT_SCRIPT',
  'PAGE_ACCESS',
  'EMPTY_SELECTION',
  'NOT_A_JOB_PAGE',
  'EXTRACTION_FAILED',
]);

const RIGHT_CLICK_HINT =
  'Highlight the job text, right-click it and choose "Draft proposal with ProposalPilot", or paste the text below.';

function errorTitle(code: string): string {
  return ERROR_TITLES[code] ?? 'Something went wrong';
}

function activeStep(state: PanelState): StepIndex {
  switch (state.status) {
    case 'ready':
    case 'generating':
      return 1;
    case 'result':
      return 2;
    case 'error':
      return state.job ? 1 : 0;
    default:
      return 0;
  }
}

function currentJob(state: PanelState): JobPost | undefined {
  return 'job' in state ? state.job : undefined;
}

async function activeTabUrl(): Promise<string> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab?.url ?? '';
  } catch {
    return '';
  }
}

/** Selected text on the page, or '' (never throws). */
async function readSelectionQuietly(): Promise<string> {
  try {
    const res = await sendToActiveTab({ type: 'GET_JOB_POST', preferSelection: true });
    if (res.type === 'JOB_POST') return res.job.description;
    if (res.type === 'JOB_POST_ERROR') return '';
  } catch {
    // fall through to activeTab
  }
  try {
    // Works in the popup: opening it grants activeTab for this tab.
    return await getSelectedTextFromActiveTab();
  } catch {
    return '';
  }
}

function clearBadge() {
  void chrome.action?.setBadgeText({ text: '' }).catch(() => undefined);
}

export default function PanelApp({ mode = 'sidepanel' }: { mode?: PanelMode }) {
  const { state, setState, commit, hydrate, tone, length, setTone, setLength, forceStatus } =
    usePanelStore();
  const [hydrated, setHydrated] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedQuestion, setCopiedQuestion] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [installId, setInstallId] = useState<string>('');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const windowIdRef = useRef<number | null>(null);

  const openSettings = useCallback(() => {
    void chrome.runtime.openOptionsPage();
  }, []);

  const applyText = useCallback(
    (text: string, url: string) => {
      const job = jobFromText(text, url);
      if (!job) {
        setState({
          status: 'error',
          error: { code: 'EMPTY_SELECTION', message: `No text received. ${RIGHT_CLICK_HINT}` },
        });
        return;
      }
      setState({ status: 'ready', job, editedDescription: job.description });
    },
    [setState],
  );

  /** Consume a right-click hand-off; true when one was applied. */
  const takePending = useCallback(
    (value: unknown): boolean => {
      if (!isPendingSelection(value) || !isFreshPending(value)) return false;
      void chrome.storage.session.remove(PENDING_SELECTION_KEY);
      clearBadge();
      applyText(value.text, value.url);
      return true;
    },
    [applyText],
  );

  // Startup: restore the last screen, then pick up a right-click hand-off,
  // a fresh selection (popup) or a supported job page (popup).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [data, saved, session] = await Promise.all([
        loadStore(),
        readPanel(),
        chrome.storage.session.get(PENDING_SELECTION_KEY).catch(() => ({})),
      ]);
      if (cancelled) return;
      setInstallId(data.installId);
      setProfile(data.profile);
      setProfileLoaded(true);

      const store = usePanelStore.getState();
      if (saved) {
        store.hydrate({ ...saved, state: restorableState(saved) });
      } else if (data.profile) {
        store.hydrate({
          state: { status: 'idle' },
          tone: data.profile.defaultTone,
          length: data.profile.defaultLength,
          updatedAt: 0,
        });
      }
      setHydrated(true);

      if (takePending((session as Record<string, unknown>)[PENDING_SELECTION_KEY])) return;
      if (mode !== 'popup') return;

      const now = usePanelStore.getState().state;
      if (now.status === 'generating') return;

      const selected = await readSelectionQuietly();
      if (cancelled) return;
      if (selected.trim()) {
        const job = jobFromText(selected, await activeTabUrl());
        const same = job && currentJob(now)?.description === job.description;
        if (job && !same) {
          usePanelStore.getState().setState({
            status: 'ready',
            job,
            editedDescription: job.description,
          });
        }
        return;
      }

      if (now.status === 'idle') {
        // On Fiverr / Upwork job pages, detect silently; elsewhere stay idle.
        try {
          const res = await sendToActiveTab({ type: 'GET_JOB_POST' });
          if (!cancelled && res.type === 'JOB_POST') {
            usePanelStore.getState().setState({
              status: 'ready',
              job: res.job,
              editedDescription: res.job.description,
            });
          }
        } catch {
          // stay idle
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, takePending]);

  // Follow changes made by the background worker or the other view.
  useEffect(() => {
    const onChanged = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string,
    ) => {
      if (area === 'local' && 'profile' in changes) {
        setProfile((changes.profile.newValue as Profile | null | undefined) ?? null);
      }
      if (area !== 'session') return;
      const pending = changes[PENDING_SELECTION_KEY];
      if (pending?.newValue) takePending(pending.newValue);
      const panel: unknown = changes[PANEL_STATE_KEY]?.newValue;
      if (isPersistedPanel(panel) && panel.updatedAt > usePanelStore.getState().updatedAt) {
        hydrate(panel);
      }
    };
    chrome.storage.onChanged.addListener(onChanged);
    return () => chrome.storage.onChanged.removeListener(onChanged);
  }, [hydrate, takePending]);

  // The side panel can only be opened synchronously inside a click, so
  // look the window up ahead of time.
  useEffect(() => {
    if (mode !== 'popup') return;
    void chrome.windows
      .getCurrent()
      .then((w) => {
        windowIdRef.current = w.id ?? null;
      })
      .catch(() => undefined);
  }, [mode]);

  useEffect(() => {
    if (state.status !== 'error' || state.error.code !== 'RATE_LIMITED') {
      setCountdown(null);
      return;
    }
    let left = state.error.retryAfterSeconds ?? 60;
    setCountdown(left);
    const timer = setInterval(() => {
      left -= 1;
      setCountdown(Math.max(left, 0));
      if (left <= 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [state]);

  const detectJob = useCallback(
    async (preferSelection = false) => {
      setState({ status: 'detecting' });
      try {
        // Ask the content script first: on supported sites it can read the page
        // and the selection without the activeTab grant.
        const response = await sendToActiveTab({ type: 'GET_JOB_POST', preferSelection });

        if (response.type === 'JOB_POST') {
          setState({
            status: 'ready',
            job: response.job,
            editedDescription: response.job.description,
          });
          return;
        }

        if (response.type === 'JOB_POST_ERROR') {
          setState({ status: 'error', error: response.error });
          return;
        }

        if (response.type === 'CONTENT_ERROR' && preferSelection) {
          // No content script: the popup has activeTab, the side panel doesn't
          // (Chrome doesn't grant it there), so guide the user on failure.
          let selected = '';
          try {
            selected = await getSelectedTextFromActiveTab();
          } catch {
            setState({
              status: 'error',
              error: { code: 'PAGE_ACCESS', message: RIGHT_CLICK_HINT },
            });
            return;
          }
          if (!selected.trim()) {
            setState({
              status: 'error',
              error: {
                code: 'EMPTY_SELECTION',
                message: `Highlight the job text first. ${RIGHT_CLICK_HINT}`,
              },
            });
            return;
          }
          applyText(selected, await activeTabUrl());
          return;
        }

        if (response.type === 'CONTENT_ERROR') {
          setState({
            status: 'error',
            error: {
              code: response.code,
              message:
                response.code === 'NO_CONTENT_SCRIPT'
                  ? `Jobs are detected automatically on Fiverr and Upwork. ${RIGHT_CLICK_HINT} If this is Fiverr or Upwork, reload the tab.`
                  : response.message,
            },
          });
          return;
        }

        setState({ status: 'error', error: { code: 'UNKNOWN', message: 'Unexpected response.' } });
      } catch {
        setState({
          status: 'error',
          error: { code: 'PAGE_ACCESS', message: `Could not read the page. ${RIGHT_CLICK_HINT}` },
        });
      }
    },
    [applyText, setState],
  );

  const runGenerate = useCallback(async () => {
    const job = currentJob(state);
    const editedDescription =
      'editedDescription' in state && state.editedDescription
        ? state.editedDescription
        : job?.description;
    if (!job || editedDescription === undefined) return;

    const requestId = crypto.randomUUID();
    // Save first: the worker only writes its result while this request is
    // the one being shown.
    await commit({ status: 'generating', job, editedDescription, requestId });

    const message: GenerateMessage = {
      type: 'PP_GENERATE',
      requestId,
      job,
      editedDescription,
      tone,
      length,
      signOff: profile?.signOff,
      payload: {
        install_id: installId || crypto.randomUUID(),
        job: {
          platform: job.platform,
          title: job.title,
          description: editedDescription,
          budget_text: job.budgetText ?? null,
          skills: job.skills,
        },
        profile: {
          name: profile?.name || 'Freelancer',
          headline: profile?.headline || 'Independent contractor',
          skills: profile?.skills ?? [],
          years_experience: profile?.yearsExperience ?? 0,
          hourly_rate: profile?.hourlyRate ?? null,
          currency: profile?.currency ?? 'USD',
          highlights: profile?.highlights ?? [],
        },
        options: { tone, length },
      },
    };
    setCopied(false);
    try {
      await chrome.runtime.sendMessage(message);
    } catch {
      setState({
        status: 'error',
        error: { code: 'NETWORK', message: 'Could not start generation. Reload the extension.' },
        job,
        editedDescription,
      });
    }
  }, [commit, installId, length, profile, setState, state, tone]);

  const cancelGenerate = () => {
    if (state.status !== 'generating') return;
    const message: CancelGenerateMessage = {
      type: 'PP_CANCEL_GENERATE',
      requestId: state.requestId,
    };
    void chrome.runtime.sendMessage(message).catch(() => undefined);
    setState({ status: 'ready', job: state.job, editedDescription: state.editedDescription });
  };

  const backToIdle = () => {
    if (state.status === 'generating') cancelGenerate();
    setState({ status: 'idle' });
  };

  const openSidePanel = () => {
    const windowId = windowIdRef.current;
    if (windowId === null) return;
    // Must run synchronously inside the click (user gesture).
    void chrome.sidePanel
      .open({ windowId })
      .then(() => window.close())
      .catch(() => undefined);
  };

  const copyText = async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  };

  const pasteText = (text: string) => {
    void activeTabUrl().then((url) => applyText(text, url));
  };

  const liveRegion = useMemo(() => {
    switch (state.status) {
      case 'detecting':
        return 'Detecting job post';
      case 'ready':
        return 'Job post ready';
      case 'generating':
        return 'Generating proposal';
      case 'result':
        return 'Proposal ready';
      case 'error':
        return `${errorTitle(state.error.code)}: ${state.error.message}`;
      default:
        return '';
    }
  }, [state]);

  return (
    <main
      className={`flex flex-col gap-4 p-4 text-sm ${mode === 'sidepanel' ? 'min-h-screen' : ''}`}
    >
      <div aria-live="polite" className="sr-only">
        {liveRegion}
      </div>

      <Header
        onSettings={openSettings}
        onOpenSidePanel={mode === 'popup' ? openSidePanel : undefined}
      />
      <Stepper active={activeStep(state)} />

      {profileLoaded && profileIsEmpty(profile) ? <ProfileBanner onOpen={openSettings} /> : null}

      {import.meta.env.DEV ? (
        <label className="pp-faint flex items-center gap-2 text-xs">
          Dev state
          <select
            className="pp-select !min-h-7 !w-auto !py-0 text-xs"
            onChange={(e) => forceStatus(e.target.value as PanelState['status'])}
            defaultValue=""
          >
            <option value="" disabled>
              Switch…
            </option>
            {(['idle', 'detecting', 'ready', 'generating', 'result', 'error'] as const).map(
              (s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ),
            )}
          </select>
        </label>
      ) : null}

      {!hydrated ? (
        <DetectingView />
      ) : (
        <div key={state.status} className="pp-enter flex flex-col">
          {state.status === 'idle' ? (
            <IdleView
              onDetect={() => void detectJob(false)}
              onUseSelection={() => void detectJob(true)}
              onPaste={pasteText}
            />
          ) : null}

          {state.status === 'detecting' ? <DetectingView /> : null}

          {state.status === 'ready' ? (
            <JobReadyView
              job={state.job}
              description={state.editedDescription}
              onDescriptionChange={(value) =>
                setState({ status: 'ready', job: state.job, editedDescription: value })
              }
              onGenerate={() => void runGenerate()}
              onBack={backToIdle}
            />
          ) : null}

          {state.status === 'generating' ? (
            <GeneratingView job={state.job} onCancel={cancelGenerate} />
          ) : null}

          {state.status === 'result' ? (
            <ResultView
              draft={state.draft}
              result={state.result}
              tone={tone}
              length={length}
              copied={copied}
              copiedQuestion={copiedQuestion}
              onDraftChange={(draft) => {
                setCopied(false);
                setState({ ...state, draft });
              }}
              onTone={setTone}
              onLength={setLength}
              onCopy={async () => {
                if (await copyText(state.draft)) {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1800);
                }
              }}
              onCopyQuestion={async (q) => {
                if (await copyText(q)) {
                  setCopiedQuestion(q);
                  setTimeout(() => setCopiedQuestion(null), 1500);
                }
              }}
              onRegenerate={() => void runGenerate()}
              onNewJob={backToIdle}
            />
          ) : null}

          {state.status === 'error' && GUIDE_CODES.has(state.error.code) ? (
            <GuideView
              title={errorTitle(state.error.code)}
              message={state.error.message}
              onRetry={() => void detectJob(false)}
              onPaste={pasteText}
            />
          ) : null}

          {state.status === 'error' && !GUIDE_CODES.has(state.error.code) ? (
            <ErrorView
              title={errorTitle(state.error.code)}
              message={
                state.error.code === 'RATE_LIMITED' && countdown !== null && countdown > 0
                  ? `Too many requests. Try again in ${countdown}s.`
                  : state.error.message
              }
              retryDisabled={
                state.error.code === 'RATE_LIMITED' && countdown !== null && countdown > 0
              }
              onRetry={() => {
                if (state.job) void runGenerate();
                else void detectJob(false);
              }}
              extra={
                state.job ? null : (
                  <button type="button" className="pp-btn pp-btn-ghost pp-btn-sm" onClick={backToIdle}>
                    Start over
                  </button>
                )
              }
            />
          ) : null}
        </div>
      )}

      <Footer />
    </main>
  );
}
