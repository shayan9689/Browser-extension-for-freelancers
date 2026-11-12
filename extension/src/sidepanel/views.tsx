import { useEffect, useState, type ReactNode } from 'react';
import type { Length, ProposalApiResponse, Tone } from '../shared/api';
import type { JobPost } from '../shared/types';
import {
  IconAlert,
  IconArrowLeft,
  IconCheck,
  IconChevronDown,
  IconClipboard,
  IconClock,
  IconCopy,
  IconCursor,
  IconInfo,
  IconLogo,
  IconMouseRight,
  IconQuestion,
  IconRefresh,
  IconSearch,
  IconSettings,
  IconShield,
  IconSparkles,
  IconTag,
  IconUser,
} from '../shared/ui/icons';

export function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

const PLATFORM_LABEL: Record<JobPost['platform'], string> = {
  fiverr: 'Fiverr',
  upwork: 'Upwork',
  generic: 'Selected text',
};

/* ---------------- Header & chrome ---------------- */

export function Header(props: { onSettings: () => void }) {
  return (
    <header className="flex items-center gap-3">
      <div className="pp-logo">
        <IconLogo size={22} />
      </div>
      <div className="min-w-0 flex-1">
        <h1 className="text-[15px] leading-tight font-bold tracking-tight">
          Proposal<span className="pp-gradient-text">Pilot</span>
        </h1>
        <p className="pp-muted truncate text-xs">AI drafts from the job you are viewing</p>
      </div>
      <button
        type="button"
        className="pp-icon-btn"
        onClick={props.onSettings}
        aria-label="Settings and history"
        title="Settings & history"
      >
        <IconSettings />
      </button>
    </header>
  );
}

export type StepIndex = 0 | 1 | 2;

export function Stepper(props: { active: StepIndex }) {
  const steps = ['Job post', 'Draft', 'Copy & send'];
  return (
    <ol className="pp-steps" aria-label="Progress">
      {steps.map((label, i) => {
        const state = i < props.active ? 'done' : i === props.active ? 'active' : 'todo';
        return (
          <li
            key={label}
            className="pp-step"
            data-state={state}
            aria-current={state === 'active' ? 'step' : undefined}
          >
            <span className="pp-step-bar" />
            <span>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function ProfileBanner(props: { onOpen: () => void }) {
  return (
    <div className="pp-notice pp-notice-warn pp-enter flex items-start gap-3">
      <span className="mt-0.5 text-[var(--pp-warn-text)]">
        <IconUser />
      </span>
      <div className="flex-1 text-xs leading-relaxed">
        <p className="pp-notice-title">Add your profile</p>
        <p className="pp-muted">
          Drafts use only facts from your profile. Without it they stay generic.
        </p>
        <button type="button" className="pp-link mt-1 text-xs" onClick={props.onOpen}>
          Complete profile →
        </button>
      </div>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="pp-faint mt-auto flex items-center justify-center gap-1.5 pt-2 text-[11px]">
      <IconShield size={12} />
      <span>Draft only. You review and send. Nothing is submitted for you.</span>
    </footer>
  );
}

/* ---------------- Idle ---------------- */

export function IdleView(props: {
  onDetect: () => void;
  onUseSelection: () => void;
  onPaste: (text: string) => void;
}) {
  return (
    <section className="pp-stagger flex flex-col gap-3">
      <div className="pp-card pp-card-glow flex flex-col gap-4 p-4">
        <div>
          <h2 className="text-base font-bold tracking-tight">Open a job post</h2>
          <p className="pp-muted mt-1 text-[13px] leading-relaxed">
            On Fiverr and Upwork the job is detected automatically. On any other site, use
            your selection.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            className="pp-btn pp-btn-primary pp-btn-lg pp-btn-block"
            onClick={props.onDetect}
          >
            <IconSearch />
            Detect job post
          </button>
          <button
            type="button"
            className="pp-btn pp-btn-secondary pp-btn-block"
            onClick={props.onUseSelection}
          >
            <IconCursor />
            Use selected text
          </button>
        </div>
      </div>

      <RightClickTip />
      <PasteBox onSubmit={props.onPaste} />
    </section>
  );
}

export function RightClickTip() {
  return (
    <div className="pp-card flex items-start gap-3 p-3.5">
      <span className="pp-badge pp-badge-accent mt-0.5 !p-1.5">
        <IconMouseRight size={14} />
      </span>
      <div className="text-xs leading-relaxed">
        <p className="font-semibold">Works on any website</p>
        <p className="pp-muted">
          Highlight the job text, right-click it and choose{' '}
          <span className="font-semibold text-[var(--pp-text)]">
            Draft proposal with ProposalPilot
          </span>
          .
        </p>
      </div>
    </div>
  );
}

export function PasteBox(props: { onSubmit: (text: string) => void; defaultOpen?: boolean }) {
  const [text, setText] = useState('');
  const tooShort = text.trim().length < 30;
  return (
    <details className="pp-card pp-details overflow-hidden" open={props.defaultOpen}>
      <summary className="flex items-center gap-3 p-3.5 text-xs">
        <span className="pp-badge mt-0.5 !p-1.5">
          <IconClipboard size={14} />
        </span>
        <span className="flex-1">
          <span className="block font-semibold">Paste job text</span>
          <span className="pp-muted">Copy the post and paste it here</span>
        </span>
        <IconChevronDown className="pp-chevron pp-muted" />
      </summary>
      <div className="flex flex-col gap-2 px-3.5 pb-3.5">
        <textarea
          className="pp-textarea min-h-28 text-xs"
          placeholder="Paste the job title and description…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-label="Job text"
        />
        <div className="flex items-center justify-between gap-2">
          <span className="pp-faint text-[11px]">
            {tooShort ? 'At least 30 characters' : `${wordCount(text)} words`}
          </span>
          <button
            type="button"
            className="pp-btn pp-btn-secondary pp-btn-sm"
            disabled={tooShort}
            onClick={() => props.onSubmit(text)}
          >
            Use this text
          </button>
        </div>
      </div>
    </details>
  );
}

/* ---------------- Detecting ---------------- */

export function DetectingView() {
  return (
    <section className="pp-card flex flex-col gap-3 p-4" aria-busy="true">
      <div className="pp-skeleton h-3 w-20" />
      <div className="pp-skeleton h-5 w-4/5" />
      <div className="flex gap-2">
        <div className="pp-skeleton h-5 w-16 rounded-full" />
        <div className="pp-skeleton h-5 w-14 rounded-full" />
        <div className="pp-skeleton h-5 w-20 rounded-full" />
      </div>
      <div className="pp-skeleton h-16 w-full" />
      <div className="pp-skeleton h-10 w-full rounded-xl" />
    </section>
  );
}

/* ---------------- Job ready / generating ---------------- */

function JobSummary(props: { job: JobPost }) {
  const { job } = props;
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="pp-badge">{PLATFORM_LABEL[job.platform]}</span>
        {job.budgetText ? (
          <span className="pp-badge pp-badge-accent">
            <IconTag size={11} />
            {job.budgetText}
          </span>
        ) : null}
        {job.truncated ? <span className="pp-badge">Trimmed to 12k chars</span> : null}
      </div>
      <h2 className="text-[15px] leading-snug font-bold tracking-tight">{job.title}</h2>
      {job.skills.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5" aria-label="Skills">
          {job.skills.map((s) => (
            <li key={s} className="pp-chip">
              {s}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function JobReadyView(props: {
  job: JobPost;
  description: string;
  onDescriptionChange: (v: string) => void;
  onGenerate: () => void;
  onBack: () => void;
}) {
  return (
    <section className="pp-stagger flex flex-col gap-3">
      <div className="pp-card pp-card-glow flex flex-col gap-4 p-4">
        <JobSummary job={props.job} />
        <details className="pp-details rounded-xl border border-[var(--pp-border)] bg-[var(--pp-surface-2)]">
          <summary className="flex items-center justify-between gap-2 px-3 py-2.5 text-xs font-semibold">
            <span>
              Review job text{' '}
              <span className="pp-faint font-normal">
                · {wordCount(props.description)} words
              </span>
            </span>
            <IconChevronDown className="pp-chevron pp-muted" />
          </summary>
          <div className="px-3 pb-3">
            <textarea
              className="pp-textarea min-h-32 text-xs"
              value={props.description}
              onChange={(e) => props.onDescriptionChange(e.target.value)}
              aria-label="Extracted job text"
            />
          </div>
        </details>
        <button
          type="button"
          className="pp-btn pp-btn-primary pp-btn-lg pp-btn-block"
          onClick={props.onGenerate}
        >
          <IconSparkles />
          Generate proposal
        </button>
      </div>
      <button type="button" className="pp-btn pp-btn-ghost pp-btn-sm self-start" onClick={props.onBack}>
        <IconArrowLeft size={14} />
        Different job
      </button>
    </section>
  );
}

const GENERATING_MESSAGES = [
  'Reading the job post',
  'Matching it to your profile',
  'Writing your draft',
  'Estimating price and timeline',
];

export function GeneratingView(props: { job: JobPost; onCancel: () => void }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(
      () => setIndex((i) => Math.min(i + 1, GENERATING_MESSAGES.length - 1)),
      1600,
    );
    return () => clearInterval(timer);
  }, []);
  return (
    <section className="pp-card pp-card-glow pp-enter flex flex-col gap-4 p-4" aria-busy="true">
      <div className="flex items-center gap-3.5">
        <div className="pp-orb">
          <IconSparkles size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p key={index} className="pp-fade text-sm font-semibold">
            {GENERATING_MESSAGES[index]}…
          </p>
          <p className="pp-muted truncate text-xs">{props.job.title}</p>
        </div>
      </div>
      <div className="pp-progress" />
      <div className="flex flex-col gap-2">
        <div className="pp-skeleton h-3 w-full" />
        <div className="pp-skeleton h-3 w-11/12" />
        <div className="pp-skeleton h-3 w-4/5" />
      </div>
      <button type="button" className="pp-btn pp-btn-secondary pp-btn-block" onClick={props.onCancel}>
        Cancel
      </button>
    </section>
  );
}

/* ---------------- Result ---------------- */

function Segmented<T extends string>(props: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="pp-label">{props.label}</span>
      <div className="pp-segment" role="group" aria-label={props.label}>
        {props.options.map((o) => (
          <button
            key={o}
            type="button"
            aria-pressed={props.value === o}
            onClick={() => props.onChange(o)}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ResultView(props: {
  draft: string;
  result: ProposalApiResponse;
  tone: Tone;
  length: Length;
  copied: boolean;
  copiedQuestion: string | null;
  onDraftChange: (v: string) => void;
  onTone: (t: Tone) => void;
  onLength: (l: Length) => void;
  onCopy: () => void;
  onCopyQuestion: (q: string) => void;
  onRegenerate: () => void;
  onNewJob: () => void;
}) {
  const [showWhy, setShowWhy] = useState(false);
  const { result } = props;
  const price = result.suggested_price;
  const priceText =
    price.amount > 0
      ? `${price.currency} ${price.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
      : 'Set your own';

  return (
    <section className="pp-stagger flex flex-col gap-3">
      <div className="pp-card pp-card-glow flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-bold">
            <span className="text-[var(--pp-brand-strong)]">
              <IconSparkles size={15} />
            </span>
            Your draft
          </h2>
          <span className="pp-badge">{wordCount(props.draft)} words</span>
        </div>
        <textarea
          className="pp-textarea pp-textarea-auto min-h-48 text-[13px]"
          value={props.draft}
          onChange={(e) => props.onDraftChange(e.target.value)}
          aria-label="Proposal draft"
        />
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className={`pp-btn pp-btn-lg ${props.copied ? 'pp-btn-secondary' : 'pp-btn-primary'}`}
            onClick={props.onCopy}
          >
            {props.copied ? (
              <>
                <span className="pp-pop text-[var(--pp-brand-strong)]">
                  <IconCheck />
                </span>
                Copied
              </>
            ) : (
              <>
                <IconCopy />
                Copy
              </>
            )}
          </button>
          <button type="button" className="pp-btn pp-btn-secondary pp-btn-lg" onClick={props.onRegenerate}>
            <IconRefresh />
            Regenerate
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="pp-stat">
          <span className="pp-label flex items-center gap-1.5">
            <IconTag size={12} /> Price
          </span>
          <span className="pp-stat-value truncate" title={priceText}>
            {priceText}
          </span>
          <button
            type="button"
            className="pp-link self-start text-[11px]"
            aria-expanded={showWhy}
            onClick={() => setShowWhy((v) => !v)}
          >
            {showWhy ? 'Hide reason' : 'Why this price?'}
          </button>
        </div>
        <div className="pp-stat">
          <span className="pp-label flex items-center gap-1.5">
            <IconClock size={12} /> Delivery
          </span>
          <span className="pp-stat-value">
            {result.delivery_days}
            <span className="pp-muted ml-1 text-xs font-semibold">
              {result.delivery_days === 1 ? 'day' : 'days'}
            </span>
          </span>
          <span className="pp-faint text-[11px]">Estimated</span>
        </div>
      </div>
      {showWhy ? (
        <p className="pp-notice pp-notice-info pp-enter text-xs leading-relaxed">
          {price.rationale}
        </p>
      ) : null}

      {result.warnings.length > 0 ? (
        <div className="pp-notice pp-notice-warn flex items-start gap-2.5 text-xs">
          <span className="mt-0.5 text-[var(--pp-warn-text)]">
            <IconAlert size={14} />
          </span>
          <ul className="flex-1 space-y-1 leading-relaxed">
            {result.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {result.questions_to_ask.length > 0 ? (
        <div className="pp-card flex flex-col gap-2 p-3.5">
          <p className="pp-label flex items-center gap-1.5">
            <IconQuestion size={12} /> Ask the client
          </p>
          <ul className="flex flex-col gap-1.5">
            {result.questions_to_ask.map((q) => (
              <li
                key={q}
                className="flex items-start justify-between gap-2 rounded-lg bg-[var(--pp-surface-2)] p-2.5 text-xs leading-relaxed"
              >
                <span>{q}</span>
                <button
                  type="button"
                  className="pp-icon-btn !h-7 !w-7 shrink-0"
                  onClick={() => props.onCopyQuestion(q)}
                  aria-label="Copy question"
                  title="Copy question"
                >
                  {props.copiedQuestion === q ? (
                    <span className="pp-pop text-[var(--pp-brand-strong)]">
                      <IconCheck size={14} />
                    </span>
                  ) : (
                    <IconCopy size={14} />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="pp-card flex flex-col gap-2.5 p-3.5">
        <Segmented
          label="Tone"
          value={props.tone}
          options={['friendly', 'professional', 'concise'] as const}
          onChange={props.onTone}
        />
        <Segmented
          label="Length"
          value={props.length}
          options={['short', 'medium'] as const}
          onChange={props.onLength}
        />
        <p className="pp-faint text-[11px]">Change these, then Regenerate.</p>
      </div>

      <button type="button" className="pp-btn pp-btn-ghost pp-btn-sm self-start" onClick={props.onNewJob}>
        <IconArrowLeft size={14} />
        New job
      </button>
    </section>
  );
}

/* ---------------- Errors & guidance ---------------- */

export function GuideView(props: {
  title: string;
  message: string;
  onRetry: () => void;
  onPaste: (text: string) => void;
}) {
  return (
    <section className="pp-stagger flex flex-col gap-3">
      <div className="pp-notice pp-notice-info flex items-start gap-3" role="status">
        <span className="mt-0.5 text-sky-400">
          <IconInfo />
        </span>
        <div className="flex-1 text-xs leading-relaxed">
          <p className="pp-notice-title">{props.title}</p>
          <p className="pp-muted mt-0.5">{props.message}</p>
          <button type="button" className="pp-link mt-1.5 text-xs" onClick={props.onRetry}>
            Try again
          </button>
        </div>
      </div>
      <RightClickTip />
      <PasteBox onSubmit={props.onPaste} defaultOpen />
    </section>
  );
}

export function ErrorView(props: {
  title: string;
  message: string;
  onRetry: () => void;
  retryDisabled?: boolean;
  extra?: ReactNode;
}) {
  return (
    <section
      className="pp-notice pp-notice-danger pp-enter flex flex-col gap-3"
      role="alert"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-[var(--pp-danger)]">
          <IconAlert />
        </span>
        <div className="flex-1 text-xs leading-relaxed">
          <p className="pp-notice-title">{props.title}</p>
          <p className="pp-muted mt-0.5">{props.message}</p>
        </div>
      </div>
      <button
        type="button"
        className="pp-btn pp-btn-secondary pp-btn-block"
        onClick={props.onRetry}
        disabled={props.retryDisabled}
      >
        <IconRefresh />
        Retry
      </button>
      {props.extra}
    </section>
  );
}
