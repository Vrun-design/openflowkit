import { describe, expect, it } from 'vitest';
import { matchIconId, rankIcons } from './iconMatch';

const CATALOG: Record<string, string[]> = {
  aws: ['compute-lambda', 'resource-compute-lambda-lambda-function', 'database-rds',
    'application-integration-simple-queue-service', 'application-integration-simple-notification-service'],
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

describe('matchIconId with the auto-icon names', () => {
  // `aws/sqs` is the id an agent writes; the catalog calls it simple-queue-service.
  it('resolves a known acronym to its service', () => {
    expect(match('aws/sqs')).toBe('application-integration-simple-queue-service');
    expect(match('aws/sns')).toBe('application-integration-simple-notification-service');
    expect(match('aws/lambda')).toBe('compute-lambda');
  });
});

describe('rankIcons', () => {
  const ICONS = [
    { provider: 'aws', id: 'application-integration-simple-queue-service', label: 'Simple Queue Service', category: 'Application Integration' },
    { provider: 'aws', id: 'compute-lambda', label: 'Lambda', category: 'Compute' },
    { provider: 'tabler', id: 'lambda', label: 'Lambda', category: 'Math' },
    { provider: 'developer', id: 'queue-rabbitmq', label: 'RabbitMQ', category: 'Queue' },
  ];
  const ids = (query: string) => rankIcons(ICONS, query, (icon) => icon).map(({ provider, id }) => `${provider}/${id}`);

  it('finds a service by the acronym people type', () => {
    expect(ids('sqs')[0]).toBe('aws/application-integration-simple-queue-service');
  });
  it('keeps a leading provider word to that provider', () => {
    expect(ids('aws lambda')).toEqual(['aws/compute-lambda']);
    expect(ids('lambda')).toEqual(['aws/compute-lambda', 'tabler/lambda']);
  });
  it('matches labels and categories, and nothing for an empty miss', () => {
    expect(ids('simple queue')).toEqual(['aws/application-integration-simple-queue-service']);
    expect(ids('queue')[0]).toBe('developer/queue-rabbitmq');
    expect(ids('kubernetes')).toEqual([]);
  });
});
