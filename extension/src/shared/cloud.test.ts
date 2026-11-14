import { describe, expect, it } from 'vitest';
import { mergeHistory, mergeProfiles } from './cloud';
import { newProfileRecord, type HistoryItem, type ProfileRecord } from './storage';

function profile(id: string, updatedAt: string, label = id): ProfileRecord {
  return { ...newProfileRecord(label), id, updatedAt };
}

function draft(id: string): HistoryItem {
  return {
    id,
    jobTitle: id,
    platform: 'upwork',
    createdAt: '2026-11-15T10:00:00Z',
    proposal: 'text',
    priceAmount: 10,
    priceCurrency: 'USD',
  };
}

describe('cloud merge', () => {
  it('keeps the newer copy of each profile and pushes local changes', () => {
    const local = [
      profile('a', '2026-11-15T12:00:00Z', 'local A'),
      profile('b', '2026-11-15T09:00:00Z'),
    ];
    const remote = [
      profile('a', '2026-11-15T11:00:00Z', 'remote A'),
      profile('b', '2026-11-15T10:00:00Z', 'remote B'),
      profile('c', '2026-11-15T08:00:00Z'),
    ];
    const { merged, toPush } = mergeProfiles(local, remote, new Set(['a', 'b', 'c']));
    expect(merged.map((p) => p.label)).toEqual(['local A', 'remote B', 'c']);
    expect(toPush.map((p) => p.id)).toEqual(['a']);
  });

  it('uploads new local profiles but drops ones deleted on another device', () => {
    const local = [
      profile('new', '2026-11-15T12:00:00Z'),
      profile('gone', '2026-11-15T12:00:00Z'),
    ];
    const { merged, toPush } = mergeProfiles(local, [], new Set(['gone']));
    expect(merged.map((p) => p.id)).toEqual(['new']);
    expect(toPush.map((p) => p.id)).toEqual(['new']);
  });

  it('unions history, pushes only new local drafts and respects remote deletes', () => {
    const local = [draft('local-new'), draft('both'), draft('deleted-elsewhere')];
    const remote = [draft('both'), draft('remote-only')];
    const { merged, toPush } = mergeHistory(
      local,
      remote,
      new Set(['both', 'deleted-elsewhere']),
    );
    expect(merged.map((h) => h.id).sort()).toEqual(['both', 'local-new', 'remote-only']);
    expect(toPush.map((h) => h.id)).toEqual(['local-new']);
  });
});
