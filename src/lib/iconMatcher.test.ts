import { describe, expect, it } from 'vitest';
import { matchIcon, getMatchableIconCount, listIconProviders, buildCatalogSummary } from './iconMatcher';

describe('iconMatcher', () => {
  it('finds icons from the catalog', () => {
    const count = getMatchableIconCount();
    expect(count).toBeGreaterThan(100);
  });

  it('lists available providers', () => {
    const providers = listIconProviders();
    expect(providers).toContain('developer');
    expect(providers).toContain('aws');
  });

  it('exact match: postgresql finds the PostgreSQL icon', () => {
    const results = matchIcon('postgresql');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].shapeId).toContain('postgresql');
    expect(results[0].matchType).toBe('exact');
    expect(results[0].score).toBeGreaterThan(0.9);
  });

  it('alias match: "postgres" resolves to postgresql', () => {
    const results = matchIcon('postgres');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].shapeId).toContain('postgresql');
    expect(results[0].matchType).toBe('alias');
  });

  it('alias match: "k8s" resolves to kubernetes', () => {
    const results = matchIcon('k8s');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].shapeId).toContain('kubernetes');
    expect(results[0].matchType).toBe('alias');
  });

  it('substring match: "redis" finds redis icons', () => {
    const results = matchIcon('redis');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].shapeId).toContain('redis');
  });

  it('surfaces richer ranking metadata for trusted matches', () => {
    const results = matchIcon('react');
    expect(results[0]?.confidence).toBeTruthy();
    expect(typeof results[0]?.reason).toBe('string');
    expect(typeof results[0]?.runnerUpDelta).toBe('number');
    expect(typeof results[0]?.wholeTokenMatch).toBe('boolean');
  });

  it('prefers canonical icons over wordmark or light-dark variants', () => {
    const results = matchIcon('nextjs');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.isVariant).toBe(false);
  });

  it('marks generic matches as generic', () => {
    const results = matchIcon('service');
    if (results.length > 0) {
      expect(results[0]?.isGeneric).toBe(true);
    }
  });

  it('provider filter: "lambda" with provider "aws" finds AWS Lambda', () => {
    const results = matchIcon('lambda', 'aws');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].provider).toBe('aws');
    expect(results[0].shapeId).toContain('lambda');
  });

  it('provider filter: "lambda" without filter finds any provider', () => {
    const results = matchIcon('lambda');
    expect(results.length).toBeGreaterThan(0);
  });

  it('returns empty for unknown queries', () => {
    const results = matchIcon('zzzznotreal99999');
    expect(results).toEqual([]);
  });

  it('returns empty for empty query', () => {
    expect(matchIcon('')).toEqual([]);
    expect(matchIcon('   ')).toEqual([]);
  });

  it('matchType classification works', () => {
    const exact = matchIcon('docker');
    if (exact.length > 0) {
      expect(['exact', 'alias', 'substring']).toContain(exact[0].matchType);
    }
  });

  it('lists all expected providers', () => {
    const providers = listIconProviders();
    expect(providers).toEqual(expect.arrayContaining(['aws', 'azure', 'cncf', 'developer', 'gcp']));
    expect(providers).toHaveLength(5);
  });

  it('buildCatalogSummary returns non-empty summary with provider names', () => {
    const summary = buildCatalogSummary(5);
    expect(summary.length).toBeGreaterThan(0);
    expect(summary).toContain('aws');
    expect(summary).toContain('developer');
  });

  it('buildCatalogSummary respects maxPerProvider limit', () => {
    const small = buildCatalogSummary(2);
    const large = buildCatalogSummary(50);
    expect(small.length).toBeLessThan(large.length);
  });
});
