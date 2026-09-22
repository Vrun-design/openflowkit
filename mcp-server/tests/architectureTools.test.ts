import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { compileWorkspace } from '../../src/dsl/compile';
import { deterministicLayout } from '../../src/dsl/layout';
import { createServerWithDeps } from '../src/server.js';
import {
  discoveryToDsl, driftReport, modelFromNode, runArchitectureDiscovery,
  type ArchModelData,
} from '../src/lib/architectureDiscovery.js';

// Discovery + drift + explain over a real fixture repo on disk. The emitted DSL
// is compiled by the app's own parser, so the proposal cannot be fiction.

const tempDirs: string[] = [];
afterAll(async () => { await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true }))); });

async function write(root: string, relative: string, content: string): Promise<void> {
  const full = join(root, relative);
  await mkdir(join(full, '..'), { recursive: true });
  await writeFile(full, content, 'utf8');
}

async function fixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'openflowkit-arch-'));
  tempDirs.push(root);
  await write(root, 'docker-compose.yml', [
    'services:',
    '  web:',
    '    build: ./web',
    '    depends_on:',
    '      - api',
    '  api:',
    '    image: fixture/api:1',
    '    depends_on:',
    '      - db',
    '  db:',
    '    image: postgres:16',
    '',
  ].join('\n'));
  await write(root, 'api/package.json', JSON.stringify({
    name: '@fixture/api', main: 'src/server.ts', dependencies: { fastify: '^4' },
  }, null, 2));
  await write(root, 'api/src/server.ts', [
    "import axios from 'axios';",
    "import { pool } from './db';",
    'export async function charge() {',
    "  return axios.post('https://api.stripe.com/v1/charges');",
    '}',
    '',
  ].join('\n'));
  await write(root, 'web/package.json', JSON.stringify({ name: '@fixture/web', dependencies: { react: '^19' } }, null, 2));
  await write(root, 'web/src/App.tsx', "import { x } from '@fixture/api';\nexport const App = () => x;\n");
  await write(root, 'web/Dockerfile', 'FROM node:20-alpine\nEXPOSE 3000\n');
  await write(root, 'deploy/k8s.yaml', [
    'apiVersion: apps/v1',
    'kind: Deployment',
    'metadata:',
    '  name: worker',
    'spec:',
    '  template:',
    '    spec:',
    '      containers:',
    '        - name: worker',
    '          image: fixture/api:1',
    '',
  ].join('\n'));
  await write(root, 'infra/main.tf', 'resource "aws_sqs_queue" "jobs" {\n  name = "jobs"\n}\n');
  await write(root, 'adr/0001-use-postgres.md', '# Use Postgres\n\nBecause it is boring.\n');
  return root;
}

async function client(): Promise<Client> {
  const { server } = createServerWithDeps({ log: () => undefined });
  const instance = new Client({ name: 'test', version: '0.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), instance.connect(clientTransport)]);
  return instance;
}

async function call(target: Client, name: string, args: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
  const result = await target.callTool({ name, arguments: args });
  const [content] = (result.content ?? []) as { type: string; text?: string }[];
  const raw = content?.text ?? 'null';
  if (result.isError) throw new Error(raw);
  return JSON.parse(raw) as Record<string, unknown>;
}

async function modelOfDsl(dsl: string): Promise<ArchModelData> {
  const workspace = await compileWorkspace(dsl, { layout: deterministicLayout });
  for (const view of workspace.views) {
    const model = modelFromNode(view.result.frame);
    if (model) return model;
  }
  throw new Error('compiled workspace carried no model');
}

describe('architecture discovery', () => {
  it('finds deployables, dependencies and relations with evidence', async () => {
    const root = await fixture();
    const discovery = await runArchitectureDiscovery(root);
    const names = discovery.units.map((unit) => unit.name);
    expect(names).toEqual(expect.arrayContaining(['web', 'api', 'db', 'worker', 'PostgreSQL', 'jobs', 'Stripe']));

    const api = discovery.units.find((unit) => unit.name === 'api')!;
    expect(api.kind).toBe('container');
    expect(api.tech).toBe('Fastify');
    expect(api.evidence[0]?.file).toBe('api/package.json');

    const pairs = discovery.relations.map((relation) => `${relation.from}->${relation.to}${relation.label ? `:${relation.label}` : ''}`);
    expect(pairs).toEqual(expect.arrayContaining([
      'web->api:depends on',
      'web->api:imports',
      'api->db:depends on',
      'deploy.worker->api:deploys',
      'api->stripe:calls',
      'db->postgresql:uses',
    ]));
    expect(discovery.evidenceCount).toBeGreaterThan(0);
    expect(discovery.languages['typescript']).toBeGreaterThan(0);
  });

  it('emits a workspace the real parser compiles without diagnostics', async () => {
    const root = await fixture();
    const discovery = await runArchitectureDiscovery(root);
    const dsl = discoveryToDsl(discovery, 'Fixture');
    expect(dsl).toContain('tags: discovered');
    expect(dsl).toContain('view landscape');
    expect(dsl).toContain('// discovered by openflowkit');

    const workspace = await compileWorkspace(dsl, { layout: deterministicLayout });
    expect(workspace.family).toBe('architecture');
    expect(workspace.views.flatMap((view) => view.result.diagnostics)).toEqual([]);
    expect(workspace.views.length).toBeGreaterThan(1);
    const model = await modelOfDsl(dsl);
    expect(model.elements.map((element) => element.name)).toEqual(expect.arrayContaining(['Fixture', 'web', 'api', 'worker']));
    expect(model.elements.every((element) => element.tags.includes('discovered'))).toBe(true);
    expect(model.views.some((view) => view.kind === 'landscape')).toBe(true);
    expect(model.views.some((view) => view.kind === 'container')).toBe(true);
  });

  it('reports missing, undrawn and changed against a model', async () => {
    const root = await fixture();
    const discovery = await runArchitectureDiscovery(root);
    const model = await modelOfDsl(discoveryToDsl(discovery, 'Fixture'));
    const clean = driftReport(model, discovery);
    expect(clean).toMatchObject({ missing: [], undrawn: [], changed: [] });

    await write(root, 'docker-compose.yml', 'services:\n  cache:\n    image: redis:7\n');
    const shrunk = await runArchitectureDiscovery(root);
    const drifted = driftReport(model, shrunk);
    expect(drifted.missing.map((finding) => finding.name)).toEqual(expect.arrayContaining(['cache', 'Redis']));
    expect(drifted.missing[0]?.evidence.length).toBeGreaterThan(0);
    expect(drifted.undrawn.map((finding) => finding.name)).toEqual(expect.arrayContaining(['db', 'PostgreSQL']));
    expect(drifted.undrawn.find((finding) => finding.name === 'db')?.evidence[0]?.text).toBe('db');

    const retagged: ArchModelData = {
      elements: [
        { id: 'api', kind: 'container', name: 'api', parent: null, tags: [], links: [], tech: 'Go' },
      ],
      relations: [],
      views: [],
      flows: [],
    };
    const changed = driftReport(retagged, shrunk);
    expect(changed.changed).toEqual([{ id: 'api', field: 'tech', model: 'Go', repo: 'Fastify' }]);
  });

  it('exposes discover, drift and explain as MCP tools', async () => {
    const root = await fixture();
    const target = await client();

    const discovered = await call(target, 'discover_architecture', { path: root, name: 'Fixture' });
    expect(discovered.units as number).toBeGreaterThan(3);
    expect(discovered.relations as number).toBeGreaterThan(2);
    expect(discovered.diagnostics).toEqual([]);
    const dsl = String(discovered.dsl);

    const drift = await call(target, 'drift_report', { path: root, dsl });
    expect(drift).toMatchObject({ drift: false, checked: expect.any(Number) });
    expect(drift.missing).toEqual([]);

    const created = await call(target, 'openflow_create', { name: 'Arch' });
    const diagram = await call(target, 'create_diagram', { documentId: created.id, dsl });
    expect(diagram.output).toMatchObject({ family: 'architecture' });
    const fromDocument = await call(target, 'drift_report', { path: root, documentId: created.id });
    expect(fromDocument.drift).toBe(false);

    const linkDsl = [
      '%% ofk 1', 'architecture', 'title: Fixture', '',
      'model {',
      '  system Fixture {',
      '    container API [link: "adr/0001-use-postgres.md"]',
      '  }',
      '}',
      'views {',
      '  view landscape',
      '}',
      '',
    ].join('\n');
    const explained = await call(target, 'explain_element', { elementId: 'API', path: root, dsl: linkDsl });
    expect(explained.element).toMatchObject({ name: 'API' });
    expect((explained.adrs as unknown[]).length).toBe(1);
    expect(String((explained.adrs as { markdown: string }[])[0]?.markdown)).toContain('Use Postgres');
    expect((explained.evidence as unknown[]).length).toBeGreaterThan(0);
  });
});
