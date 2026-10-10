import { describe, expect, it } from 'vitest';
import { compileWorkspace } from '../compile';
import { deterministicLayout } from '../layout';
import { acceptsArchitectureFile, capUnits, definesUnit, discoverArchitecture, discoveryToDsl } from './discovery';

// Linear scans take ~60 ms here and ~250 ms on a CI runner; catastrophic backtracking
// on ~1 MB takes seconds, so this cap catches it without timing the runner.
const HOSTILE_INPUT_MS = 1000;

// The browser entry point: files already read (the repo page fetches them from
// GitHub). mcp-server/tests/discoveryFixtures.test.ts runs the fixtures through the Node walk.
const FILES = [
  { path: 'docker-compose.yml', content: 'services:\n  web:\n    build: ./web\n    environment:\n      API_URL: http://api:8080\n  api:\n    image: acme/api:1\n  db:\n    image: postgres:16\n' },
  { path: 'web/package.json', content: '{"name":"web","dependencies":{"react":"^19"}}' },
  { path: 'api/package.json', content: '{"name":"api","dependencies":{"pg":"^8"}}' },
  { path: 'api/src/server.test.ts', content: "import Stripe from 'stripe';\n" },
];

describe('discoverArchitecture', () => {
  it('finds units and calls from in-memory files, without a filesystem', () => {
    const result = discoverArchitecture(FILES, 'shop');
    expect(result.units.map((unit) => unit.name).sort()).toEqual(['api', 'db', 'web']);
    const call = result.relations.find((relation) => relation.label === 'calls')!;
    expect(call.evidence[0]).toMatchObject({ file: 'docker-compose.yml', line: 5 });
  });

  it('writes each arrow\'s evidence into the DSL, linked when asked, and the DSL compiles', async () => {
    const result = discoverArchitecture(FILES, 'shop');
    expect(discoveryToDsl(result, 'shop')).toMatch(/ -> \S+ : calls \[link: docker-compose\.yml:5\]/);
    const linked = discoveryToDsl(result, 'shop', ({ file, line }) => `https://github.com/acme/shop/blob/HEAD/${file}#L${line}`);
    expect(linked).toContain('https://github.com/acme/shop/blob/HEAD/docker-compose.yml#L5');
    const workspace = await compileWorkspace(linked, { layout: deterministicLayout });
    expect(workspace.views.flatMap((view) => view.result.diagnostics).filter(({ severity }) => severity !== 'info')).toEqual([]);
  });
});

describe('discoveryToDsl view order', () => {
  const viewLines = (dsl: string) => dsl.split('\n').map((line) => line.trim()).filter((line) => /^view (landscape|container)\b/.test(line));

  it('a single-product repo opens on its services and has no lone-box system map', () => {
    const files = ['frontend', 'cartservice', 'checkoutservice'].map((svc) => ({ path: `src/${svc}/Dockerfile`, content: 'FROM alpine\n' }));
    const dsl = discoveryToDsl(discoverArchitecture(files, 'microservices-demo'), 'microservices-demo');
    expect(viewLines(dsl)).toEqual(['view container of microservices-demo']);
  });

  const dockerfiles = (...dirs: string[]) => dirs.map((dir) => ({ path: `${dir}/Dockerfile`, content: 'FROM node\n' }));

  it('web/ + api/ + worker/, one service each, is one system that lands on its services', () => {
    const views = viewLines(discoveryToDsl(discoverArchitecture(dockerfiles('web', 'api', 'worker'), 'shop'), 'shop'));
    expect(views).toEqual(['view container of shop']);
  });

  it('two folders that each hold 2+ services are two systems, Landscape first', () => {
    const files = dockerfiles('billing/api', 'billing/worker', 'storefront/web', 'storefront/api');
    const views = viewLines(discoveryToDsl(discoverArchitecture(files, 'mono'), 'mono'));
    expect(views[0]).toBe('view landscape');
    expect(views).toHaveLength(3);
  });

  it('one product folder plus a single-unit folder stays one repo system', () => {
    const files = dockerfiles('billing/api', 'billing/worker', 'docs');
    expect(viewLines(discoveryToDsl(discoverArchitecture(files, 'mono'), 'mono'))).toEqual(['view container of mono']);
  });
});

describe('capUnits', () => {
  it('keeps services before dependencies, drops their relations, and counts what it left out', () => {
    const result = discoverArchitecture(FILES, 'shop');
    const capped = capUnits(result, 2);
    expect(capped.dropped).toBe(1);
    expect(capped.result.units.map((unit) => unit.kind)).toEqual(['container', 'container']);
    expect(capped.result.relations.every((relation) => capped.result.units.some((unit) => unit.id === relation.to))).toBe(true);
    expect(capUnits(result, 10)).toEqual({ result, dropped: 0 });
  });
});

describe('acceptsArchitectureFile skip directories', () => {
  it('ignores vendored, build and dot directories at any depth', () => {
    const api = { path: 'api/package.json', content: '{"name":"api","dependencies":{"pg":"^8"}}' };
    const noise = [
      { path: 'node_modules/foo/package.json', content: '{"name":"foo","dependencies":{"redis":"1"}}' },
      { path: 'dist/Dockerfile', content: 'FROM node:20\n' },
      { path: '.github/workflows/ci.yml', content: 'name: ci\n' },
      // A failed Playwright run leaves an HTML report full of third-party URLs.
      { path: 'playwright-report/index.js', content: 'fetch("https://trace.playwright.dev/x")\n' },
      { path: 'test-results/a/trace.js', content: 'fetch("https://www.dropbox.com/s")\n' },
    ];
    expect(discoverArchitecture([api, ...noise], 'shop').units).toEqual(discoverArchitecture([api], 'shop').units);
  });

  it('only directory segments count: a root dotfile keeps its verdict', () => {
    expect(acceptsArchitectureFile('.env')).toBe(false);
    expect(acceptsArchitectureFile('.eslintrc.json')).toBe(true);
    expect(acceptsArchitectureFile('packages/app/node_modules/x/index.js')).toBe(false);
    expect(acceptsArchitectureFile('.vscode/settings.json')).toBe(false);
    expect(acceptsArchitectureFile('api/index.ts')).toBe(true);
  });
});

describe('Cloudflare Workers', () => {
  const toml = 'name = "openflowkit-share"\nmain = "index.ts"\n\n[[r2_buckets]]\nbinding = "SHARES"\nbucket_name = "openflowkit-shares"\n';
  const worker = [
    { path: 'worker/wrangler.toml', content: toml },
    { path: 'worker/index.ts', content: 'export default { fetch() {} };\n' },
  ];

  it('a wrangler config makes its folder a Worker, and its R2 binding a store it uses', () => {
    const result = discoverArchitecture(worker, 'repo');
    const unit = result.units.find((entry) => entry.dir === 'worker')!;
    expect(unit).toMatchObject({ kind: 'container', name: 'openflowkit-share', tech: 'Cloudflare Workers' });
    expect(unit.evidence[0]).toMatchObject({ file: 'worker/wrangler.toml', line: 1 });
    const bucket = result.units.find((entry) => entry.name === 'openflowkit-shares')!;
    expect(bucket).toMatchObject({ kind: 'store', tech: 'R2' });
    const use = result.relations.find((relation) => relation.to === bucket.id)!;
    expect(use).toMatchObject({ from: unit.id, label: 'uses' });
    expect(use.evidence[0]).toMatchObject({ file: 'worker/wrangler.toml', line: 6 });
  });

  it('enriches the folder\'s package.json unit instead of adding a second one', () => {
    const files = [...worker, { path: 'worker/package.json', content: '{"name":"share","dependencies":{"hono":"^4"}}' }];
    const units = discoverArchitecture(files, 'repo').units.filter((entry) => entry.dir === 'worker');
    expect(units).toHaveLength(1);
    expect(units[0]!.tech).toBe('Cloudflare Workers');
  });

  it('an assets-only wrangler config (no main) is static hosting: no Worker unit, tech untouched', () => {
    const files = [
      { path: 'wrangler.toml', content: 'name = "site"\n\n[assets]\ndirectory = "./dist"\n' },
      { path: 'package.json', content: '{"name":"site","dependencies":{"react":"^19"}}' },
    ];
    expect(discoverArchitecture(files, 'repo').units.map((unit) => unit.tech)).toEqual(['React']);
  });

  it('names the files that can define a unit on their own, so a capped reader takes them first', () => {
    for (const path of ['Dockerfile', 'api/Dockerfile.prod', 'web.dockerfile', 'compose.yaml', 'docker-compose.yml', 'k8s/web.yaml', 'infra/main.tf',
      'worker/wrangler.toml', 'worker/wrangler.jsonc', 'package.json', 'svc/go.mod', 'py/pyproject.toml', 'py/requirements.txt', 'java/pom.xml']) {
      expect(definesUnit(path), path).toBe(true);
    }
    for (const path of ['src/index.ts', 'README.md', 'tsconfig.json', 'Cargo.toml', 'netlify.toml']) expect(definesUnit(path), path).toBe(false);
  });

  it('accepts every wrangler config spelling', () => {
    for (const name of ['wrangler.toml', 'wrangler.json', 'wrangler.jsonc']) expect(acceptsArchitectureFile(`worker/${name}`)).toBe(true);
  });

  it('reads a wrangler.jsonc the same way', () => {
    const jsonc = '{\n  // share links\n  "name": "share",\n  "main": "src/index.ts",\n  "r2_buckets": [\n    { "binding": "SHARES", "bucket_name": "shares" }\n  ]\n}\n';
    const result = discoverArchitecture([{ path: 'w/wrangler.jsonc', content: jsonc }], 'repo');
    expect(result.units.map((entry) => [entry.name, entry.kind])).toEqual([['share', 'container'], ['shares', 'store']]);
  });
});

describe('compose depends_on flow lists', () => {
  const edges = (dependsOn: string) => {
    const content = `services:\n  web:\n    image: web:1\n    depends_on: ${dependsOn}\n  api:\n    image: api:1\n  db:\n    image: postgres:16\n`;
    const found = discoverArchitecture([{ path: 'docker-compose.yml', content }], 'shop');
    return found.relations.map((r) => `${r.from}>${r.to}`).sort();
  };

  it('reads [a, b] in every spacing and quote style, with a trailing comment', () => {
    for (const list of ['[api, db]', '[api,db]', '[ api , db ]', '["api", \'db\']', '[api, db]   # needs both']) expect(edges(list), list).toEqual(['web>api', 'web>db']);
  });

  it('reads the single and empty forms and ignores junk', () => {
    expect(edges('[api]')).toEqual(['web>api']);
    expect(edges('[]')).toEqual([]);
    expect(edges('[ {a: b} ]')).toEqual([]);
    expect(edges('api')).toEqual([]);
  });

  it('stays linear on hostile lines (1 MB)', () => {
    for (const hostile of [`${'['.repeat(1e6)}`, `[a${' '.repeat(1e6)}b]`, `[${'a,'.repeat(5e5)}]`, `[${']'.repeat(5e5)} x`]) {
      const started = performance.now();
      edges(hostile);
      expect(performance.now() - started).toBeLessThan(HOSTILE_INPUT_MS);
    }
  });
});

// Shapes that read wrong on public repos (eval 2026-10-10): each fixture is the real repo's layout, cut down.
describe('real repo shapes', () => {
  const byName = (files: { path: string; content: string }[], root = 'repo') => {
    const found = discoverArchitecture(files, root);
    return { found, unit: (name: string) => found.units.find((unit) => unit.name === name) };
  };

  // dockersamples/example-voting-app: compose builds folders, kubectl-style k8s puts `- image:` first.
  const voting = [
    { path: 'docker-compose.yml', content: [
      'services:', '  vote:', '    build:', '      context: ./vote', '      target: dev', '    depends_on:', '      redis:', '        condition: service_healthy',
      '  worker:', '    build:', '      context: ./worker', '  seed:', '    build: ./seed-data', '    depends_on:', '      vote:', '        condition: service_healthy',
      '  redis:', '    image: redis:alpine', '  db:', '    image: postgres:15-alpine', ''].join('\n') },
    { path: 'k8s-specifications/db-deployment.yaml', content: 'apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: db\nspec:\n  template:\n    spec:\n      containers:\n      - image: postgres:15-alpine\n        name: postgres\n' },
    { path: 'k8s-specifications/vote-deployment.yaml', content: 'apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: vote\nspec:\n  template:\n    spec:\n      containers:\n      - image: dockersamples/examplevotingapp_vote\n        name: vote\n' },
    { path: 'seed-data/Dockerfile', content: 'FROM python:3.9-slim\n' },
    { path: 'vote/Dockerfile', content: 'FROM python:3.11-slim AS base\n' },
    { path: 'worker/Dockerfile', content: 'FROM --platform=${BUILDPLATFORM} mcr.microsoft.com/dotnet/sdk:7.0 as build\nFROM mcr.microsoft.com/dotnet/runtime:7.0\n' },
  ];

  it('a compose service is the unit of the folder it builds, and a kubectl-style workload of a store image is that store', () => {
    const { found, unit } = byName(voting);
    expect(found.units.map((u) => `${u.name}:${u.kind}`).sort()).toEqual(['db:store', 'redis:store', 'seed:container', 'vote:container', 'worker:container']);
    expect([unit('seed')!.dir, unit('vote')!.dir]).toEqual(['seed-data', 'vote']);
    expect(found.relations.map((r) => `${r.from}>${r.to}`)).toContain(`${unit('seed')!.id}>${unit('vote')!.id}`);
  });

  it('names a base image by its language, not its last path segment', () => {
    const { unit } = byName(voting);
    expect([unit('worker')!.tech, unit('vote')!.tech]).toEqual(['.NET', 'Python']);
    const tech = (from: string) => discoverArchitecture([{ path: 'svc/Dockerfile', content: `FROM ${from}\n` }], 'r').units[0]!.tech;
    expect(['eclipse-temurin:21', 'golang:1.23 AS builder', 'node:20-alpine', 'alpine:3.20', 'gradle:8-jdk21 AS build'].map(tech)).toEqual(['Java', 'Go', 'Node', undefined, 'Java']);
  });

  it('reads a per-environment compose file, a build context with a dockerfile path, and an image default', () => {
    const { unit } = byName([
      { path: 'compose.yml', content: 'services:\n  backend:\n    image: backend:latest\n    build:\n      context: .\n      dockerfile: backend/Dockerfile\n  db:\n    image: "${POSTGRES_IMAGE:-postgres:17}"\n' },
      { path: 'ops/docker-compose.prod.yml', content: 'services:\n  mailpit:\n    image: axllent/mailpit\n  ad:\n    image: ${IMAGE_NAME}:${DEMO_VERSION}-ad\n' },
      { path: 'backend/Dockerfile', content: 'FROM python:3.10\n' },
    ]);
    expect(unit('backend')).toMatchObject({ dir: 'backend', tech: 'Python' });
    expect(unit('db')).toMatchObject({ kind: 'store', tech: 'PostgreSQL' });
    expect(unit('mailpit')).toMatchObject({ kind: 'container' });
    expect(unit('ad')!.tech).toBeUndefined();
  });

  it('a URL in a comment is not a call, and a Python import never matches a JavaScript package', () => {
    const { found } = byName([
      { path: 'backend/pyproject.toml', content: '[project]\nname = "app"\n' },
      { path: 'backend/app/utils.py', content: 'import emails\n' },
      { path: 'frontend/package.json', content: '{"name":"frontend"}' },
      { path: 'frontend/src/client.gen.ts', content: ' * @see https://developer.mozilla.org/docs/Web/API/fetch\n// fetch("https://api.example.org/x")\n' },
      { path: 'packages/email/package.json', content: '{"name":"emails"}' },
    ]);
    expect(found.relations).toEqual([]);
    expect(found.units.map((u) => u.kind)).toEqual(['container', 'container', 'container']);
  });

  // saleor/saleor: one Django app at the root, its code in a package folder, its stores in pyproject only.
  it('reads pyproject dependencies, and a lone root app owns the code in its folders', () => {
    const { found, unit } = byName([
      { path: 'Dockerfile', content: 'FROM python:3.12 AS build-python\n' },
      { path: 'pyproject.toml', content: '[project]\nname = "saleor"\ndependencies = [\n  "Django[bcrypt]~=5.2",\n  "celery[redis, sqs]>=5.5",\n  "psycopg[binary]>=3.2",\n  "redis>=5", "stripe>=12"\n]\n\n[tool.poetry.group.dev.dependencies]\nmypy = "^1"\n' },
      { path: 'saleor/core/storages.py', content: 'import boto3\n' },
    ], 'saleor');
    const app = unit('saleor')!;
    expect(app.tech).toBe('Django');
    expect(found.relations.filter((r) => r.from === app.id).map((r) => found.units.find((u) => u.id === r.to)!.name).sort()).toEqual(['AWS', 'PostgreSQL', 'Redis', 'Stripe']);
  });

  // go-gitea/gitea: a Go server whose root also holds a frontend package.json and a linting pyproject.
  it('a manifest in another language does not rename or re-label the folder\'s app', () => {
    const { found } = byName([
      { path: 'Dockerfile', content: 'FROM docker.io/library/golang:1.25-alpine3.22 AS build-env\n' },
      { path: 'go.mod', content: 'module code.gitea.io/gitea\n\nrequire (\n\tgithub.com/lib/pq v1.10.9\n)\n' },
      { path: 'package.json', content: '{"type":"module","dependencies":{"vue":"3"}}' },
      { path: 'pyproject.toml', content: '[project]\nname = "gitea-linters"\n' },
    ], 'gitea');
    expect(found.units.map((u) => `${u.name}:${u.tech}`)).toEqual(['gitea:Go', 'PostgreSQL:undefined']);
  });
});

// calcom/cal.com and supabase/supabase: a hundred workspace packages and sample apps crowded out the services.
describe('capUnits on a big monorepo', () => {
  const pkg = (dir: string, json: Record<string, unknown>) => ({ path: `${dir}/package.json`, content: JSON.stringify(json) });
  const files = [
    { path: 'docker-compose.yml', content: 'services:\n  database:\n    image: postgres:16\n  redis:\n    image: redis:7\n' },
    pkg('.', { name: 'calcom-monorepo', workspaces: ['apps/*', 'packages/*'], scripts: { start: 'turbo run start' } }),
    pkg('apps/web', { name: '@calcom/web', scripts: { start: 'next start' }, dependencies: { next: '15', '@calcom/lib': '*', '@calcom/ui': '*' } }),
    pkg('apps/api', { name: '@calcom/api', dependencies: { '@nestjs/core': '10', '@calcom/lib': '*' } }),
    ...['alby', 'zoom', 'giphy', 'hubspot'].map((app) => pkg(`packages/app-store/${app}`, { name: `@calcom/${app}`, main: 'index.ts', dependencies: { '@calcom/lib': '*' } })),
    pkg('packages/lib', { name: '@calcom/lib', main: 'index.ts' }),
    pkg('packages/ui', { name: '@calcom/ui', main: 'index.ts', devDependencies: { next: '15' }, dependencies: { '@calcom/lib': '*' } }),
    pkg('examples/nextjs', { name: 'nextjs-example', scripts: { dev: 'next dev' }, dependencies: { next: '15' } }),
  ];

  it('marks packages nothing starts as libraries and sample apps as examples', () => {
    const { units } = discoverArchitecture(files, 'cal.com');
    const flags = (name: string) => { const u = units.find((unit) => unit.name === name)!; return [u.library ?? false, u.example ?? false]; };
    expect(['web', 'api', 'lib', 'alby', 'calcom-monorepo', 'nextjs-example'].map(flags)).toEqual([[false, false], [false, false], [true, false], [true, false], [true, false], [false, true]]);
  });

  it('keeps services and their stores, then the best-connected libraries, then samples', () => {
    const { result, dropped } = capUnits(discoverArchitecture(files, 'cal.com'), 6);
    expect(result.units.map((unit) => unit.name).sort()).toEqual(['api', 'database', 'lib', 'redis', 'ui', 'web']);
    expect(dropped).toBe(6);
  });
});

// microservices-demo's loadgenerator: a pip-compiled list pins flask (via locust) and redis (via a plugin).
describe('pinned dependency lists', () => {
  it('reads only direct requirements and direct go modules', () => {
    const { units, relations } = discoverArchitecture([
      { path: 'load/requirements.txt', content: 'flask==3.0.3\n    # via\n    #   flask-cors\n    #   locust\nlocust==2.31.0\n    # via -r requirements.in\nredis==5.0  # via locust-plugins\npika==1.3  # via -r requirements.in\n' },
      { path: 'api/go.mod', content: 'module example.com/api\n\nrequire (\n\tgithub.com/redis/go-redis/v9 v9.5.0 // indirect\n\tgoogle.golang.org/grpc v1.64.0 // indirect\n\tgithub.com/lib/pq v1.10.9\n)\n' },
    ], 'demo');
    expect(units.map((unit) => `${unit.name}:${unit.tech ?? ''}`)).toEqual(['api:Go', 'load:Python', 'PostgreSQL:', 'RabbitMQ:']);
    expect(relations).toHaveLength(2);
  });
});

describe('second-pass shapes (eval 2026-10-10)', () => {
  it('a Dockerfile is labelled by the last stage that names a language, an image tag never beats it', () => {
    const { units } = discoverArchitecture([
      // fastapi's backend builds the emails with bun, then runs on python.
      { path: 'backend/Dockerfile', content: 'FROM oven/bun:1 AS frontend-build\nRUN bun build\nFROM python:3.14\n' },
      { path: 'backend/pyproject.toml', content: '[project]\nname = "app"\ndependencies = ["fastapi[standard]<1.0.0"]\n' },
      // voting-app: a compose file of published tags beside the one that builds.
      { path: 'compose.yml', content: 'services:\n  vote:\n    build: ./vote\n' },
      { path: 'vote/Dockerfile', content: 'FROM python:3.11-slim\n' },
      { path: 'web/Dockerfile', content: 'FROM node:20 AS build\nFROM nginx:1.27-alpine\n' },
      // opentelemetry-demo's currency: a later stage built FROM an earlier one names no image.
      { path: 'currency/Dockerfile', content: 'FROM alpine:3.21 AS base\nFROM base AS builder\nFROM base\n' },
    ], 'repo');
    expect(units.map((unit) => `${unit.name}:${unit.tech}`)).toEqual(['app:FastAPI', 'vote:Python', 'currency:undefined', 'web:Node']);
  });

  it('reads a compose variant only where no plain compose file sits beside it', () => {
    const names = (files: { path: string; content: string }[]) => discoverArchitecture(files, 'repo').units.map((unit) => unit.name).sort();
    const variant = { path: 'compose.override.yml', content: 'services:\n  mailpit:\n    image: axllent/mailpit\n' };
    expect(names([{ path: 'compose.yml', content: 'services:\n  api:\n    image: acme/api\n' }, variant])).toEqual(['api']);
    expect(names([{ path: 'deploy/docker-compose.prod.yml', content: 'services:\n  api:\n    image: acme/api\n' }, variant])).toEqual(['api', 'mailpit']);
  });

  it('a workspace root that runs a dev server is the app; one that only fans out to its packages is not', () => {
    const root = (scripts: Record<string, string>) => discoverArchitecture([
      { path: 'package.json', content: JSON.stringify({ name: 'site', workspaces: ['packages/*'], scripts }) },
    ], 'repo').units[0]!.library;
    expect([root({ dev: 'vite' }), root({ dev: 'turbo run dev', start: 'turbo run start' })]).toEqual([undefined, true]);
  });

  it('leaves a library nothing uses out of the diagram', () => {
    const dsl = discoveryToDsl(discoverArchitecture([
      { path: 'package.json', content: '{"name":"template","workspaces":["frontend","packages/*"]}' },
      { path: 'frontend/package.json', content: '{"name":"frontend","scripts":{"dev":"vite"},"dependencies":{"react":"19","@acme/ui":"*"}}' },
      { path: 'packages/ui/package.json', content: '{"name":"@acme/ui","main":"index.ts"}' },
    ], 'repo'), 'repo');
    expect(dsl).toMatch(/container frontend/);
    expect(dsl).toMatch(/container ui/);
    expect(dsl).not.toMatch(/template/);
  });
});

// example-voting-app: compose's depends_on and the code's pg client named the same pair twice: two arrows on one line.
describe('discoveryToDsl one arrow per pair', () => {
  it('draws one arrow between two units, labelled by what the code does', () => {
    const dsl = discoveryToDsl(discoverArchitecture([
      { path: 'docker-compose.yml', content: 'services:\n  result:\n    build: ./result\n    depends_on:\n      - db\n  db:\n    image: postgres:15\n' },
      { path: 'result/package.json', content: '{"name":"result","dependencies":{"express":"4","pg":"8"}}' },
    ], 'repo'), 'repo');
    expect(dsl.split('\n').filter((line) => line.includes(' -> ')).map((line) => line.trim().replace(/ \[link:.*$/, ''))).toEqual(['result -> db : uses']);
    expect(dsl).toContain('result/package.json:1');
  });
});

// supabase/supabase: docker/dev/docker-compose.dev.yml only patches the stack in docker/ (a `db:` with volumes), and
// builds studio from a path that is not in the repo.
describe('compose fragments', () => {
  it('a service with no image or build patches one defined elsewhere; a build of a missing Dockerfile is not a folder', () => {
    const { units } = discoverArchitecture([
      { path: 'apps/studio/package.json', content: '{"name":"studio","scripts":{"dev":"next dev"},"dependencies":{"next":"15"}}' },
      { path: 'apps/studio/Dockerfile', content: 'FROM node:22\n' },
      { path: 'docker/dev/docker-compose.dev.yml', content: 'services:\n  studio:\n    build:\n      context: ..\n      dockerfile: apps/studio/Dockerfile\n  db:\n    restart: "no"\n' },
      { path: 'docker/docker-compose.yml', content: 'services:\n  studio:\n    image: supabase/studio:2025\n  db:\n    image: supabase/postgres:15.8\n' },
    ], 'supabase');
    expect(units.map((unit) => `${unit.name}:${unit.kind}:${unit.dir}`)).toEqual(['studio:container:apps/studio', 'db:store:docker']);
  });

  it('keeps a service whose image comes from an `extends:` or a `<<:` merge', () => {
    const content = 'x-app: &app\n  image: acme/app\nservices:\n  web:\n    <<: *app\n  worker:\n    extends:\n      service: web\n';
    expect(discoverArchitecture([{ path: 'compose.yml', content }], 'repo').units.map((unit) => unit.name)).toEqual(['web', 'worker']);
  });
});

describe('new manifest readers on hostile input', () => {
  it('stays linear on 1 MB dev scripts, pyproject arrays, pinned lists and quoted URLs', () => {
    const big = 'a '.repeat(5e5);
    for (const file of [
      { path: 'package.json', content: JSON.stringify({ name: 'x', scripts: { dev: `${big}vite` } }) },
      { path: 'pyproject.toml', content: `[project]\ndependencies = [${'"a[b,c]",'.repeat(1e5)}\n` },
      { path: 'requirements.txt', content: `flask==1\n${'    #   via x\n'.repeat(1e5)}` },
      { path: 'api/main.py', content: `requests.get(${'"https://'.repeat(1e5)})\n` },
    ]) {
      const started = performance.now();
      discoverArchitecture([file], 'repo');
      expect(performance.now() - started, file.path).toBeLessThan(HOSTILE_INPUT_MS);
    }
  });
});
