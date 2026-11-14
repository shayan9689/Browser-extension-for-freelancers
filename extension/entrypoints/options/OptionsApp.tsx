import { useEffect, useMemo, useState } from 'react';
import {
  LEVEL_LABEL,
  clearAllData,
  deleteHistoryItems,
  deleteProfile,
  exportData,
  loadStore,
  profileCompleteness,
  profileMissing,
  setActiveProfile,
  upsertProfile,
  type HistoryItem,
  type ProfileRecord,
} from '../../src/shared/storage';
import { syncNow } from '../../src/shared/cloud';
import { AccountCard } from '../../src/shared/ui/AccountCard';
import { Card, Meter } from '../../src/shared/ui/form';
import {
  ProfileForm,
  validateProfile,
  type ProfileErrors,
} from '../../src/shared/ui/ProfileForm';
import {
  IconCheck,
  IconCopy,
  IconDownload,
  IconEdit,
  IconHistory,
  IconLayers,
  IconLogo,
  IconPlus,
  IconSearch,
  IconShield,
  IconTrash,
} from '../../src/shared/ui/icons';

export default function OptionsApp() {
  const [profiles, setProfiles] = useState<ProfileRecord[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [editing, setEditing] = useState<ProfileRecord | null>(null);
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [status, setStatus] = useState('');
  const [historyQuery, setHistoryQuery] = useState('');
  const [historyFilter, setHistoryFilter] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

  const reload = async () => {
    const data = await loadStore();
    setProfiles(data.profiles);
    setActiveId(data.activeProfileId);
    setHistory(data.history);
    return data;
  };

  useEffect(() => {
    void reload().then((data) => {
      const params = new URLSearchParams(window.location.search);
      const id = params.get('profile');
      const target = data.profiles.find((p) => p.id === id);
      if (target) setEditing(target);
    });
    const onChanged = (_: unknown, area: string) => {
      if (area === 'local') void reload();
    };
    chrome.storage.onChanged.addListener(onChanged);
    return () => chrome.storage.onChanged.removeListener(onChanged);
  }, []);

  useEffect(() => {
    if (!status) return;
    const timer = setTimeout(() => setStatus(''), 3000);
    return () => clearTimeout(timer);
  }, [status]);

  useEffect(() => {
    if (!confirm) return;
    const timer = setTimeout(() => setConfirm(null), 4000);
    return () => clearTimeout(timer);
  }, [confirm]);

  const save = async () => {
    if (!editing) return;
    const e = validateProfile(editing);
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    await upsertProfile(editing);
    void syncNow();
    setEditing(null);
    setStatus(`Saved "${editing.label}"`);
    await reload();
  };

  const filteredHistory = useMemo(
    () =>
      history.filter(
        (h) =>
          (historyFilter === 'all' || h.profileId === historyFilter) &&
          h.jobTitle.toLowerCase().includes(historyQuery.toLowerCase()),
      ),
    [history, historyFilter, historyQuery],
  );

  const profileLabel = (h: HistoryItem) =>
    profiles.find((p) => p.id === h.profileId)?.label ?? h.profileLabel;

  const openWizard = () => {
    window.location.href = chrome.runtime.getURL('/welcome.html?setup=new');
  };

  return (
    <div className="min-h-screen text-sm">
      <nav className="pp-nav">
        <div className="pp-nav-inner flex h-16 items-center gap-3">
          <div className="pp-logo">
            <IconLogo size={22} />
          </div>
          <span className="text-[15px] font-bold tracking-tight">
            Proposal<span className="pp-gradient-text">Pilot</span>
          </span>
          <span className="pp-badge hidden sm:inline-flex">Settings</span>
          <div className="flex-1" />
          <div className="hidden items-center gap-1 md:flex">
            {[
              ['#account', 'Account'],
              ['#profiles', 'Profiles'],
              ['#history', 'History'],
              ['#privacy', 'Privacy'],
            ].map(([href, label]) => (
              <a key={href} href={href} className="pp-btn pp-btn-ghost pp-btn-sm">
                {label}
              </a>
            ))}
          </div>
          <button
            type="button"
            className="pp-btn pp-btn-primary pp-btn-sm"
            onClick={openWizard}
            disabled={profiles.length >= 10}
          >
            <IconPlus size={14} />
            New profile
          </button>
        </div>
      </nav>

      <main className="pp-page pp-stagger mx-auto flex max-w-4xl flex-col gap-6 py-10">
        <header className="flex flex-wrap items-end gap-4">
          <div className="min-w-0 flex-1">
            <p className="pp-label">Your workspace</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              Profiles, history and sync
            </h1>
            <p className="pp-muted mt-1 text-[13px]">
              Profiles stay in this browser, and in your account if you sign in to sync.
            </p>
          </div>
          <div className="flex gap-2">
            <span className="pp-stat !min-w-24 !py-2">
              <span className="pp-label">Profiles</span>
              <span className="pp-stat-value">{profiles.length}</span>
            </span>
            <span className="pp-stat !min-w-24 !py-2">
              <span className="pp-label">Drafts</span>
              <span className="pp-stat-value">{history.length}</span>
            </span>
          </div>
          <span aria-live="polite" className="w-full text-xs">
            {status ? (
              <span className="pp-pop inline-flex items-center gap-1.5 font-semibold text-[var(--pp-brand-strong)]">
                <IconCheck size={14} />
                {status}
              </span>
            ) : null}
          </span>
        </header>

        <div id="account" className="scroll-mt-24">
          <AccountCard />
        </div>

        {editing ? (
          <Card
            icon={<IconEdit />}
            title={
              profiles.some((p) => p.id === editing.id) ? 'Edit profile' : 'New profile'
            }
            subtitle="Drafts use only these facts. Nothing is invented."
            aside={<Meter value={profileCompleteness(editing)} />}
            className="pp-card-glow pp-enter"
          >
            <ProfileForm value={editing} errors={errors} onChange={setEditing} />
            <div className="sticky bottom-3 z-10 flex items-center gap-3 rounded-2xl border border-[var(--pp-border)] bg-[var(--pp-surface-solid)]/90 p-2.5 shadow-lg backdrop-blur">
              <button
                type="button"
                className="pp-btn pp-btn-primary pp-btn-lg flex-1"
                onClick={() => void save()}
              >
                Save profile
              </button>
              <button
                type="button"
                className="pp-btn pp-btn-ghost pp-btn-lg"
                onClick={() => {
                  setEditing(null);
                  setErrors({});
                }}
              >
                Cancel
              </button>
              {Object.keys(errors).length > 0 ? (
                <span className="text-xs font-semibold text-[var(--pp-danger)]">
                  Fix the fields above
                </span>
              ) : null}
            </div>
          </Card>
        ) : (
          <Card
            id="profiles"
            icon={<IconLayers />}
            title="Profiles"
            subtitle="One profile per niche. The best match is picked for each job, and you can switch in the popup."
            aside={
              <button
                type="button"
                className="pp-btn pp-btn-primary pp-btn-sm"
                onClick={openWizard}
                disabled={profiles.length >= 10}
              >
                <IconPlus size={14} />
                New profile
              </button>
            }
          >
            {profiles.length === 0 ? (
              <p className="pp-faint rounded-xl border border-dashed border-[var(--pp-border-strong)] py-8 text-center text-xs">
                No profiles yet. Create one to start drafting proposals.
              </p>
            ) : (
              <ul className="pp-stagger grid gap-3 sm:grid-cols-2">
                {profiles.map((p) => {
                  const missing = profileMissing(p);
                  const isActive = p.id === activeId;
                  return (
                    <li
                      key={p.id}
                      className={`flex flex-col gap-3 rounded-xl border p-4 ${
                        isActive
                          ? 'border-[var(--pp-brand)] bg-[var(--pp-brand-soft)]'
                          : 'border-[var(--pp-border)] bg-[var(--pp-surface-2)]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-2 font-bold">
                            <span className="truncate">{p.label || 'Untitled'}</span>
                            {isActive ? (
                              <span className="pp-badge pp-badge-accent">Default</span>
                            ) : null}
                          </p>
                          <p className="pp-muted mt-0.5 truncate text-xs">
                            {p.headline || p.name}
                          </p>
                          <p className="pp-faint mt-1 text-[11px]">
                            {LEVEL_LABEL[p.experienceLevel]} · {p.currency}{' '}
                            {p.hourlyRate ?? '-'}/hr · {p.skills.length} skills
                          </p>
                        </div>
                        <Meter value={profileCompleteness(p)} size={34} />
                      </div>
                      {missing.length > 0 ? (
                        <p className="text-[11px] font-semibold text-[var(--pp-warn-text)]">
                          Needs {missing.join(', ')}
                        </p>
                      ) : null}
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          className="pp-btn pp-btn-secondary pp-btn-sm"
                          onClick={() => {
                            setErrors({});
                            setEditing(p);
                          }}
                        >
                          <IconEdit size={13} />
                          Edit
                        </button>
                        {!isActive ? (
                          <button
                            type="button"
                            className="pp-btn pp-btn-ghost pp-btn-sm"
                            onClick={() => void setActiveProfile(p.id).then(reload)}
                          >
                            Make default
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="pp-btn pp-btn-ghost pp-btn-sm ml-auto hover:!text-[var(--pp-danger)]"
                          onClick={() => {
                            if (confirm !== `profile:${p.id}`) {
                              setConfirm(`profile:${p.id}`);
                              return;
                            }
                            setConfirm(null);
                            void deleteProfile(p.id).then(() => {
                              void syncNow();
                              setStatus(`Deleted "${p.label}"`);
                              return reload();
                            });
                          }}
                        >
                          <IconTrash size={13} />
                          {confirm === `profile:${p.id}` ? 'Confirm' : 'Delete'}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        )}

        <Card
          id="history"
          icon={<IconHistory />}
          title="History"
          subtitle={`${history.length} ${history.length === 1 ? 'draft' : 'drafts'}, saved with the profile that wrote ${history.length === 1 ? 'it' : 'them'}.`}
        >
          {history.length > 0 ? (
            <>
              <div
                className="flex flex-wrap gap-1.5"
                role="group"
                aria-label="Filter by profile"
              >
                {[{ id: 'all', label: 'All' }, ...profiles].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="pp-chip pp-chip-btn"
                    data-active={historyFilter === p.id || undefined}
                    aria-pressed={historyFilter === p.id}
                    onClick={() => setHistoryFilter(p.id)}
                  >
                    {p.label || 'Untitled'}
                  </button>
                ))}
              </div>
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
                {filteredHistory.map((h) => (
                  <li
                    key={h.id}
                    className="rounded-xl border border-[var(--pp-border)] bg-[var(--pp-surface-2)]"
                  >
                    <details className="pp-details">
                      <summary className="flex items-start gap-3 p-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">{h.jobTitle}</p>
                          <p className="pp-faint mt-0.5 text-[11px]">
                            {new Date(h.createdAt).toLocaleString()} · {h.priceCurrency}{' '}
                            {h.priceAmount}
                            {profileLabel(h) ? ` · ${profileLabel(h)}` : ''}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="pp-icon-btn"
                          aria-label="Copy proposal"
                          title="Copy proposal"
                          onClick={(e) => {
                            e.preventDefault();
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
                          onClick={(e) => {
                            e.preventDefault();
                            setHistory(history.filter((x) => x.id !== h.id));
                            void deleteHistoryItems([h.id]).then(() => syncNow());
                          }}
                        >
                          <IconTrash />
                        </button>
                      </summary>
                      <p className="pp-muted px-3 pb-3 text-xs leading-relaxed whitespace-pre-line">
                        {h.proposal}
                      </p>
                    </details>
                  </li>
                ))}
                {filteredHistory.length === 0 ? (
                  <li className="pp-faint py-3 text-center text-xs">No drafts match.</li>
                ) : null}
              </ul>
              <button
                type="button"
                className="pp-btn pp-btn-ghost pp-btn-sm self-start"
                onClick={() => {
                  if (confirm !== 'history') {
                    setConfirm('history');
                    return;
                  }
                  setConfirm(null);
                  const ids = history.map((h) => h.id);
                  setHistory([]);
                  void deleteHistoryItems(ids).then(() => syncNow());
                }}
              >
                {confirm === 'history'
                  ? 'Click again to clear all history'
                  : 'Clear history'}
              </button>
            </>
          ) : (
            <p className="pp-faint rounded-xl border border-dashed border-[var(--pp-border-strong)] py-6 text-center text-xs">
              Drafts you generate will appear here.
            </p>
          )}
        </Card>

        <Card
          id="privacy"
          icon={<IconShield />}
          title="Privacy & data"
          subtitle="When you click Generate, the job text and the chosen profile are sent to the ProposalPilot server and its AI provider to write the draft. They are not stored there. Profiles and history stay in this browser, and in your ProposalPilot account only if you sign in to cloud sync."
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
                if (confirm !== 'all') {
                  setConfirm('all');
                  return;
                }
                await clearAllData();
                setConfirm(null);
                setEditing(null);
                await reload();
                setStatus('All local data deleted');
              }}
            >
              <IconTrash size={14} />
              {confirm === 'all' ? 'Click again to confirm' : 'Delete local data'}
            </button>
          </div>
        </Card>

        <p className="pp-faint pb-2 text-center text-[11px]">
          ProposalPilot never submits anything for you. Review every draft before sending.
        </p>
      </main>
    </div>
  );
}
