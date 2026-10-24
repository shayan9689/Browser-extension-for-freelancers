import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
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

export default function OptionsApp() {
  const [profile, setProfile] = useState<Profile>(defaultProfile());
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState('');
  const [skillInput, setSkillInput] = useState('');
  const [highlightInput, setHighlightInput] = useState('');
  const [historyQuery, setHistoryQuery] = useState('');

  useEffect(() => {
    void loadStore().then((data) => {
      if (data.profile) setProfile(data.profile);
      setHistory(data.history);
    });
  }, []);

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
      return;
    }
    setErrors({});
    await saveStore({ profile: parsed.data, onboardingComplete: true });
    setStatus('Profile saved.');
  }

  const filtered = history.filter((h) =>
    h.jobTitle.toLowerCase().includes(historyQuery.toLowerCase()),
  );

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 p-6 text-sm">
      <header>
        <h1 className="text-2xl font-semibold">ProposalPilot settings</h1>
        <p className="opacity-80">
          Your profile stays on this device. Job text is sent only when you generate a
          proposal.
        </p>
      </header>

      <form className="flex flex-col gap-3" onSubmit={(e) => void onSave(e)}>
        <Field label="Full name" error={errors.name}>
          <input
            className="w-full rounded border border-slate-500/40 bg-transparent px-2 py-1"
            value={profile.name}
            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
          />
        </Field>
        <Field label="Headline" error={errors.headline}>
          <input
            className="w-full rounded border border-slate-500/40 bg-transparent px-2 py-1"
            value={profile.headline}
            onChange={(e) => setProfile({ ...profile, headline: e.target.value })}
          />
        </Field>
        <Field label="Years of experience" error={errors.yearsExperience}>
          <input
            type="number"
            min={0}
            max={60}
            className="w-full rounded border border-slate-500/40 bg-transparent px-2 py-1"
            value={profile.yearsExperience}
            onChange={(e) =>
              setProfile({ ...profile, yearsExperience: Number(e.target.value) })
            }
          />
        </Field>
        <div className="flex gap-2">
          <Field label="Hourly rate">
            <input
              type="number"
              min={0}
              className="w-full rounded border border-slate-500/40 bg-transparent px-2 py-1"
              value={profile.hourlyRate ?? ''}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  hourlyRate: e.target.value === '' ? null : Number(e.target.value),
                })
              }
            />
          </Field>
          <Field label="Currency">
            <input
              className="w-full rounded border border-slate-500/40 bg-transparent px-2 py-1"
              value={profile.currency}
              maxLength={3}
              onChange={(e) =>
                setProfile({ ...profile, currency: e.target.value.toUpperCase() })
              }
            />
          </Field>
        </div>

        <Field label="Skills">
          <div className="flex flex-wrap gap-1">
            {profile.skills.map((s) => (
              <button
                key={s}
                type="button"
                className="rounded-full bg-teal-600/20 px-2 py-0.5 text-xs"
                onClick={() =>
                  setProfile({
                    ...profile,
                    skills: profile.skills.filter((x) => x !== s),
                  })
                }
              >
                {s} ×
              </button>
            ))}
          </div>
          <div className="mt-1 flex gap-2">
            <input
              className="flex-1 rounded border border-slate-500/40 bg-transparent px-2 py-1"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              placeholder="Add skill"
            />
            <button
              type="button"
              className="rounded border border-slate-500/40 px-2"
              onClick={() => {
                const v = skillInput.trim();
                if (!v || profile.skills.includes(v)) return;
                setProfile({ ...profile, skills: [...profile.skills, v].slice(0, 30) });
                setSkillInput('');
              }}
            >
              Add
            </button>
          </div>
        </Field>

        <Field label="Highlights (3–5 recommended)">
          <ul className="space-y-1">
            {profile.highlights.map((h) => (
              <li key={h} className="flex justify-between gap-2">
                <span>{h}</span>
                <button
                  type="button"
                  onClick={() =>
                    setProfile({
                      ...profile,
                      highlights: profile.highlights.filter((x) => x !== h),
                    })
                  }
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-1 flex gap-2">
            <input
              className="flex-1 rounded border border-slate-500/40 bg-transparent px-2 py-1"
              value={highlightInput}
              onChange={(e) => setHighlightInput(e.target.value)}
            />
            <button
              type="button"
              className="rounded border border-slate-500/40 px-2"
              onClick={() => {
                const v = highlightInput.trim();
                if (!v) return;
                setProfile({
                  ...profile,
                  highlights: [...profile.highlights, v].slice(0, 5),
                });
                setHighlightInput('');
              }}
            >
              Add
            </button>
          </div>
        </Field>

        <div className="flex gap-2">
          <Field label="Default tone">
            <select
              className="w-full rounded border border-slate-500/40 bg-transparent px-2 py-1"
              value={profile.defaultTone}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  defaultTone: e.target.value as Profile['defaultTone'],
                })
              }
            >
              <option value="friendly">friendly</option>
              <option value="professional">professional</option>
              <option value="concise">concise</option>
            </select>
          </Field>
          <Field label="Default length">
            <select
              className="w-full rounded border border-slate-500/40 bg-transparent px-2 py-1"
              value={profile.defaultLength}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  defaultLength: e.target.value as Profile['defaultLength'],
                })
              }
            >
              <option value="short">short</option>
              <option value="medium">medium</option>
            </select>
          </Field>
        </div>

        <Field label="Optional sign-off">
          <input
            className="w-full rounded border border-slate-500/40 bg-transparent px-2 py-1"
            value={profile.signOff ?? ''}
            onChange={(e) => setProfile({ ...profile, signOff: e.target.value })}
          />
        </Field>

        <button
          type="submit"
          className="rounded-md bg-teal-600 px-3 py-2 font-medium text-white"
        >
          Save profile
        </button>
        {status ? <p className="text-teal-600">{status}</p> : null}
      </form>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">History (local only)</h2>
        <input
          className="rounded border border-slate-500/40 bg-transparent px-2 py-1"
          placeholder="Search history"
          value={historyQuery}
          onChange={(e) => setHistoryQuery(e.target.value)}
        />
        <ul className="space-y-2">
          {filtered.map((h) => (
            <li key={h.id} className="rounded border border-slate-500/40 p-2">
              <p className="font-medium">{h.jobTitle}</p>
              <p className="text-xs opacity-70">
                {h.platform} · {new Date(h.createdAt).toLocaleString()} ·{' '}
                {h.priceCurrency} {h.priceAmount}
              </p>
              <div className="mt-1 flex gap-2">
                <button
                  type="button"
                  onClick={() => void navigator.clipboard.writeText(h.proposal)}
                >
                  Copy
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = history.filter((x) => x.id !== h.id);
                    setHistory(next);
                    void saveStore({ history: next });
                  }}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="self-start rounded border border-slate-500/40 px-2 py-1"
          onClick={() => {
            setHistory([]);
            void saveStore({ history: [] });
          }}
        >
          Clear all history
        </button>
      </section>

      <section className="flex flex-col gap-2 rounded border border-slate-500/40 p-3">
        <h2 className="text-lg font-semibold">Privacy & data</h2>
        <p className="text-xs opacity-80">
          When you click Generate, job text and your profile are sent to your ProposalPilot
          backend and the configured LLM provider. Nothing else leaves this device. History
          and profile stay in chrome.storage.local.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded border border-slate-500/40 px-2 py-1"
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
            Export my data
          </button>
          <button
            type="button"
            className="rounded border border-red-500/50 px-2 py-1 text-red-600"
            onClick={async () => {
              await clearAllData();
              setProfile(defaultProfile());
              setHistory([]);
              setStatus('All local data deleted.');
            }}
          >
            Delete all data
          </button>
        </div>
      </section>
    </main>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs uppercase opacity-60">{label}</span>
      {children}
      {error ? <span className="text-xs text-red-500">{error}</span> : null}
    </label>
  );
}
