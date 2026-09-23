import { describe, expect, it } from 'vitest';
import { inferIcon } from './autoIcon';
import { compile, type CompileResult } from './compile';
import { serialize } from './serialize';

describe('inferIcon', () => {
  it.each([
    ['Postgres', 'developer/database-postgresql'],
    ['PostgreSQL DB', 'developer/database-postgresql'],
    ['Frontend (React)', 'developer/frontend-reactjs'],
    ['Node.js API', 'developer/backend-nodejs'],
    ['Cloudflare Workers', 'developer/devops-ai-ml-cloudflare'],
    ['AWS Lambda', 'aws/compute-lambda'],
    ['Postgres on AWS', 'developer/database-postgresql'],
    ['Next.js on Vercel', 'developer/frontend-nextjs'],
    ['Deploy to Vercel', 'developer/devops-ai-ml-vercel-dark'],
    ['ASP.NET Core', 'developer/backend-dotnet'],
    ['.NET service', 'developer/backend-dotnet'],
    ['Cache (Redis).', 'developer/database-redis'],
    ['Google Pub/Sub', 'gcp/core-pubsub'],
    ['S3 bucket', 'aws/storage-simple-storage-service'],
  ])('%s → %s', (label, icon) => {
    expect(inferIcon(label)).toBe(icon);
  });

  it('prefers the head noun among concepts', () => {
    expect(inferIcon('Orders DB')).toBe('tabler/database');
    expect(inferIcon('Email Queue')).toBe('tabler/stack-2');
    expect(inferIcon('Load Balancer')).toBe('tabler/arrows-split');
    expect(inferIcon('Payment Service')).toBe('tabler/credit-card');
    expect(inferIcon('Service')).toBe('tabler/server');
  });

  it('leaves process steps and sentences alone', () => {
    expect(inferIcon('Validate user')).toBeNull();
    expect(inferIcon('Send confirmation email')).toBeNull();
    expect(inferIcon('Is the user signed in?')).toBeNull();
    expect(inferIcon('The user opens the settings page')).toBeNull();
    expect(inferIcon('Start')).toBeNull();
    expect(inferIcon('')).toBeNull();
  });

  it('never matches inside a word or on ambiguous words', () => {
    expect(inferIcon('Reactor core')).toBeNull();
    expect(inferIcon('Next step')).toBeNull();
    expect(inferIcon('Express delivery')).toBeNull();
    expect(inferIcon('Go live')).toBeNull();
    expect(inferIcon('Bank clerk')).toBeNull();
  });

  it('checks the tech hint before the label', () => {
    expect(inferIcon('Orders store', 'PostgreSQL 16')).toBe('developer/database-postgresql');
    expect(inferIcon('Redis cache', 'custom')).toBe('developer/database-redis');
  });
});

describe('compile with auto icons', () => {
  const resolveIcon = (id: string) => ({ packId: 'pack', shapeId: id.split('/')[1]! });
  const auto = { resolveIcon, autoIcons: true };
  const node = (result: CompileResult, label: string) => result.nodes.find((item) => item.content.label === label)!;
  const text = (result: CompileResult) => serialize({ frame: result.frame, nodes: result.nodes, groups: result.groups, connectors: result.connectors });

  it('is off unless the host or the text asks', async () => {
    const plain = await compile('flowchart\nPostgres', { resolveIcon });
    expect(node(plain, 'Postgres').content.icon).toBeUndefined();
    const hosted = await compile('flowchart\nPostgres', auto);
    expect(node(hosted, 'Postgres')).toMatchObject({
      kind: 'architecture',
      content: { icon: 'developer/database-postgresql', archIconShapeId: 'database-postgresql' },
      metadata: { dsl: { autoIcon: 'developer/database-postgresql' } },
    });
    const authored = await compile('flowchart\nicons: auto\nPostgres', { resolveIcon });
    expect(node(authored, 'Postgres').content.icon).toBe('developer/database-postgresql');
  });

  it('lets the text turn it off, per diagram and per node', async () => {
    const off = await compile('flowchart\nicons: off\nPostgres', auto);
    expect(node(off, 'Postgres').content.icon).toBeUndefined();
    const optedOut = await compile('flowchart\nPostgres [icon: none]\nRedis', auto);
    expect(node(optedOut, 'Postgres').kind).toBe('process');
    expect(node(optedOut, 'Redis').content.icon).toBe('developer/database-redis');
    expect(optedOut.diagnostics.filter((item) => item.code === 'W132')).toEqual([]);
  });

  it('keeps decisions and terminals as shapes', async () => {
    const result = await compile('flowchart\nPostgres up? [diamond] -> Redis [ellipse]', auto);
    expect(result.nodes.every((item) => item.content.icon === undefined)).toBe(true);
  });

  it('never writes an inferred icon back, and keeps what the author wrote', async () => {
    const result = await compile('flowchart\nicons: auto\nPostgres [cylinder] -> Redis [icon: none] -> Lambda [aws/compute-ec2]', { resolveIcon });
    const dsl = text(result);
    expect(dsl).toContain('icons: auto');
    expect(dsl).toContain('Postgres [cylinder]');
    expect(dsl).toContain('Redis [icon: none]');
    expect(dsl).toContain('aws/compute-ec2');
    expect(dsl).not.toContain('database-postgresql');
    expect(node(await compile(dsl, { resolveIcon }), 'Postgres').content.icon).toBe('developer/database-postgresql');
  });

  it('draws nothing it cannot resolve, and warns about nothing it inferred', async () => {
    const result = await compile('flowchart\nPostgres', { resolveIcon: () => null, autoIcons: true });
    expect(node(result, 'Postgres').content.icon).toBeUndefined();
    expect(result.diagnostics.filter((item) => item.severity === 'warning')).toEqual([]);
  });

  it('reads `icons` without a colon as a node', async () => {
    const result = await compile('flowchart\nicons -> Postgres');
    expect(result.nodes.map((item) => item.content.label)).toContain('icons');
  });

  it('uses tech: on model elements', async () => {
    const result = await compile('architecture\nmodel {\n  shop = system Shop {\n    db = store Orders [tech: PostgreSQL]\n    web = container Storefront [tech: Next.js]\n  }\n}', auto);
    const icons = Object.fromEntries(result.nodes.map((item) => [item.content.label, item.content.icon]));
    expect(icons).toMatchObject({ Orders: 'developer/database-postgresql', Storefront: 'developer/frontend-nextjs' });
  });
});
