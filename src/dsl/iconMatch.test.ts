import { describe, expect, it } from 'vitest';
import { matchIconId } from './iconMatch';

const CATALOG: Record<string, string[]> = {
  aws: ['compute-lambda', 'resource-compute-lambda-lambda-function', 'database-rds'],
  developer: ['frontend-preact', 'frontend-react-query', 'frontend-reactjs', 'gcp-pubsub'],
};
const match = (id: string) => matchIconId(id, (provider) => CATALOG[provider] ?? [])?.shapeId ?? null;

describe('matchIconId', () => {
  it('prefers exact, then suffix, then the start of the last word, then a whole word, then anywhere', () => {
    expect(match('aws/compute-lambda')).toBe('compute-lambda');
    expect(match('aws/lambda')).toBe('compute-lambda');
    expect(match('developer/react')).toBe('frontend-reactjs');
    expect(match('developer/query')).toBe('frontend-react-query');
    expect(match('aws/rds')).toBe('database-rds');
    expect(match('aws/compute')).toBe('compute-lambda');
  });

  it('accepts every separator and the tech alias the docs use', () => {
    expect(match('aws:lambda')).toBe('compute-lambda');
    expect(match('aws-lambda')).toBe('compute-lambda');
    expect(match('tech/react')).toBe('frontend-reactjs');
    expect(matchIconId('tech/react', (provider) => CATALOG[provider] ?? [])?.packId).toBe('developer-icons-v1');
  });

  it('returns null for an unknown provider, an empty name or no match', () => {
    expect(match('nope/lambda')).toBeNull();
    expect(match('aws/')).toBeNull();
    expect(match('aws/kafka')).toBeNull();
  });
});
