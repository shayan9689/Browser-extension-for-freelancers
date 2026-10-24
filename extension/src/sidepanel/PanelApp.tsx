import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ApiError,
  generateProposal,
  type Length,
  type Tone,
} from '../shared/api';
import {
  getSelectedTextFromActiveTab,
  sendToActiveTab,
} from '../shared/messages';
import { normalizeDescription } from '../content/adapters/normalize';
import {
  addHistoryItem,
  loadStore,
  profileIsEmpty,
  type Profile,
} from '../shared/storage';
import { usePanelStore } from './store';

function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export default function PanelApp() {
  const { state, setState, tone, length, setTone, setLength, forceStatus } =
    usePanelStore();
  const abortRef = useRef<AbortController | null>(null);
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [installId, setInstallId] = useState<string>('');
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    void loadStore().then((data) => {
      setInstallId(data.installId);
      setProfile(data.profile);
      if (data.profile) {
        setTone(data.profile.defaultTone);
        setLength(data.profile.defaultLength);
      }
    });
  }, [setLength, setTone]);

  useEffect(() => {
    if (state.status !== 'error' || state.error.code !== 'RATE_LIMITED') {
      setCountdown(null);
      return;
    }
    let left = state.error.retryAfterSeconds ?? 60;
    setCountdown(left);
    const timer = setInterval(() => {
      left -= 1;
      setCountdown(left);
      if (left <= 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [state]);

  const detectJob = useCallback(
    async (preferSelection = false) => {
      setState({ status: 'detecting' });
      try {
        if (preferSelection) {
          const selected = await getSelectedTextFromActiveTab();
          if (!selected.trim()) {
            setState({
              status: 'error',
              error: {
                code: 'EMPTY_SELECTION',
                message: 'Highlight the job text on the page, then try again.',
              },
            });
            return;
          }
        }

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
          const selected = await getSelectedTextFromActiveTab();
          if (!selected.trim()) {
            setState({
              status: 'error',
              error: {
                code: 'EMPTY_SELECTION',
                message: 'Highlight the job text on the page, then try again.',
              },
            });
            return;
          }
          const { description, truncated } = normalizeDescription(selected);
          const title =
            description.slice(0, 80).split(/[.!?\n]/)[0]?.trim() || 'Selected text';
          const [tab] = await chrome.tabs.query({
            active: true,
            currentWindow: true,
          });
          const job = {
            platform: 'generic' as const,
            url: tab?.url ?? '',
            title,
            description,
            skills: [] as string[],
            extractedAt: new Date().toISOString(),
            truncated,
          };
          setState({ status: 'ready', job, editedDescription: description });
          return;
        }

        if (response.type === 'CONTENT_ERROR') {
          setState({
            status: 'error',
            error: { code: response.code, message: response.message },
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
          error: { code: 'NETWORK', message: 'Could not read the page.' },
        });
      }
    },
    [setState],
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
        setState({ status: 'ready', job, editedDescription });
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

  const liveRegion = useMemo(() => {
    switch (state.status) {
      case 'detecting':
        return 'Detecting job post';
      case 'generating':
        return 'Generating proposal';
      case 'result':
        return 'Proposal ready';
      case 'error':
        return `Error: ${state.error.message}`;
      default:
        return '';
    }
  }, [state]);

  return (
    <main className="flex flex-col gap-4 p-4 text-sm">
      <div aria-live="polite" className="sr-only">
        {liveRegion}
      </div>

      <header>
        <h1 className="text-lg font-semibold tracking-tight">ProposalPilot</h1>
        <p className="opacity-80">Draft proposals from the job you are viewing</p>
        {profileIsEmpty(profile) ? (
          <p className="mt-2 rounded border border-amber-500/40 bg-amber-500/10 p-2 text-xs">
            Profile is empty — proposals may be generic.{' '}
            <button
              type="button"
              className="underline"
              onClick={() => void chrome.runtime.openOptionsPage()}
            >
              Complete your profile
            </button>
          </p>
        ) : null}
        <button
          type="button"
          className="mt-2 text-xs underline opacity-70"
          onClick={() => void chrome.runtime.openOptionsPage()}
        >
          Settings & history
        </button>
      </header>

      {import.meta.env.DEV ? (
        <label className="flex items-center gap-2 text-xs opacity-70">
          Dev state
          <select
            className="rounded border border-slate-500/40 bg-transparent px-1 py-0.5"
            onChange={(e) =>
              forceStatus(e.target.value as typeof state.status)
            }
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

      {state.status === 'idle' ? (
        <section className="rounded-lg border border-slate-500/40 p-3">
          <p>Open a job post on a supported marketplace, then detect it.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-md bg-teal-600 px-3 py-2 font-medium text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
              onClick={() => void detectJob(false)}
            >
              Detect job post
            </button>
            <button
              type="button"
              className="rounded-md border border-slate-500/50 px-3 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
              onClick={() => void detectJob(true)}
            >
              Use selected text
            </button>
          </div>
        </section>
      ) : null}

      {state.status === 'detecting' ? (
        <div className="animate-pulse space-y-2" aria-busy="true">
          <div className="h-4 rounded bg-slate-500/30" />
          <div className="h-4 w-2/3 rounded bg-slate-500/30" />
          <div className="h-20 rounded bg-slate-500/20" />
        </div>
      ) : null}

      {state.status === 'ready' || state.status === 'generating' ? (
        <JobReady
          title={state.job.title}
          platform={state.job.platform}
          budget={state.job.budgetText}
          skills={state.job.skills}
          description={state.editedDescription}
          generating={state.status === 'generating'}
          onDescriptionChange={(value) =>
            setState({
              status: 'ready',
              job: state.job,
              editedDescription: value,
            })
          }
          onGenerate={() => void runGenerate()}
          onCancel={cancelGenerate}
        />
      ) : null}

      {state.status === 'result' ? (
        <ResultView
          draft={state.draft}
          result={state.result}
          tone={tone}
          length={length}
          copied={copied}
          onDraftChange={(draft) => setState({ ...state, draft })}
          onTone={setTone}
          onLength={setLength}
          onCopy={async () => {
            await navigator.clipboard.writeText(state.draft);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          onRegenerate={() => void runGenerate()}
        />
      ) : null}

      {state.status === 'error' ? (
        <div
          role="alert"
          className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3"
        >
          <p className="font-medium">{state.error.code}</p>
          <p className="mt-1">
            {state.error.code === 'RATE_LIMITED' && countdown !== null
              ? `Rate limited. Try again in ${countdown}s.`
              : state.error.message}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-md bg-teal-600 px-3 py-2 text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
              onClick={() => {
                if (state.job) {
                  setState({
                    status: 'ready',
                    job: state.job,
                    editedDescription:
                      state.editedDescription ?? state.job.description,
                  });
                  void runGenerate();
                } else {
                  void detectJob(false);
                }
              }}
            >
              Retry
            </button>
            <button
              type="button"
              className="rounded-md border border-slate-500/50 px-3 py-2"
              onClick={() => void detectJob(true)}
            >
              Use selected text
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function JobReady(props: {
  title: string;
  platform: string;
  budget?: string;
  skills: string[];
  description: string;
  generating: boolean;
  onDescriptionChange: (v: string) => void;
  onGenerate: () => void;
  onCancel: () => void;
}) {
  const [editOpen, setEditOpen] = useState(false);
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-slate-500/40 p-3">
      <p className="text-xs uppercase opacity-60">{props.platform}</p>
      <h2 className="text-base font-semibold">{props.title}</h2>
      {props.budget ? <p className="text-xs">Budget: {props.budget}</p> : null}
      <ul className="flex flex-wrap gap-1">
        {props.skills.map((s) => (
          <li key={s} className="rounded-full bg-teal-600/20 px-2 py-0.5 text-xs">
            {s}
          </li>
        ))}
      </ul>
      <details open={editOpen} onToggle={(e) => setEditOpen(e.currentTarget.open)}>
        <summary className="cursor-pointer text-xs opacity-80">
          Edit extracted text
        </summary>
        <textarea
          className="mt-2 min-h-28 w-full rounded border border-slate-500/40 bg-transparent p-2 text-xs"
          value={props.description}
          onChange={(e) => props.onDescriptionChange(e.target.value)}
          disabled={props.generating}
        />
      </details>
      {props.generating ? (
        <div className="flex items-center gap-2">
          <p aria-busy="true">Generating…</p>
          <button
            type="button"
            className="rounded-md border border-slate-500/50 px-3 py-1.5"
            onClick={props.onCancel}
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="rounded-md bg-teal-600 px-3 py-2 font-medium text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
          onClick={props.onGenerate}
        >
          Generate proposal
        </button>
      )}
    </section>
  );
}

function ResultView(props: {
  draft: string;
  result: {
    suggested_price: { amount: number; currency: string; rationale: string };
    delivery_days: number;
    questions_to_ask: string[];
    warnings: string[];
  };
  tone: Tone;
  length: Length;
  copied: boolean;
  onDraftChange: (v: string) => void;
  onTone: (t: Tone) => void;
  onLength: (l: Length) => void;
  onCopy: () => void;
  onRegenerate: () => void;
}) {
  return (
    <section className="flex flex-col gap-3">
      <textarea
        className="min-h-40 w-full rounded-lg border border-slate-500/40 bg-transparent p-3 text-sm"
        value={props.draft}
        onChange={(e) => props.onDraftChange(e.target.value)}
        aria-label="Proposal draft"
      />
      <p className="text-xs opacity-70">{wordCount(props.draft)} words</p>

      <div className="flex flex-wrap gap-2 text-xs">
        <span
          className="rounded-full bg-teal-600/20 px-2 py-1"
          title={props.result.suggested_price.rationale}
        >
          {props.result.suggested_price.currency}{' '}
          {props.result.suggested_price.amount}
          <span className="ml-1 opacity-60">why?</span>
        </span>
        <span className="rounded-full bg-slate-500/20 px-2 py-1">
          {props.result.delivery_days} days
        </span>
      </div>

      {props.result.warnings.length > 0 ? (
        <ul className="rounded border border-amber-500/40 p-2 text-xs text-amber-700 dark:text-amber-300">
          {props.result.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      ) : null}

      {props.result.questions_to_ask.length > 0 ? (
        <div>
          <p className="mb-1 text-xs uppercase opacity-60">Questions to ask</p>
          <ul className="space-y-1 text-xs">
            {props.result.questions_to_ask.map((q) => (
              <li key={q} className="flex items-start justify-between gap-2">
                <span>{q}</span>
                <button
                  type="button"
                  className="shrink-0 underline"
                  onClick={() => void navigator.clipboard.writeText(q)}
                >
                  Copy
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <label className="text-xs">
          Tone
          <select
            className="ml-1 rounded border border-slate-500/40 bg-transparent px-1"
            value={props.tone}
            onChange={(e) => props.onTone(e.target.value as Tone)}
          >
            <option value="friendly">friendly</option>
            <option value="professional">professional</option>
            <option value="concise">concise</option>
          </select>
        </label>
        <label className="text-xs">
          Length
          <select
            className="ml-1 rounded border border-slate-500/40 bg-transparent px-1"
            value={props.length}
            onChange={(e) => props.onLength(e.target.value as Length)}
          >
            <option value="short">short</option>
            <option value="medium">medium</option>
          </select>
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-md bg-teal-600 px-3 py-2 text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
          onClick={props.onCopy}
        >
          {props.copied ? 'Copied' : 'Copy'}
        </button>
        <button
          type="button"
          className="rounded-md border border-slate-500/50 px-3 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
          onClick={props.onRegenerate}
        >
          Regenerate
        </button>
      </div>
    </section>
  );
}
