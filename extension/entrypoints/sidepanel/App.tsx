import { useCallback, useEffect, useState } from 'react';
import { normalizeDescription } from '../../src/content/adapters/normalize';
import {
  getSelectedTextFromActiveTab,
  sendToActiveTab,
} from '../../src/shared/messages';
import type { ExtractError, JobPost } from '../../src/shared/types';

type ViewState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'job'; job: JobPost }
  | { kind: 'error'; error: ExtractError | { code: string; message: string } };

export default function App() {
  const [tabUrl, setTabUrl] = useState<string>('…');
  const [view, setView] = useState<ViewState>({ kind: 'idle' });

  const refreshTabUrl = useCallback(() => {
    void chrome.tabs
      .query({ active: true, currentWindow: true })
      .then(([tab]) => setTabUrl(tab?.url ?? 'No active tab'));
  }, []);

  const loadJob = useCallback(async (preferSelection = false) => {
    setView({ kind: 'loading' });
    refreshTabUrl();

    if (preferSelection) {
      const selected = await getSelectedTextFromActiveTab();
      if (!selected.trim()) {
        setView({
          kind: 'error',
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
      setView({ kind: 'job', job: response.job });
      return;
    }
    if (response.type === 'JOB_POST_ERROR') {
      setView({ kind: 'error', error: response.error });
      return;
    }
    if (response.type === 'CONTENT_ERROR') {
      // Selection fallback path when content script is missing (e.g. example.com)
      if (preferSelection) {
        const selected = await getSelectedTextFromActiveTab();
        if (!selected.trim()) {
          setView({
            kind: 'error',
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
        setView({
          kind: 'job',
          job: {
            platform: 'generic',
            url: tab?.url ?? '',
            title,
            description,
            skills: [],
            extractedAt: new Date().toISOString(),
            truncated,
          },
        });
        return;
      }
      setView({
        kind: 'error',
        error: { code: response.code, message: response.message },
      });
      return;
    }
    setView({
      kind: 'error',
      error: { code: 'UNKNOWN', message: 'Unexpected response.' },
    });
  }, [refreshTabUrl]);

  useEffect(() => {
    refreshTabUrl();
  }, [refreshTabUrl]);

  return (
    <main className="flex flex-col gap-4 p-4 text-sm">
      <header>
        <h1 className="text-lg font-semibold tracking-tight">ProposalPilot</h1>
        <p className="opacity-80">ProposalPilot is running</p>
      </header>

      <section className="rounded-lg border border-slate-500/40 p-3">
        <p className="mb-1 text-xs uppercase opacity-60">Active tab</p>
        <p className="break-all font-mono text-xs">{tabUrl}</p>
      </section>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void loadJob(false)}
          className="rounded-md bg-teal-600 px-3 py-2 font-medium text-white hover:bg-teal-500"
        >
          Read job post
        </button>
        <button
          type="button"
          onClick={() => void loadJob(true)}
          className="rounded-md border border-slate-500/50 px-3 py-2 font-medium hover:bg-slate-500/10"
        >
          Use selected text
        </button>
      </div>

      {view.kind === 'loading' ? (
        <p className="opacity-70">Detecting job post…</p>
      ) : null}

      {view.kind === 'error' ? (
        <div
          role="alert"
          className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3"
        >
          <p className="font-medium">{view.error.code}</p>
          <p className="mt-1 opacity-90">{view.error.message}</p>
          {view.error.code === 'NOT_A_JOB_PAGE' ||
          view.error.code === 'EXTRACTION_FAILED' ||
          view.error.code === 'NO_CONTENT_SCRIPT' ? (
            <p className="mt-2 text-xs opacity-70">
              Tip: highlight the job text and click “Use selected text”.
            </p>
          ) : null}
        </div>
      ) : null}

      {view.kind === 'job' ? <JobCard job={view.job} /> : null}
    </main>
  );
}

function JobCard({ job }: { job: JobPost }) {
  return (
    <article className="flex flex-col gap-2 rounded-lg border border-slate-500/40 p-3">
      <p className="text-xs uppercase opacity-60">{job.platform}</p>
      <h2 className="text-base font-semibold">{job.title}</h2>
      {job.budgetText ? (
        <p className="text-xs">
          <span className="opacity-60">Budget: </span>
          {job.budgetText}
        </p>
      ) : null}
      {job.skills.length > 0 ? (
        <ul className="flex flex-wrap gap-1">
          {job.skills.map((s) => (
            <li
              key={s}
              className="rounded-full bg-teal-600/20 px-2 py-0.5 text-xs"
            >
              {s}
            </li>
          ))}
        </ul>
      ) : null}
      <p className="max-h-48 overflow-auto whitespace-pre-wrap text-xs opacity-90">
        {job.description}
      </p>
      {job.truncated ? (
        <p className="text-xs text-amber-600">Description truncated at 12,000 characters.</p>
      ) : null}
    </article>
  );
}
