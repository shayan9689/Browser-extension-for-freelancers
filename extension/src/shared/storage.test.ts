import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CURRENT_SCHEMA_VERSION,
  addHistoryItem,
  clearAllData,
  deleteProfile,
  loadStore,
  newProfileRecord,
  pickProfileForJob,
  profileIsReady,
  profileMissing,
  profileSchema,
  saveStore,
  upsertProfile,
  type HistoryItem,
  type ProfileRecord,
} from './storage';

function memoryStorage() {
  let store: Record<string, unknown> = {};
  return {
    get: vi.fn(async (keys: null | string | string[] | Record<string, unknown>) => {
      if (keys === null) return { ...store };
      if (typeof keys === 'string') return { [keys]: store[keys] };
      if (Array.isArray(keys)) {
        const out: Record<string, unknown> = {};
        for (const k of keys) out[k] = store[k];
        return out;
      }
      return { ...keys, ...store };
    }),
    set: vi.fn(async (items: Record<string, unknown>) => {
      store = { ...store, ...items };
    }),
    clear: vi.fn(async () => {
      store = {};
    }),
    remove: vi.fn(async (key: string) => {
      const { [key]: _removed, ...rest } = store;
      void _removed;
      store = rest;
    }),
    _dump: () => store,
  };
}

describe('storage', () => {
  let mem: ReturnType<typeof memoryStorage>;
  beforeEach(() => {
    mem = memoryStorage();
    vi.stubGlobal('chrome', {
      storage: { local: mem },
    });
  });

  it('validates profile with zod', () => {
    const parsed = profileSchema.safeParse({
      name: 'Alex',
      headline: 'Dev',
      skills: ['Python'],
      yearsExperience: 3,
      hourlyRate: 40,
      currency: 'USD',
      highlights: ['Built APIs'],
      defaultTone: 'professional',
      defaultLength: 'short',
    });
    expect(parsed.success).toBe(true);
  });

  it('migrates and caps history at 50', async () => {
    const first = await loadStore();
    expect(first.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(first.installId).toBeTruthy();

    for (let i = 0; i < 51; i++) {
      const item: HistoryItem = {
        id: `id-${i}`,
        jobTitle: `Job ${i}`,
        platform: 'generic',
        createdAt: new Date(Date.now() + i).toISOString(),
        proposal: 'text',
        priceAmount: 1,
        priceCurrency: 'USD',
      };
      await addHistoryItem(item);
    }
    const after = await loadStore();
    expect(after.history.length).toBe(50);
  });

  it('delete-all empties storage then recreates defaults', async () => {
    await saveStore({ onboardingComplete: true });
    await clearAllData();
    const data = await loadStore();
    expect(data.onboardingComplete).toBe(false);
    expect(data.history).toEqual([]);
  });

  it('migrates a v1 single profile into the profile list with its history', async () => {
    await mem.set({
      schemaVersion: 1,
      installId: 'abc',
      onboardingComplete: true,
      profile: {
        name: 'Alex',
        headline: 'Dev',
        skills: ['Python'],
        yearsExperience: 3,
        hourlyRate: 40,
        currency: 'USD',
        highlights: [],
        defaultTone: 'professional',
        defaultLength: 'short',
      },
      history: [{ id: 'h1', jobTitle: 'Old', platform: 'generic', createdAt: '2026-01-01T00:00:00Z', proposal: 'x', priceAmount: 1, priceCurrency: 'USD' }],
    });
    const data = await loadStore();
    expect(data.profiles).toHaveLength(1);
    const first = data.profiles[0]!;
    expect(first.label).toBe('Main profile');
    expect(first.experienceLevel).toBe('intermediate');
    expect(data.activeProfileId).toBe(first.id);
    expect(data.history[0]?.profileId).toBe(first.id);
    expect(mem._dump().profile).toBeUndefined();
  });

  it('lists what a profile still needs', () => {
    const p = newProfileRecord('Web');
    expect(profileIsReady(p)).toBe(false);
    expect(profileMissing(p)).toEqual(['your name', 'a headline', '3 skills', 'one achievement']);
    const ready = { ...p, name: 'A', headline: 'Dev', skills: ['a', 'b', 'c'], highlights: ['Did X'] };
    expect(profileIsReady(ready)).toBe(true);
    expect(profileMissing({ ...ready, hourlyRate: null })).toEqual(['your hourly rate']);
  });

  it('picks the ready profile that best matches the job', () => {
    const base = { name: 'A', headline: 'H', highlights: ['Did X'] };
    const web: ProfileRecord = { ...newProfileRecord('Web'), ...base, skills: ['React', 'Node.js', 'CSS'] };
    const wp: ProfileRecord = { ...newProfileRecord('WP'), ...base, skills: ['WordPress', 'Elementor', 'PHP'] };
    const draft: ProfileRecord = { ...newProfileRecord('Draft'), skills: ['Shopify'] };
    const job = { title: 'Fix my WordPress site', description: 'Elementor layout is broken', skills: [] };
    expect(pickProfileForJob([web, wp, draft], job, web.id)?.id).toBe(wp.id);
    const other = { title: 'Logo', description: 'Need a logo', skills: [] };
    expect(pickProfileForJob([web, wp], other, web.id)?.id).toBe(web.id);
    expect(pickProfileForJob([draft], job, null)).toBeNull();
  });

  it('adds, activates and deletes profiles', async () => {
    const a = newProfileRecord('A');
    const b = newProfileRecord('B');
    await upsertProfile(a);
    let data = await upsertProfile(b);
    expect(data.profiles.map((p) => p.label)).toEqual(['A', 'B']);
    expect(data.activeProfileId).toBe(a.id);
    data = await deleteProfile(a.id);
    expect(data.activeProfileId).toBe(b.id);
  });
});
