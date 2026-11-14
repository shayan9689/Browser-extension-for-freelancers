/**
 * Optional cloud sync with Supabase: Google sign-in, then profiles and proposal
 * history are merged between this browser and the user's account.
 * Without sign-in everything keeps working locally.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  CLOUD_TOMBSTONES_KEY,
  defaultProfile,
  loadStore,
  readTombstones,
  saveStore,
  type HistoryItem,
  type Profile,
  type ProfileRecord,
} from './storage';

// Public values (the publishable key is meant to ship in clients; RLS protects the data).
const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ||
  'https://tbbfcxrpzitbzyothzka.supabase.co';
const SUPABASE_KEY =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
  'sb_publishable_h7rTRnHh3UHKh5vLY0R4Ww_SQT0Oku9';

export const CLOUD_AUTH_KEY = 'pp-cloud-auth';
export const CLOUD_META_KEY = 'cloudMeta';

/** What this browser knows about the last sync. */
export type CloudMeta = {
  lastSyncAt: string | null;
  /** Ids that existed in the cloud at the last sync (to detect remote deletes). */
  syncedProfileIds: string[];
  syncedHistoryIds: string[];
};

const chromeStorage = {
  getItem: async (key: string) => {
    const data = await chrome.storage.local.get(key);
    return (data[key] as string | undefined) ?? null;
  },
  setItem: async (key: string, value: string) => {
    await chrome.storage.local.set({ [key]: value });
  },
  removeItem: async (key: string) => {
    await chrome.storage.local.remove(key);
  },
};

let client: SupabaseClient | null = null;

export function cloud(): SupabaseClient {
  client ??= createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      storage: chromeStorage,
      storageKey: CLOUD_AUTH_KEY,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  });
  return client;
}

export type CloudUser = { email: string; name?: string; avatarUrl?: string };

export async function currentUser(): Promise<CloudUser | null> {
  const { data } = await cloud().auth.getSession();
  const user = data.session?.user;
  if (!user) return null;
  const meta = user.user_metadata as Record<string, unknown>;
  return {
    email: user.email ?? '',
    name: typeof meta.full_name === 'string' ? meta.full_name : undefined,
    avatarUrl: typeof meta.avatar_url === 'string' ? meta.avatar_url : undefined,
  };
}

/** Google sign-in in Chrome's auth window; must run from an extension page. */
export async function signInWithGoogle(): Promise<CloudUser> {
  const redirectTo = chrome.identity.getRedirectURL();
  const { data, error } = await cloud().auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: { prompt: 'select_account' },
    },
  });
  if (error || !data.url) throw new Error(error?.message ?? 'Could not start sign-in.');

  const result = await chrome.identity.launchWebAuthFlow({
    url: data.url,
    interactive: true,
  });
  if (!result) throw new Error('Sign-in was cancelled.');
  const params = new URL(result).searchParams;
  const code = params.get('code');
  if (!code) throw new Error(params.get('error_description') ?? 'Sign-in was cancelled.');

  const exchanged = await cloud().auth.exchangeCodeForSession(code);
  if (exchanged.error) throw new Error(exchanged.error.message);
  // A new account starts from a clean sync state.
  await chrome.storage.local.remove(CLOUD_META_KEY);
  const user = await currentUser();
  if (!user) throw new Error('Sign-in failed.');
  return user;
}

export async function signOut(): Promise<void> {
  await cloud().auth.signOut({ scope: 'local' });
  await chrome.storage.local.remove([CLOUD_META_KEY, CLOUD_TOMBSTONES_KEY]);
}

export async function readCloudMeta(): Promise<CloudMeta> {
  const data = await chrome.storage.local.get(CLOUD_META_KEY);
  const meta = data[CLOUD_META_KEY] as Partial<CloudMeta> | undefined;
  return {
    lastSyncAt: meta?.lastSyncAt ?? null,
    syncedProfileIds: meta?.syncedProfileIds ?? [],
    syncedHistoryIds: meta?.syncedHistoryIds ?? [],
  };
}

type ProfileRow = {
  id: string;
  label: string;
  data: Profile;
  created_at: string;
  updated_at: string;
};

type HistoryRow = {
  id: string;
  profile_id: string | null;
  profile_label: string | null;
  job_title: string;
  platform: string;
  proposal: string;
  price_amount: number;
  price_currency: string;
  created_at: string;
};

function toRow(p: ProfileRecord): ProfileRow {
  const { id, label, createdAt, updatedAt, ...data } = p;
  return { id, label, data, created_at: createdAt, updated_at: updatedAt };
}

function fromRow(r: ProfileRow): ProfileRecord {
  return {
    ...defaultProfile(),
    ...r.data,
    id: r.id,
    label: r.label,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function historyToRow(h: HistoryItem, profileIds: Set<string>): HistoryRow {
  return {
    id: h.id,
    // The profile may have been deleted; keep the label, drop the link.
    profile_id: h.profileId && profileIds.has(h.profileId) ? h.profileId : null,
    profile_label: h.profileLabel ?? null,
    job_title: h.jobTitle.slice(0, 300),
    platform: h.platform,
    proposal: h.proposal.slice(0, 8000),
    price_amount: h.priceAmount,
    price_currency: h.priceCurrency,
    created_at: h.createdAt,
  };
}

function historyFromRow(r: HistoryRow): HistoryItem {
  return {
    id: r.id,
    jobTitle: r.job_title,
    platform: r.platform,
    proposal: r.proposal,
    priceAmount: Number(r.price_amount),
    priceCurrency: r.price_currency,
    createdAt: r.created_at,
    profileId: r.profile_id ?? undefined,
    profileLabel: r.profile_label ?? undefined,
  };
}

function time(iso: string): number {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? 0 : t;
}

/** Pure merge step, exported for tests. */
export function mergeProfiles(
  local: ProfileRecord[],
  remote: ProfileRecord[],
  syncedIds: Set<string>,
): { merged: ProfileRecord[]; toPush: ProfileRecord[] } {
  const remoteById = new Map(remote.map((p) => [p.id, p]));
  const merged: ProfileRecord[] = [];
  const toPush: ProfileRecord[] = [];
  for (const p of local) {
    const r = remoteById.get(p.id);
    if (!r) {
      // In the cloud before but gone now: deleted on another device.
      if (syncedIds.has(p.id)) continue;
      merged.push(p);
      toPush.push(p);
    } else if (time(p.updatedAt) > time(r.updatedAt)) {
      merged.push(p);
      toPush.push(p);
    } else {
      merged.push(r);
    }
    remoteById.delete(p.id);
  }
  merged.push(...remoteById.values());
  return { merged, toPush };
}

export function mergeHistory(
  local: HistoryItem[],
  remote: HistoryItem[],
  syncedIds: Set<string>,
): { merged: HistoryItem[]; toPush: HistoryItem[] } {
  const remoteIds = new Set(remote.map((h) => h.id));
  const kept = local.filter((h) => remoteIds.has(h.id) || !syncedIds.has(h.id));
  const toPush = kept.filter((h) => !remoteIds.has(h.id));
  const byId = new Map<string, HistoryItem>();
  for (const h of [...remote, ...kept]) byId.set(h.id, h);
  return { merged: [...byId.values()], toPush };
}

let running: Promise<SyncResult> | null = null;

export type SyncResult = { signedIn: boolean; lastSyncAt?: string; error?: string };

/** Two-way sync; safe to call often (concurrent calls share one run). */
export function syncNow(): Promise<SyncResult> {
  running ??= doSync().finally(() => {
    running = null;
  });
  return running;
}

async function doSync(): Promise<SyncResult> {
  const db = cloud();
  const { data: auth } = await db.auth.getSession();
  if (!auth.session) return { signedIn: false };
  try {
    const tomb = await readTombstones();
    if (tomb.profiles.length) {
      const { error } = await db
        .from('freelancer_profiles')
        .delete()
        .in('id', tomb.profiles);
      if (error) throw error;
    }
    for (let i = 0; i < tomb.history.length; i += 100) {
      const ids = tomb.history.slice(i, i + 100);
      const { error } = await db.from('proposal_history').delete().in('id', ids);
      if (error) throw error;
    }
    await chrome.storage.local.remove(CLOUD_TOMBSTONES_KEY);

    const [profilesRes, historyRes] = await Promise.all([
      db.from('freelancer_profiles').select('id,label,data,created_at,updated_at'),
      db
        .from('proposal_history')
        .select(
          'id,profile_id,profile_label,job_title,platform,proposal,price_amount,price_currency,created_at',
        )
        .order('created_at', { ascending: false })
        .limit(300),
    ]);
    if (profilesRes.error) throw profilesRes.error;
    if (historyRes.error) throw historyRes.error;

    const meta = await readCloudMeta();
    const store = await loadStore();
    const remoteProfiles = (profilesRes.data as ProfileRow[]).map(fromRow);
    const remoteHistory = (historyRes.data as HistoryRow[]).map(historyFromRow);

    const profiles = mergeProfiles(
      store.profiles,
      remoteProfiles,
      new Set(meta.syncedProfileIds),
    );
    if (profiles.toPush.length) {
      const { error } = await db
        .from('freelancer_profiles')
        .upsert(profiles.toPush.map(toRow));
      if (error) throw error;
    }

    const history = mergeHistory(
      store.history,
      remoteHistory,
      new Set(meta.syncedHistoryIds),
    );
    if (history.toPush.length) {
      const ids = new Set(profiles.merged.map((p) => p.id));
      const { error } = await db.from('proposal_history').upsert(
        history.toPush.map((h) => historyToRow(h, ids)),
        { ignoreDuplicates: true },
      );
      if (error) throw error;
    }

    const activeProfileId = profiles.merged.some((p) => p.id === store.activeProfileId)
      ? store.activeProfileId
      : (profiles.merged[0]?.id ?? null);
    const saved = await saveStore({
      profiles: profiles.merged,
      history: history.merged,
      activeProfileId,
      onboardingComplete: store.onboardingComplete || profiles.merged.length > 0,
    });

    const lastSyncAt = new Date().toISOString();
    const next: CloudMeta = {
      lastSyncAt,
      syncedProfileIds: saved.profiles.map((p) => p.id),
      syncedHistoryIds: saved.history.map((h) => h.id),
    };
    await chrome.storage.local.set({ [CLOUD_META_KEY]: next });
    return { signedIn: true, lastSyncAt };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : String((err as { message?: unknown })?.message ?? err);
    return { signedIn: true, error: message };
  }
}
