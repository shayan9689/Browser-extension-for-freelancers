import {
  useEffect,
  useId,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import {
  clearAllData,
  defaultProfile,
  exportData,
  loadStore,
  profileSchema,
  saveStore,
  type HistoryItem,
  type Profile,
} from '../../src/shared/storage';
import {
  IconCheck,
  IconCopy,
  IconDownload,
  IconHistory,
  IconLogo,
  IconPlus,
  IconSearch,
  IconShield,
  IconSparkles,
  IconTrash,
  IconUser,
  IconX,
} from '../../src/shared/ui/icons';

const TONES = ['friendly', 'professional', 'concise'] as const;
const LENGTHS = ['short', 'medium'] as const;

function completeness(p: Profile): number {
  const checks = [
    p.name.trim().length > 0,
    p.headline.trim().length > 0,
    p.skills.length >= 3,
    p.highlights.length >= 2,
    p.yearsExperience > 0,
    p.hourlyRate !== null,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export default function OptionsApp() {
  const [profile, setProfile] = useState<Profile>(defaultProfile());
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState('');
  const [skillInput, setSkillInput] = useState('');
  const [highlightInput, setHighlightInput] = useState('');
  const [historyQuery, setHistoryQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    void loadStore().then((data) => {
      if (data.profile) setProfile(data.profile);
      setHistory(data.history);
    });
  }, []);

  useEffect(() => {
    if (!status) return;
    const timer = setTimeout(() => setStatus(''), 3000);
    return () => clearTimeout(timer);
  }, [status]);

  useEffect(() => {
    if (!confirmDelete) return;
    const timer = setTimeout(() => setConfirmDelete(false), 4000);
    return () => clearTimeout(timer);
  }, [confirmDelete]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    const parsed = profileSchema.safeParse(profile);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join('.') || 'form';
        next[key] = issue.message;
      }
      setErrors(next);
      setStatus('');
      return;
    }
    setErrors({});
    await saveStore({ profile: parsed.data, onboardingComplete: true });
    setStatus('Profile saved');
  }

  function addSkill() {
    const v = skillInput.trim();
    if (!v || profile.skills.includes(v)) return;
    setProfile({ ...profile, skills: [...profile.skills, v].slice(0, 30) });
    setSkillInput('');
  }

  function addHighlight() {
    const v = highlightInput.trim();
    if (!v || profile.highlights.includes(v)) return;
    setProfile({ ...profile, highlights: [...profile.highlights, v].slice(0, 5) });
    setHighlightInput('');
  }

  function onEnter(action: () => void) {
    return (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        action();
      }
    };
  }

  const score = completeness(profile);
  const filtered = history.filter((h) =>
    h.jobTitle.toLowerCase().includes(historyQuery.toLowerCase()),
  );

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-5 p-5 text-sm">
      <header className="pp-enter flex items-center gap-3">
        <div className="pp-logo !h-11 !w-11 !rounded-xl">
          <IconLogo size={28} />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight">
            Proposal<span className="pp-gradient-text">Pilot</span> settings
          </h1>
          <p className="pp-muted text-xs">
            Your profile stays on this device. It is sent only when you generate a draft.
          </p>
        </div>
      </header>

      <form className="pp-stagger flex flex-col gap-4" onSubmit={(e) => void onSave(e)} noValidate>
        <Card
          icon={<IconUser />}
          title="Your profile"
          subtitle="Drafts use only these facts. Nothing is invented."
          aside={<Meter value={score} />}
        >
          <Field label="Full name" error={errors.name}>
            {(id) => (
              <input
                id={id}
                className="pp-input"
                value={profile.name}
                aria-invalid={Boolean(errors.name)}
                placeholder="Alex Morgan"
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              />
            )}
          </Field>
          <Field label="Headline" error={errors.headline}>
            {(id) => (
              <input
                id={id}
                className="pp-input"
                value={profile.headline}
                aria-invalid={Boolean(errors.headline)}
                placeholder="Python & FastAPI backend developer"
                onChange={(e) => setProfile({ ...profile, headline: e.target.value })}
              />
            )}
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Experience (yrs)" error={errors.yearsExperience}>
              {(id) => (
                <input
                  id={id}
                  type="number"
                  min={0}
                  max={60}
                  className="pp-input"
                  value={profile.yearsExperience}
                  onChange={(e) =>
                    setProfile({ ...profile, yearsExperience: Number(e.target.value) })
                  }
                />
              )}
            </Field>
            <Field label="Hourly rate">
              {(id) => (
                <input
                  id={id}
                  type="number"
                  min={0}
                  className="pp-input"
                  value={profile.hourlyRate ?? ''}
                  placeholder="40"
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      hourlyRate: e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                />
              )}
            </Field>
            <Field label="Currency" error={errors.currency}>
              {(id) => (
                <input
                  id={id}
                  className="pp-input uppercase"
                  value={profile.currency}
                  maxLength={3}
                  onChange={(e) =>
                    setProfile({ ...profile, currency: e.target.value.toUpperCase() })
                  }
                />
              )}
            </Field>
          </div>
        </Card>

        <Card
          icon={<IconSparkles />}
          title="Skills & highlights"
          subtitle="Add 3+ skills and 2–5 concrete achievements for the best drafts."
        >
          <Field label={`Skills · ${profile.skills.length}/30`}>
            {(id) => (
              <>
                {profile.skills.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {profile.skills.map((s) => (
                      <button
                        key={s}
                        type="button"
                        className="pp-chip pp-chip-btn"
                        aria-label={`Remove ${s}`}
                        onClick={() =>
                          setProfile({
                            ...profile,
                            skills: profile.skills.filter((x) => x !== s),
                          })
                        }
                      >
                        {s}
                        <IconX size={11} />
                      </button>
                    ))}
                  </div>
                ) : null}
                <div className="flex gap-2">
                  <input
                    id={id}
                    className="pp-input"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={onEnter(addSkill)}
                    placeholder="e.g. React — press Enter"
                  />
                  <button type="button" className="pp-btn pp-btn-secondary" onClick={addSkill}>
                    <IconPlus size={14} />
                    Add
                  </button>
                </div>
              </>
            )}
          </Field>

          <Field label={`Highlights · ${profile.highlights.length}/5`}>
            {(id) => (
              <>
                {profile.highlights.length > 0 ? (
                  <ul className="flex flex-col gap-1.5">
                    {profile.highlights.map((h) => (
                      <li
                        key={h}
                        className="flex items-start gap-2 rounded-lg border border-[var(--pp-border)] bg-[var(--pp-surface-2)] p-2.5 text-xs leading-relaxed"
                      >
                        <span className="mt-0.5 text-[var(--pp-brand-strong)]">
                          <IconCheck size={13} />
                        </span>
                        <span className="flex-1">{h}</span>
                        <button
                          type="button"
                          className="pp-icon-btn !h-6 !w-6"
                          aria-label="Remove highlight"
                          onClick={() =>
                            setProfile({
                              ...profile,
                              highlights: profile.highlights.filter((x) => x !== h),
                            })
                          }
                        >
                          <IconX size={12} />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <div className="flex gap-2">
                  <input
                    id={id}
                    className="pp-input"
                    value={highlightInput}
                    onChange={(e) => setHighlightInput(e.target.value)}
                    onKeyDown={onEnter(addHighlight)}
                    placeholder="e.g. Built Stripe billing for a SaaS app"
                    disabled={profile.highlights.length >= 5}
                  />
                  <button
                    type="button"
                    className="pp-btn pp-btn-secondary"
                    onClick={addHighlight}
                    disabled={profile.highlights.length >= 5}
                  >
                    <IconPlus size={14} />
                    Add
                  </button>
                </div>
              </>
            )}
          </Field>
        </Card>

        <Card title="Drafting defaults" subtitle="You can still change these per draft.">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="pp-label">Tone</span>
            <Segment
              label="Default tone"
              value={profile.defaultTone}
              options={TONES}
              onChange={(v) => setProfile({ ...profile, defaultTone: v })}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="pp-label">Length</span>
            <Segment
              label="Default length"
              value={profile.defaultLength}
              options={LENGTHS}
              onChange={(v) => setProfile({ ...profile, defaultLength: v })}
            />
          </div>
          <Field label="Sign-off (optional)">
            {(id) => (
              <input
                id={id}
                className="pp-input"
                value={profile.signOff ?? ''}
                placeholder="Best, Alex"
                onChange={(e) => setProfile({ ...profile, signOff: e.target.value })}
              />
            )}
          </Field>
        </Card>

        <div className="sticky bottom-3 z-10 flex items-center gap-3 rounded-2xl border border-[var(--pp-border)] bg-[var(--pp-surface-solid)]/90 p-2.5 shadow-lg backdrop-blur">
          <button type="submit" className="pp-btn pp-btn-primary pp-btn-lg flex-1">
            Save profile
          </button>
          <span aria-live="polite" className="min-w-24 text-xs">
            {status ? (
              <span className="pp-pop inline-flex items-center gap-1.5 font-semibold text-[var(--pp-brand-strong)]">
                <IconCheck size={14} />
                {status}
              </span>
            ) : Object.keys(errors).length > 0 ? (
              <span className="font-semibold text-[var(--pp-danger)]">Fix the fields above</span>
            ) : null}
          </span>
        </div>
      </form>

      <Card
        icon={<IconHistory />}
        title="History"
        subtitle={`Last ${history.length} of 50 drafts, stored only on this device.`}
      >
        {history.length > 0 ? (
          <>
            <div className="relative">
              <span className="pp-faint pointer-events-none absolute top-1/2 left-3 -translate-y-1/2">
                <IconSearch size={14} />
              </span>
              <input
                className="pp-input !pl-9"
                placeholder="Search by job title"
                value={historyQuery}
                onChange={(e) => setHistoryQuery(e.target.value)}
                aria-label="Search history"
              />
            </div>
            <ul className="flex flex-col gap-2">
              {filtered.map((h) => (
                <li
                  key={h.id}
                  className="flex items-start gap-3 rounded-xl border border-[var(--pp-border)] bg-[var(--pp-surface-2)] p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{h.jobTitle}</p>
                    <p className="pp-faint mt-0.5 text-[11px]">
                      {new Date(h.createdAt).toLocaleString()} · {h.priceCurrency}{' '}
                      {h.priceAmount}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="pp-icon-btn"
                    aria-label="Copy proposal"
                    title="Copy proposal"
                    onClick={() => {
                      void navigator.clipboard.writeText(h.proposal).then(() => {
                        setCopiedId(h.id);
                        setTimeout(() => setCopiedId(null), 1500);
                      });
                    }}
                  >
                    {copiedId === h.id ? (
                      <span className="pp-pop text-[var(--pp-brand-strong)]">
                        <IconCheck />
                      </span>
                    ) : (
                      <IconCopy />
                    )}
                  </button>
                  <button
                    type="button"
                    className="pp-icon-btn hover:!text-[var(--pp-danger)]"
                    aria-label="Delete from history"
                    title="Delete"
                    onClick={() => {
                      const next = history.filter((x) => x.id !== h.id);
                      setHistory(next);
                      void saveStore({ history: next });
                    }}
                  >
                    <IconTrash />
                  </button>
                </li>
              ))}
              {filtered.length === 0 ? (
                <li className="pp-faint py-3 text-center text-xs">No drafts match.</li>
              ) : null}
            </ul>
            <button
              type="button"
              className="pp-btn pp-btn-ghost pp-btn-sm self-start"
              onClick={() => {
                setHistory([]);
                void saveStore({ history: [] });
              }}
            >
              Clear history
            </button>
          </>
        ) : (
          <p className="pp-faint rounded-xl border border-dashed border-[var(--pp-border-strong)] py-6 text-center text-xs">
            Drafts you generate will appear here.
          </p>
        )}
      </Card>

      <Card
        icon={<IconShield />}
        title="Privacy & data"
        subtitle="When you click Generate, the job text and your profile are sent to the ProposalPilot server and its AI provider to write the draft. They are not stored there. Everything else stays in this browser."
      >
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="pp-btn pp-btn-secondary"
            onClick={async () => {
              const json = await exportData();
              const blob = new Blob([json], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'proposalpilot-export.json';
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            <IconDownload size={14} />
            Export my data
          </button>
          <button
            type="button"
            className="pp-btn pp-btn-danger"
            onClick={async () => {
              if (!confirmDelete) {
                setConfirmDelete(true);
                return;
              }
              await clearAllData();
              setConfirmDelete(false);
              setProfile(defaultProfile());
              setHistory([]);
              setStatus('All local data deleted');
            }}
          >
            <IconTrash size={14} />
            {confirmDelete ? 'Click again to confirm' : 'Delete all data'}
          </button>
        </div>
      </Card>

      <p className="pp-faint pb-2 text-center text-[11px]">
        ProposalPilot never submits anything for you. Review every draft before sending.
      </p>
    </main>
  );
}

function Card(props: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="pp-card flex flex-col gap-4 p-4">
      <div className="flex items-start gap-3">
        {props.icon ? (
          <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--pp-brand-soft)] text-[var(--pp-brand-strong)]">
            {props.icon}
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-bold tracking-tight">{props.title}</h2>
          {props.subtitle ? (
            <p className="pp-muted mt-0.5 text-xs leading-relaxed">{props.subtitle}</p>
          ) : null}
        </div>
        {props.aside}
      </div>
      {props.children}
    </section>
  );
}

function Meter(props: { value: number }) {
  const r = 15;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex shrink-0 items-center gap-2" title="Profile completeness">
      <svg width="38" height="38" viewBox="0 0 38 38" aria-hidden="true">
        <defs>
          <linearGradient id="pp-meter" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#2dd4bf" />
            <stop offset="1" stopColor="#0ea5e9" />
          </linearGradient>
        </defs>
        <circle cx="19" cy="19" r={r} fill="none" stroke="var(--pp-border)" strokeWidth="4" />
        <circle
          cx="19"
          cy="19"
          r={r}
          fill="none"
          stroke="url(#pp-meter)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * props.value) / 100}
          transform="rotate(-90 19 19)"
          style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
      </svg>
      <span className="text-xs font-bold tabular-nums">
        {props.value}%<span className="sr-only"> profile complete</span>
      </span>
    </div>
  );
}

function Segment<T extends string>(props: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
}) {
  return (
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
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="pp-label">
        {label}
      </label>
      {children(id)}
      {error ? <span className="text-xs text-[var(--pp-danger)]">{error}</span> : null}
    </div>
  );
}
