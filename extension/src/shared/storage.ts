import { z } from 'zod';

export const CURRENT_SCHEMA_VERSION = 1;

export const profileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  headline: z.string().min(1, 'Headline is required').max(200),
  skills: z.array(z.string().min(1).max(80)).max(30),
  yearsExperience: z.number().int().min(0).max(60),
  hourlyRate: z.number().min(0).nullable(),
  currency: z.string().length(3),
  highlights: z.array(z.string().min(1).max(300)).max(5),
  defaultTone: z.enum(['friendly', 'professional', 'concise']),
  defaultLength: z.enum(['short', 'medium']),
  signOff: z.string().max(200).optional(),
});

export type Profile = z.infer<typeof profileSchema>;

export type HistoryItem = {
  id: string;
  jobTitle: string;
  platform: string;
  createdAt: string;
  proposal: string;
  priceAmount: number;
  priceCurrency: string;
};

export type StoredData = {
  schemaVersion: number;
  installId: string;
  profile: Profile | null;
  history: HistoryItem[];
  onboardingComplete: boolean;
};

const DEFAULT_PROFILE: Profile = {
  name: '',
  headline: '',
  skills: [],
  yearsExperience: 0,
  hourlyRate: null,
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
    profile: null,
    history: [],
    onboardingComplete: false,
  };
}

function migrate(raw: Record<string, unknown>): StoredData {
  const installId =
    typeof raw.installId === 'string' && raw.installId
      ? raw.installId
      : crypto.randomUUID();
  const version = typeof raw.schemaVersion === 'number' ? raw.schemaVersion : 0;
  // v0 → v1: wrap flat keys if needed
  if (version < 1) {
    return {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      installId,
      profile: (raw.profile as Profile | null) ?? null,
      history: Array.isArray(raw.history) ? (raw.history as HistoryItem[]) : [],
      onboardingComplete: Boolean(raw.onboardingComplete),
    };
  }
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    installId,
    profile: (raw.profile as Profile | null) ?? null,
    history: Array.isArray(raw.history) ? (raw.history as HistoryItem[]).slice(0, 50) : [],
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
    if (migrated.schemaVersion !== data.schemaVersion || !data.installId) {
      await chrome.storage.local.set(migrated);
    }
    return migrated;
  } catch {
    const fresh = emptyStore(crypto.randomUUID());
    return fresh;
  }
}

export async function saveStore(partial: Partial<StoredData>): Promise<StoredData> {
  const current = await loadStore();
  const next: StoredData = {
    ...current,
    ...partial,
    schemaVersion: CURRENT_SCHEMA_VERSION,
  };
  if (next.history.length > 50) {
    next.history = next.history
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 50);
  }
  await chrome.storage.local.set(next);
  return next;
}

export async function addHistoryItem(item: HistoryItem): Promise<void> {
  const current = await loadStore();
  const history = [item, ...current.history]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 50);
  await saveStore({ history });
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
  return { ...DEFAULT_PROFILE };
}

export function profileIsEmpty(profile: Profile | null): boolean {
  if (!profile) return true;
  return !profile.name.trim() || !profile.headline.trim();
}
