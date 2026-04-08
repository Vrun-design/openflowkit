import { describe, expect, it } from 'vitest';
import {
  classifyNode,
  isCommonEnglishIconTerm,
  isSpecificTechnologyIconQuery,
} from './semanticClassifier';

describe('classifyNode', () => {
  it('classifies start nodes', () => {
    expect(classifyNode({ id: 'start', label: 'Start' }).category).toBe('start');
    expect(classifyNode({ id: 'begin', label: 'Begin' }).category).toBe('start');
    expect(classifyNode({ id: 'entry', label: 'Entry Point' }).category).toBe('start');
    expect(classifyNode({ id: 'x', label: 'Order Start' }).category).toBe('start');
  });

  it('classifies end nodes', () => {
    expect(classifyNode({ id: 'end', label: 'End' }).category).toBe('end');
    expect(classifyNode({ id: 'done', label: 'Done' }).category).toBe('end');
    expect(classifyNode({ id: 'finish', label: 'Complete' }).category).toBe('end');
  });

  it('classifies decision nodes by shape', () => {
    const hint = classifyNode({ id: 'check', label: 'Is Valid?', shape: 'diamond' });
    expect(hint.category).toBe('decision');
    expect(hint.color).toBe('amber');
  });

  it('classifies database nodes', () => {
    const pg = classifyNode({ id: 'db', label: 'PostgreSQL' });
    expect(pg.category).toBe('database');
    expect(pg.color).toBe('violet');
    expect(pg.iconQuery).toMatch(/postgres/i);

    const mongo = classifyNode({ id: 'db', label: 'MongoDB' });
    expect(mongo.category).toBe('database');
    expect(mongo.iconQuery).toMatch(/mongo/i);
  });

  it('classifies cylinder shape as database', () => {
    const hint = classifyNode({ id: 'db', label: 'Users DB', shape: 'cylinder' });
    expect(hint.category).toBe('database');
    expect(hint.color).toBe('violet');
  });

  it('classifies cache nodes', () => {
    const hint = classifyNode({ id: 'cache', label: 'Redis Cache' });
    expect(hint.category).toBe('cache');
    expect(hint.iconQuery).toMatch(/redis/i);
  });

  it('classifies queue nodes', () => {
    const hint = classifyNode({ id: 'mq', label: 'RabbitMQ' });
    expect(hint.category).toBe('queue');
    expect(hint.iconQuery).toMatch(/rabbitmq/i);
  });

  it('classifies user nodes', () => {
    const hint = classifyNode({ id: 'user', label: 'User' });
    expect(hint.category).toBe('user');
    expect(hint.color).toBe('blue');
  });

  it('classifies gateway nodes', () => {
    const hint = classifyNode({ id: 'gw', label: 'API Gateway' });
    expect(hint.category).toBe('gateway');
    expect(hint.iconQuery).toBe('');

    const nginx = classifyNode({ id: 'proxy', label: 'Nginx' });
    expect(nginx.category).toBe('gateway');
    expect(nginx.iconQuery).toMatch(/nginx/i);
  });

  it('classifies frontend nodes', () => {
    const hint = classifyNode({ id: 'fe', label: 'React App' });
    expect(hint.category).toBe('frontend');
    expect(hint.iconQuery).toMatch(/react/i);
  });

  it('classifies service nodes', () => {
    const hint = classifyNode({ id: 'api', label: 'Express API' });
    expect(hint.category).toBe('service');
    expect(hint.iconQuery).toMatch(/express/i);

    const node = classifyNode({ id: 'be', label: 'Node.js Backend' });
    expect(node.category).toBe('service');
  });

  it('classifies auth nodes', () => {
    const hint = classifyNode({ id: 'auth', label: 'OAuth Login' });
    expect(hint.category).toBe('auth');
    expect(hint.iconQuery).toBe('');
  });

  it('keeps generic categories color-aware but icon-query sparse', () => {
    expect(classifyNode({ id: 'db', label: 'Database' }).iconQuery).toBe('');
    expect(classifyNode({ id: 'queue', label: 'Queue' }).iconQuery).toBe('');
    expect(classifyNode({ id: 'storage', label: 'Storage' }).iconQuery).toBe('');
    expect(classifyNode({ id: 'frontend', label: 'Frontend' }).iconQuery).toBe('');
    expect(classifyNode({ id: 'service', label: 'Service' }).iconQuery).toBe('');
    expect(classifyNode({ id: 'llm', label: 'LLM Router' }).iconQuery).toBe('');
  });

  it('returns process as default', () => {
    const hint = classifyNode({ id: 'x', label: 'Something Random' });
    expect(hint.category).toBe('process');
    expect(hint.color).toBe('slate');
  });

  it('detects generic icon terms conservatively', () => {
    expect(isCommonEnglishIconTerm('service')).toBe(true);
    expect(isCommonEnglishIconTerm('payment')).toBe(true);
    expect(isCommonEnglishIconTerm('PostgreSQL')).toBe(false);
  });

  it('recognizes specific technology queries for import icon enrichment', () => {
    expect(isSpecificTechnologyIconQuery('postgres')).toBe(true);
    expect(isSpecificTechnologyIconQuery('nginx')).toBe(true);
    expect(isSpecificTechnologyIconQuery('amazon s3')).toBe(true);
    expect(isSpecificTechnologyIconQuery('aws lambda')).toBe(true);
    expect(isSpecificTechnologyIconQuery('service')).toBe(false);
    expect(isSpecificTechnologyIconQuery('check')).toBe(false);
    expect(isSpecificTechnologyIconQuery('oauth')).toBe(false);
    expect(isSpecificTechnologyIconQuery('jwt')).toBe(false);
    expect(isSpecificTechnologyIconQuery('sso')).toBe(false);
    expect(isSpecificTechnologyIconQuery('llm')).toBe(false);
  });
});
