import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CURRENT_SCHEMA_VERSION,
  addHistoryItem,
  clearAllData,
  loadStore,
  profileSchema,
  saveStore,
  type HistoryItem,
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
    _dump: () => store,
  };
}

describe('storage', () => {
  beforeEach(() => {
    const mem = memoryStorage();
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
});
