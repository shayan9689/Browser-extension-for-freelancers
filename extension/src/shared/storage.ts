import { z } from 'zod';

export const CURRENT_SCHEMA_VERSION = 2;

export const EXPERIENCE_LEVELS = ['entry', 'intermediate', 'expert'] as const;
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];

/** Suggested USD/hour by level: typical Pakistani freelancer rates (2025-26). */
export const DEFAULT_RATES: Record<ExperienceLevel, number> = {
  entry: 10,
  intermediate: 20,
  expert: 35,
};

export const LEVEL_LABEL: Record<ExperienceLevel, string> = {
  entry: 'Entry level',
  intermediate: 'Intermediate',
  expert: 'Expert',
};

/** Drafts kept per profile, and in total. */
export const HISTORY_PER_PROFILE = 50;
export const HISTORY_TOTAL = 300;

/** Minimums a profile needs before it can be used for drafts. */
export const MIN_SKILLS = 3;
export const MIN_HIGHLIGHTS = 1;

export const profileSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  headline: z.string().trim().min(1, 'Headline is required').max(200),
  skills: z.array(z.string().min(1).max(80)).max(30),
  yearsExperience: z.number().int().min(0).max(60),
  experienceLevel: z.enum(EXPERIENCE_LEVELS).default('intermediate'),
  hourlyRate: z.number().min(0).nullable(),
  currency: z.string().length(3),
  highlights: z.array(z.string().min(1).max(300)).max(5),
  defaultTone: z.enum(['friendly', 'professional', 'concise']),
  defaultLength: z.enum(['short', 'medium']),
  signOff: z.string().max(200).optional(),
});

export type Profile = z.infer<typeof profileSchema>;

/** A saved profile for one niche, e.g. "Web development". */
export type ProfileRecord = Profile & {
  id: string;
  label: string;
  createdAt: string;
  updatedAt: string;
};

export type HistoryItem = {
  id: string;
  jobTitle: string;
  platform: string;
  createdAt: string;
  proposal: string;
  priceAmount: number;
  priceCurrency: string;
  /** Profile used for this draft (absent on drafts made before v1.1). */
  profileId?: string;
  profileLabel?: string;
};

export type StoredData = {
  schemaVersion: number;
  installId: string;
  profiles: ProfileRecord[];
  activeProfileId: string | null;
  history: HistoryItem[];
  onboardingComplete: boolean;
};

const DEFAULT_PROFILE: Profile = {
  name: '',
  headline: '',
  skills: [],
  yearsExperience: 0,
  experienceLevel: 'intermediate',
  hourlyRate: DEFAULT_RATES.intermediate,
  currency: 'USD',
  highlights: [],
  defaultTone: 'professional',
  defaultLength: 'short',
  signOff: '',
};

function emptyStore(installId: string): StoredData {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    installId,
    profiles: [],
    activeProfileId: null,
    history: [],
    onboardingComplete: false,
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Fill fields added after a profile was saved. */
function normalizeProfile(raw: Record<string, unknown>): Profile {
  return { ...DEFAULT_PROFILE, ...(raw as Partial<Profile>) };
}

function capHistory(history: HistoryItem[]): HistoryItem[] {
  const perProfile = new Map<string, number>();
  return [...history]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .filter((item) => {
      const key = item.profileId ?? '';
      const count = (perProfile.get(key) ?? 0) + 1;
      perProfile.set(key, count);
      return count <= HISTORY_PER_PROFILE;
    })
    .slice(0, HISTORY_TOTAL);
}

export function migrate(raw: Record<string, unknown>): StoredData {
  const installId =
    typeof raw.installId === 'string' && raw.installId ? raw.installId : crypto.randomUUID();
  const history = Array.isArray(raw.history) ? (raw.history as HistoryItem[]) : [];
  const version = typeof raw.schemaVersion === 'number' ? raw.schemaVersion : 0;

  if (version < 2) {
    // v0/v1 had a single `profile`; it becomes the first profile in the list.
    const now = new Date().toISOString();
    const old = isObject(raw.profile) ? normalizeProfile(raw.profile) : null;
    const first: ProfileRecord | null = old
      ? { ...old, id: crypto.randomUUID(), label: 'Main profile', createdAt: now, updatedAt: now }
      : null;
    return {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      installId,
      profiles: first ? [first] : [],
      activeProfileId: first?.id ?? null,
      history: capHistory(
        history.map((h) => (first ? { ...h, profileId: first.id, profileLabel: first.label } : h)),
      ),
      onboardingComplete: Boolean(raw.onboardingComplete),
    };
  }

  const profiles = Array.isArray(raw.profiles)
    ? (raw.profiles as Record<string, unknown>[]).filter(isObject).map(
        (p) => ({ ...normalizeProfile(p), ...p }) as ProfileRecord,
      )
    : [];
  const active =
    typeof raw.activeProfileId === 'string' && profiles.some((p) => p.id === raw.activeProfileId)
      ? raw.activeProfileId
      : (profiles[0]?.id ?? null);
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    installId,
    profiles,
    activeProfileId: active,
    history: capHistory(history),
    onboardingComplete: Boolean(raw.onboardingComplete),
  };
}

export async function loadStore(): Promise<StoredData> {
  try {
    const data = await chrome.storage.local.get(null);
    if (!data || Object.keys(data).length === 0) {
      const fresh = emptyStore(crypto.randomUUID());
      await chrome.storage.local.set(fresh);
      return fresh;
    }
    const migrated = migrate(data as Record<string, unknown>);
    if (data.schemaVersion !== CURRENT_SCHEMA_VERSION || !data.installId) {
      await chrome.storage.local.set(migrated);
      if ('profile' in data) await chrome.storage.local.remove('profile');
    }
    return migrated;
  } catch {
    return emptyStore(crypto.randomUUID());
  }
}

export async function saveStore(partial: Partial<StoredData>): Promise<StoredData> {
  const current = await loadStore();
  const next: StoredData = {
    ...current,
    ...partial,
    schemaVersion: CURRENT_SCHEMA_VERSION,
  };
  next.history = capHistory(next.history);
  await chrome.storage.local.set(next);
  return next;
}

export async function addHistoryItem(item: HistoryItem): Promise<void> {
  const current = await loadStore();
  await saveStore({ history: [item, ...current.history] });
}

/** Insert or update a profile; the first profile becomes the active one. */
export async function upsertProfile(record: ProfileRecord): Promise<StoredData> {
  const current = await loadStore();
  const exists = current.profiles.some((p) => p.id === record.id);
  const saved = { ...record, updatedAt: new Date().toISOString() };
  const profiles = exists
    ? current.profiles.map((p) => (p.id === record.id ? saved : p))
    : [...current.profiles, saved];
  return saveStore({
    profiles,
    activeProfileId: current.activeProfileId ?? record.id,
    onboardingComplete: current.onboardingComplete || profileIsReady(saved),
  });
}

export async function deleteProfile(id: string): Promise<StoredData> {
  const current = await loadStore();
  const profiles = current.profiles.filter((p) => p.id !== id);
  const activeProfileId =
    current.activeProfileId === id ? (profiles[0]?.id ?? null) : current.activeProfileId;
  return saveStore({ profiles, activeProfileId });
}

export async function setActiveProfile(id: string): Promise<void> {
  await saveStore({ activeProfileId: id });
}

export async function clearAllData(): Promise<void> {
  await chrome.storage.local.clear();
  await loadStore();
}

export async function exportData(): Promise<string> {
  const data = await loadStore();
  return JSON.stringify(data, null, 2);
}

export function defaultProfile(): Profile {
  return { ...DEFAULT_PROFILE, skills: [], highlights: [] };
}

export function newProfileRecord(label = ''): ProfileRecord {
  const now = new Date().toISOString();
  return { ...defaultProfile(), id: crypto.randomUUID(), label, createdAt: now, updatedAt: now };
}

/** What is still missing before a profile can be used for drafts. */
export function profileMissing(profile: (Profile & { label?: string }) | null): string[] {
  if (!profile) return ['a profile'];
  const missing: string[] = [];
  if (profile.label !== undefined && !profile.label.trim()) missing.push('profile name');
  if (!profile.name.trim()) missing.push('your name');
  if (!profile.headline.trim()) missing.push('a headline');
  if (profile.skills.length < MIN_SKILLS) missing.push(`${MIN_SKILLS} skills`);
  if (profile.highlights.length < MIN_HIGHLIGHTS) missing.push('one achievement');
  if (!profile.hourlyRate || profile.hourlyRate <= 0) missing.push('your hourly rate');
  return missing;
}

export function profileIsReady(profile: (Profile & { label?: string }) | null): boolean {
  return profileMissing(profile).length === 0;
}

/** 0-100, used for the completeness meter. */
export function profileCompleteness(profile: Profile & { label?: string }): number {
  const checks = [
    Boolean(profile.label?.trim() ?? true),
    profile.name.trim().length > 0,
    profile.headline.trim().length > 0,
    profile.skills.length >= MIN_SKILLS,
    profile.highlights.length >= MIN_HIGHLIGHTS,
    profile.highlights.length >= 2,
    Boolean(profile.hourlyRate && profile.hourlyRate > 0),
    profile.yearsExperience > 0 || profile.experienceLevel === 'entry',
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function words(text: string): Set<string> {
  return new Set(text.toLowerCase().match(/[a-z0-9+#.]+/g) ?? []);
}

/**
 * The ready profile whose skills best match a job (by skill tags, then by
 * words in the title and description). Falls back to the active profile.
 */
export function pickProfileForJob(
  profiles: ProfileRecord[],
  job: { title: string; description: string; skills: string[] },
  activeId: string | null,
): ProfileRecord | null {
  const ready = profiles.filter(profileIsReady);
  if (ready.length === 0) return null;
  const jobSkills = new Set(job.skills.map((s) => s.toLowerCase()));
  const text = words(`${job.title} ${job.description}`);
  const score = (p: ProfileRecord) =>
    p.skills.reduce((sum, skill) => {
      const s = skill.toLowerCase();
      if (jobSkills.has(s)) return sum + 3;
      const parts = s.split(/\s+/);
      return parts.every((w) => text.has(w)) ? sum + 1 : sum;
    }, 0);
  const active = ready.find((p) => p.id === activeId) ?? ready[0];
  if (!active) return null;
  let best = active;
  let bestScore = score(active);
  for (const p of ready) {
    const s = score(p);
    if (s > bestScore) {
      best = p;
      bestScore = s;
    }
  }
  return best;
}
