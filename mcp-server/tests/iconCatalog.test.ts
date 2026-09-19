import { describe, expect, it } from 'vitest';
import {
  findIcons,
  getAllIcons,
  getIconProviders,
  getIconsByProvider,
} from '../src/lib/iconCatalog.js';

describe('iconCatalog', () => {
  it('loads a non-empty manifest', async () => {
    const all = await getAllIcons();
    expect(all.length).toBeGreaterThan(100);
    const sample = all[0];
    expect(sample.provider).toEqual(expect.any(String));
    expect(sample.slug).toEqual(expect.any(String));
    expect(sample.label).toEqual(expect.any(String));
    expect(sample.category).toEqual(expect.any(String));
  });

  it('exposes the expected providers', async () => {
    const providers = await getIconProviders();
    expect(providers).toEqual(expect.arrayContaining(['aws', 'azure', 'cncf', 'developer']));
  });

  it('filters by provider', async () => {
    const aws = await getIconsByProvider('aws');
    expect(aws.length).toBeGreaterThan(0);
    expect(aws.every((i) => i.provider === 'aws')).toBe(true);
  });

  it('ranks exact slug matches above substring matches', async () => {
    const results = await findIcons('databases-rds', { provider: 'aws', limit: 5 });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].slug).toBe('databases-rds');
  });

  it('finds icons by human term', async () => {
    const results = await findIcons('postgres', { limit: 10 });
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.slug.includes('postgres') || r.label.toLowerCase().includes('postgres'))).toBe(true);
  });

  it('returns empty array on no match', async () => {
    const results = await findIcons('zzzzzzz_no_such_icon', { limit: 5 });
    expect(results).toEqual([]);
  });
});
