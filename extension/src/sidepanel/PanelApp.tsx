import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ApiError, generateProposal } from '../shared/api';
import { getSelectedTextFromActiveTab, sendToActiveTab } from '../shared/messages';
import {
  PENDING_SELECTION_KEY,
  isFreshPending,
  isPendingSelection,
} from '../shared/pending';
import {
  addHistoryItem,
  loadStore,
  profileIsEmpty,
  type Profile,
} from '../shared/storage';
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

async function activeTabUrl(): Promise<string> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab?.url ?? '';
  } catch {
    return '';
  }
}

export default function PanelApp() {
  const { state, setState, tone, length, setTone, setLength, forceStatus } =
    usePanelStore();
  const abortRef = useRef<AbortController | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedQuestion, setCopiedQuestion] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [installId, setInstallId] = useState<string>('');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);

  const openSettings = useCallback(() => {
    void chrome.runtime.openOptionsPage();
  }, []);

  useEffect(() => {
    void loadStore().then((data) => {
      setInstallId(data.installId);
      setProfile(data.profile);
      setProfileLoaded(true);
      if (data.profile) {
        setTone(data.profile.defaultTone);
        setLength(data.profile.defaultLength);
      }
    });
  }, [setLength, setTone]);

  // Profile edits in the options page show up without reopening the panel.
  useEffect(() => {
    const onChanged = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string,
    ) => {
      if (area === 'local' && 'profile' in changes) {
        setProfile((changes.profile.newValue as Profile | null | undefined) ?? null);
      }
    };
    chrome.storage.onChanged.addListener(onChanged);
    return () => chrome.storage.onChanged.removeListener(onChanged);
  }, []);

  const applyText = useCallback(
    (text: string, url: string) => {
      const job = jobFromText(text, url);
      if (!job) {
        setState({
          status: 'error',
          error: {
            code: 'EMPTY_SELECTION',
            message: `No text received. ${RIGHT_CLICK_HINT}`,
          },
        });
        return;
      }
      // Clear the ref first so the aborted request doesn't restore its old job.
      const running = abortRef.current;
      abortRef.current = null;
      running?.abort();
      setState({ status: 'ready', job, editedDescription: job.description });
    },
    [setState],
  );

  // Right-click "Draft proposal with ProposalPilot" hands the selection over
  // through chrome.storage.session (see src/shared/pending.ts).
  useEffect(() => {
    const apply = (value: unknown) => {
      if (!isPendingSelection(value) || !isFreshPending(value)) return;
      void chrome.storage.session.remove(PENDING_SELECTION_KEY);
      applyText(value.text, value.url);
    };
    void chrome.storage.session
      .get(PENDING_SELECTION_KEY)
      .then((data) => apply(data[PENDING_SELECTION_KEY]))
      .catch(() => undefined);
    const onChanged = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string,
    ) => {
      const change = changes[PENDING_SELECTION_KEY];
      if (area === 'session' && change?.newValue) apply(change.newValue);
    };
    chrome.storage.onChanged.addListener(onChanged);
    return () => chrome.storage.onChanged.removeListener(onChanged);
  }, [applyText]);

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
        const response = await sendToActiveTab({
          type: 'GET_JOB_POST',
          preferSelection,
        });

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
          // No content script: activeTab works only after a right-click menu
          // click on this tab (Chrome doesn't grant it when the toolbar icon
          // opens the side panel), so failure here is expected; guide the user.
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

        setState({
          status: 'error',
          error: { code: 'UNKNOWN', message: 'Unexpected response.' },
        });
      } catch {
        setState({
          status: 'error',
          error: {
            code: 'PAGE_ACCESS',
            message: `Could not read the page. ${RIGHT_CLICK_HINT}`,
          },
        });
      }
    },
    [setState, applyText],
  );

  const runGenerate = useCallback(async () => {
    if (state.status !== 'ready' && state.status !== 'result' && state.status !== 'error') {
      return;
    }
    const job = 'job' in state && state.job ? state.job : undefined;
    const editedDescription =
      'editedDescription' in state && state.editedDescription
        ? state.editedDescription
        : job?.description;
    if (!job || editedDescription === undefined) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setState({ status: 'generating', job, editedDescription });

    try {
      const result = await generateProposal(
        {
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
        controller.signal,
      );
      const draft =
        profile?.signOff && !result.proposal.includes(profile.signOff)
          ? `${result.proposal}\n\n${profile.signOff}`
          : result.proposal;
      setCopied(false);
      setState({
        status: 'result',
        job,
        editedDescription,
        result,
        draft,
        tone,
        length,
      });
      void addHistoryItem({
        id: crypto.randomUUID(),
        jobTitle: job.title,
        platform: job.platform,
        createdAt: new Date().toISOString(),
        proposal: draft,
        priceAmount: result.suggested_price.amount,
        priceCurrency: result.suggested_price.currency,
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // Cancelled by the user, or superseded by a new job hand-off.
        if (abortRef.current === controller) {
          setState({ status: 'ready', job, editedDescription });
        }
        return;
      }
      if (err instanceof ApiError) {
        setState({
          status: 'error',
          error: {
            code: err.code,
            message: err.message,
            retryAfterSeconds: err.retryAfterSeconds,
          },
          job,
          editedDescription,
        });
        return;
      }
      setState({
        status: 'error',
        error: { code: 'NETWORK', message: 'Unexpected client error.' },
        job,
        editedDescription,
      });
    }
  }, [installId, length, profile, setState, state, tone]);

  const cancelGenerate = () => {
    abortRef.current?.abort();
  };

  const backToIdle = () => {
    const running = abortRef.current;
    abortRef.current = null;
    running?.abort();
    setState({ status: 'idle' });
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
    <main className="flex min-h-screen flex-col gap-4 p-4 text-sm">
      <div aria-live="polite" className="sr-only">
        {liveRegion}
      </div>

      <Header onSettings={openSettings} />
      <Stepper active={activeStep(state)} />

      {profileLoaded && profileIsEmpty(profile) ? (
        <ProfileBanner onOpen={openSettings} />
      ) : null}

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
              if (state.job) {
                setState({
                  status: 'ready',
                  job: state.job,
                  editedDescription: state.editedDescription ?? state.job.description,
                });
                void runGenerate();
              } else {
                void detectJob(false);
              }
            }}
            extra={
              state.job ? null : (
                <button
                  type="button"
                  className="pp-btn pp-btn-ghost pp-btn-sm"
                  onClick={backToIdle}
                >
                  Start over
                </button>
              )
            }
          />
        ) : null}
      </div>

      <Footer />
    </main>
  );
}
