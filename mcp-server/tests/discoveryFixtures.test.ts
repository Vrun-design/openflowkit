import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import { runArchitectureDiscovery, type ArchitectureDiscovery } from '../src/lib/architectureDiscovery.js';

// Hand-written copies of the file shapes that broke discovery on real repos
// (microservices-demo and this repo, 2026-10-07): Helm placeholders, the same
// service in k8s + kustomize + release + src, service→service calls that only
// live in `env`, and services invented from tests, evals and string literals.

const tempDirs: string[] = [];
afterAll(async () => { await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true }))); });

async function repo(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'openflowkit-discovery-'));
  tempDirs.push(root);
  for (const [relative, content] of Object.entries(files)) {
    const full = join(root, relative);
    await mkdir(join(full, '..'), { recursive: true });
    await writeFile(full, content, 'utf8');
  }
  return root;
}

/** A microservices-demo workload: Deployment + Service, env on the `server` container. */
function deployment(name: string, image: string, env: Record<string, string> = {}): string {
  return [
    '# Copyright 2018 Google LLC',
    'apiVersion: apps/v1',
    'kind: Deployment',
    'metadata:',
    `  name: ${name}`,
    '  labels:',
    `    app: ${name}`,
    'spec:',
    '  template:',
    '    spec:',
    `      serviceAccountName: ${name}`,
    '      containers:',
    '        - name: server',
    `          image: ${image}`,
    '          readinessProbe:',
    '            httpGet:',
    '              httpHeaders:',
    '              - name: "Cookie"',
    '                value: "shop_session-id=x-readiness-probe"',
    '          env:',
    '          - name: PORT',
    '            value: "8080"',
    ...Object.entries(env).flatMap(([key, value]) => [`          - name: ${key}`, `            value: "${value}"`]),
    '          # - name: PACKAGING_SERVICE_URL',
    '          #   value: "http://packaging:80"',
    '---',
    'apiVersion: v1',
    'kind: Service',
    'metadata:',
    `  name: ${name}`,
    'spec:',
    '  ports:',
    '  - name: grpc',
    '    port: 8080',
    '',
  ].join('\n');
}

const FRONTEND_ENV = {
  PRODUCT_CATALOG_SERVICE_ADDR: 'productcatalogservice:3550',
  CURRENCY_SERVICE_ADDR: 'currencyservice:7000',
  CART_SERVICE_ADDR: 'cartservice:7070',
  RECOMMENDATION_SERVICE_ADDR: 'recommendationservice:8080',
  SHIPPING_SERVICE_ADDR: 'shippingservice:50051',
  CHECKOUT_SERVICE_ADDR: 'checkoutservice:5050',
  AD_SERVICE_ADDR: 'adservice:9555',
  SHOPPING_ASSISTANT_SERVICE_ADDR: 'shoppingassistantservice:80',
};
const CHECKOUT_ENV = {
  PRODUCT_CATALOG_SERVICE_ADDR: 'productcatalogservice:3550',
  SHIPPING_SERVICE_ADDR: 'shippingservice:50051',
  PAYMENT_SERVICE_ADDR: 'paymentservice:50051',
  EMAIL_SERVICE_ADDR: 'emailservice:5000',
  CURRENCY_SERVICE_ADDR: 'currencyservice:7000',
  CART_SERVICE_ADDR: 'cartservice:7070',
};

const SERVICES = [
  'adservice', 'cartservice', 'checkoutservice', 'currencyservice', 'emailservice', 'frontend',
  'loadgenerator', 'paymentservice', 'productcatalogservice', 'recommendationservice', 'shippingservice',
];

function microservicesDemo(): Record<string, string> {
  const envOf: Record<string, Record<string, string>> = {
    frontend: FRONTEND_ENV,
    checkoutservice: CHECKOUT_ENV,
    cartservice: { REDIS_ADDR: 'redis-cart:6379' },
    recommendationservice: { PRODUCT_CATALOG_SERVICE_ADDR: 'productcatalogservice:3550' },
    loadgenerator: { FRONTEND_ADDR: 'frontend:80', USERS: '10' },
  };
  const files: Record<string, string> = {};
  for (const name of SERVICES) {
    const manifest = deployment(name, name, envOf[name] ?? {});
    files[`kubernetes-manifests/${name}.yaml`] = name === 'cartservice'
      ? `${manifest}---\n${deployment('redis-cart', 'redis:alpine')}`
      : manifest;
    files[`kustomize/base/${name}.yaml`] = manifest;
    // Helm renders names from values: the template itself names nothing real.
    files[`helm-chart/templates/${name}.yaml`] = [
      '{{- if .Values.service.create }}',
      'apiVersion: apps/v1',
      'kind: Deployment',
      'metadata:',
      `  name: {{ .Values.${name}.name }}`,
      'spec:',
      '  template:',
      '    spec:',
      '      containers:',
      '      - name: server',
      `        image: {{ .Values.images.repository }}/{{ .Values.${name}.name }}:{{ .Values.images.tag }}`,
      '        env:',
      '        - name: PRODUCT_CATALOG_SERVICE_ADDR',
      '          value: "{{ .Values.productCatalogService.name }}:3550"',
      '{{- end }}',
      '',
    ].join('\n');
  }
  files['release/kubernetes-manifests.yaml'] = SERVICES
    .map((name) => deployment(name, `us-central1-docker.pkg.dev/google-samples/microservices-demo/${name}:v0.10.1`, envOf[name] ?? {}))
    .join('---\n');
  files['kustomize/components/shopping-assistant/kustomization.yaml'] = [
    'apiVersion: kustomize.config.k8s.io/v1alpha1',
    'kind: Component',
    'resources:',
    '- shoppingassistantservice.yaml',
    'patches:',
    '- patch: |-',
    '    apiVersion: apps/v1',
    '    kind: Deployment',
    '    metadata:',
    '      name: frontend',
    '',
  ].join('\n');
  files['kustomize/components/shopping-assistant/shoppingassistantservice.yaml'] = deployment('shoppingassistantservice', 'shoppingassistantservice');
  files['kustomize/tests/memorystore/kustomization.yaml'] = 'kind: Kustomization\nresources:\n- ../../base\n';
  files['src/frontend/Dockerfile'] = 'FROM --platform=$BUILDPLATFORM golang:1.27.0-alpine@sha256:4c9f AS builder\nFROM gcr.io/distroless/static\nEXPOSE 8080\n';
  files['src/frontend/go.mod'] = 'module github.com/GoogleCloudPlatform/microservices-demo/src/frontend\n\ngo 1.25.0\n';
  files['src/checkoutservice/Dockerfile'] = 'FROM --platform=$BUILDPLATFORM golang:1.27.0-alpine AS builder\nEXPOSE 5050\n';
  files['src/checkoutservice/go.mod'] = 'module github.com/GoogleCloudPlatform/microservices-demo/src/checkoutservice\n';
  files['src/cartservice/src/Dockerfile'] = 'FROM --platform=$BUILDPLATFORM mcr.microsoft.com/dotnet/sdk:10.0.100-noble AS builder\nEXPOSE 7070\n';
  files['src/cartservice/src/Dockerfile.debug'] = 'FROM mcr.microsoft.com/dotnet/sdk:10.0.100-noble\n';
  files['src/currencyservice/Dockerfile'] = 'FROM --platform=$BUILDPLATFORM node:24.20.0-alpine AS builder\nEXPOSE 7000\n';
  files['src/currencyservice/package.json'] = JSON.stringify({ name: 'grpc-currency-service', dependencies: { '@grpc/grpc-js': '1.0.0' } }, null, 2);
  files['src/paymentservice/Dockerfile'] = 'FROM --platform=$BUILDPLATFORM node:24.20.0-alpine AS builder\n';
  files['src/paymentservice/package.json'] = JSON.stringify({ name: 'paymentservice', dependencies: { '@grpc/grpc-js': '1.0.0' } }, null, 2);
  files['src/emailservice/Dockerfile'] = 'FROM --platform=$BUILDPLATFORM python:3.14.7-alpine AS base\nFROM base AS builder\n';
  files['src/emailservice/requirements.txt'] = 'grpcio==1.0.0\njinja2==3.1.0\n';
  files['src/shoppingassistantservice/Dockerfile'] = 'FROM python:3.14.7-alpine\n';
  files['src/shoppingassistantservice/requirements.txt'] = 'langchain==0.3.0\n';
  return files;
}

function edges(discovery: ArchitectureDiscovery, from: string): string[] {
  const nameOf = new Map(discovery.units.map((unit) => [unit.id, unit.name]));
  const fromId = discovery.units.find((unit) => unit.name === from)?.id;
  return discovery.relations
    .filter((relation) => relation.from === fromId && relation.label === 'calls')
    .map((relation) => nameOf.get(relation.to)!)
    .sort();
}

describe('discovery on a microservices-demo-shaped repo', () => {
  it('finds each service once, under its deployed name, and no Helm placeholders', async () => {
    const discovery = await runArchitectureDiscovery(await repo(microservicesDemo()));
    expect(discovery.units.map((unit) => unit.name).sort()).toEqual(
      [...SERVICES, 'redis-cart', 'shoppingassistantservice'].sort(),
    );
    expect(discovery.units.every((unit) => !unit.id.includes('{{') && !unit.name.includes('{{'))).toBe(true);
  });

  it('draws service→service calls from env values, with file:line evidence', async () => {
    const files = microservicesDemo();
    const discovery = await runArchitectureDiscovery(await repo(files));
    expect(edges(discovery, 'frontend')).toEqual([
      'adservice', 'cartservice', 'checkoutservice', 'currencyservice', 'productcatalogservice',
      'recommendationservice', 'shippingservice', 'shoppingassistantservice',
    ]);
    expect(edges(discovery, 'checkoutservice')).toEqual([
      'cartservice', 'currencyservice', 'emailservice', 'paymentservice', 'productcatalogservice', 'shippingservice',
    ]);
    expect(edges(discovery, 'cartservice')).toEqual(['redis-cart']);
    expect(edges(discovery, 'loadgenerator')).toEqual(['frontend']);
    expect(edges(discovery, 'recommendationservice')).toEqual(['productcatalogservice']);

    const frontend = discovery.units.find((unit) => unit.name === 'frontend')!;
    const checkout = discovery.units.find((unit) => unit.name === 'checkoutservice')!;
    const call = discovery.relations.find((relation) => relation.from === frontend.id && relation.to === checkout.id && relation.label === 'calls')!;
    const line = files['kubernetes-manifests/frontend.yaml']!.split('\n').findIndex((text) => text.includes('checkoutservice:5050')) + 1;
    expect(call.evidence[0]).toMatchObject({ file: 'kubernetes-manifests/frontend.yaml', line, text: 'value: "checkoutservice:5050"' });
  });

  it('reads the image past FROM --platform and names a src/ Dockerfile after its service', async () => {
    const discovery = await runArchitectureDiscovery(await repo(microservicesDemo()));
    expect(discovery.units.find((unit) => unit.name === 'frontend')?.tech).toBe('Go');
    expect(discovery.units.find((unit) => unit.name === 'checkoutservice')?.tech).toBe('Go');
    expect(discovery.units.find((unit) => unit.name === 'emailservice')?.tech).toBe('Python');
    // The Dockerfile sits in src/cartservice/src: the service is the folder above, and owns its code.
    expect(discovery.units.find((unit) => unit.name === 'cartservice')?.dir).toBe('src/cartservice');
    expect(discovery.units.find((unit) => unit.name === 'redis-cart')).toMatchObject({ kind: 'store', tech: 'Redis' });
  });
});

describe('discovery invents nothing', () => {
  it('ignores tests, e2e, evals, fixtures and words in strings; counts real imports and manifests', async () => {
    const discovery = await runArchitectureDiscovery(await repo({
      'package.json': JSON.stringify({ name: 'shop', dependencies: { stripe: '^14', pg: '^8' } }, null, 2),
      'src/pay.ts': "import Stripe from 'stripe';\nexport const stripe = new Stripe('k');\n",
      'src/db.ts': "import { Pool } from 'pg';\nexport const pool = new Pool();\n",
      'src/scanner.ts': "export const RULES = [/\\bredis\\b/i, /\\bbigquery\\b/i, 'DynamoDB', 'lambda'];\n",
      'src/notes.ts': '// TODO: move sessions to Redis, archive to S3 via Lambda\n',
      'src/pay.test.ts': "import { MongoClient } from 'mongodb';\nawait fetch('https://api.twilio.com/2010');\n",
      'e2e/checkout.spec.ts': "await fetch('https://api.sendgrid.com/v3/mail');\nconst kafka = 'kafkajs';\n",
      'tests/integration/docker-compose.yml': 'services:\n  fake-sqs:\n    image: softwaremill/elasticmq\n',
      'evals/prompts.json': JSON.stringify([{ prompt: 'BigQuery and Pub/Sub on GCP with Cloud Storage' }]),
      'test/fixtures/k8s.yaml': deployment('ghost', 'ghost'),
      'src/__tests__/api.ts': "import AWS from 'aws-sdk';\n",
      'src/service_test.go': 'package main\nimport "cloud.google.com/go/bigquery"\n',
      'src/test_db.py': 'import redis\n',
    }));
    expect(discovery.units.map((unit) => unit.name).sort()).toEqual(['PostgreSQL', 'Stripe', 'shop']);
  });

  it('makes a compose service running a datastore image that store, not a second node', async () => {
    const discovery = await runArchitectureDiscovery(await repo({
      'docker-compose.yml': 'services:\n  api:\n    image: acme/api:1\n  cache:\n    image: redis:7\n',
    }));
    expect(discovery.units.map((unit) => [unit.name, unit.kind, unit.tech ?? ''])).toEqual([
      ['api', 'container', 'api'], ['cache', 'store', 'Redis'],
    ]);
  });
});

describe('discovery on this repository', () => {
  // On 2026-10-07 it reported 12 invented services (Stripe, BigQuery…) from tests, evals,
  // icon data and its own rule source. A real new dependency belongs in this list.
  it('reports the app, the docs site and the MCP server, and nothing it made up', async () => {
    const discovery = await runArchitectureDiscovery(fileURLToPath(new URL('../..', import.meta.url)));
    expect(discovery.units.map((unit) => unit.name).sort()).toEqual(['openflowkit', 'openflowkit-docs', 'openflowkit-mcp', 'openflowkit-share', 'openflowkit-shares']);
  });
});

describe('compose environment', () => {
  it('draws calls from map and list environment entries to known services only', async () => {
    const compose = [
      'services:',
      '  web:',
      '    build: ./web',
      '    environment:',
      '      API_URL: http://api:8080/v1',
      '      ANALYTICS_URL: https://plausible.io/api',
      '  api:',
      '    image: acme/api:1',
      '    environment:',
      '      - DATABASE_URL=postgres://app:secret@db:5432/app',
      '      - "QUEUE=amqp://guest@rabbit:5672"',
      '      - SELF=http://api:8080',
      '  db:',
      '    image: postgres:16',
      '  rabbit:',
      '    image: rabbitmq:3',
      '',
    ].join('\n');
    const discovery = await runArchitectureDiscovery(await repo({ 'docker-compose.yml': compose }));
    expect(edges(discovery, 'web')).toEqual(['api']);
    expect(edges(discovery, 'api')).toEqual(['db', 'rabbit']);
    const web = discovery.units.find((unit) => unit.name === 'web')!;
    const call = discovery.relations.find((relation) => relation.from === web.id && relation.label === 'calls')!;
    expect(call.evidence[0]).toMatchObject({ file: 'docker-compose.yml', line: 5 });
  });
});

// Review repros (2026-10-07): each was a wrong merge, a phantom unit or a false edge.
describe('discovery merges and edges only what is real', () => {
  const names = (discovery: ArchitectureDiscovery) => discovery.units.map((unit) => unit.name).sort();
  const pairs = (discovery: ArchitectureDiscovery) => {
    const nameOf = new Map(discovery.units.map((unit) => [unit.id, unit.name]));
    return discovery.relations.map((relation) => `${nameOf.get(relation.from)}->${nameOf.get(relation.to)}:${relation.label}`).sort();
  };

  it('keeps two services apart when their packages share a name', async () => {
    const discovery = await runArchitectureDiscovery(await repo({
      'services/orders/Dockerfile': 'FROM python:3.12\n',
      'services/orders/pyproject.toml': '[project]\nname = "app"\n',
      'services/payments/pyproject.toml': '[project]\nname = "app"\n',
    }));
    expect(discovery.units.map((unit) => unit.dir).sort()).toEqual(['services/orders', 'services/payments']);
  });

  it('lifts a Dockerfile out of src only when that folder is not a package itself', async () => {
    const split = await runArchitectureDiscovery(await repo({
      'server/Dockerfile': 'FROM node:20\n',
      'server/package.json': JSON.stringify({ name: 'shop-server' }),
      'client/Dockerfile': 'FROM node:20\n',
      'client/package.json': JSON.stringify({ name: 'shop-client' }),
      'apps/server/Dockerfile': 'FROM node:20\n',
      'apps/server/package.json': JSON.stringify({ name: 'admin' }),
    }));
    expect(names(split)).toEqual(['admin', 'shop-client', 'shop-server']);
    const root = await runArchitectureDiscovery(await repo({
      'src/Dockerfile': 'FROM node:20\n',
      'src/index.ts': "import Redis from 'ioredis';\n",
    }));
    expect(pairs(root)).toEqual(['src->Redis:uses']);
  });

  it('draws no call from plain words, public hosts or non-env value lines', async () => {
    const discovery = await runArchitectureDiscovery(await repo({
      'docker-compose.yml': [
        'services:',
        '  app:',
        '    image: acme/app:1',
        '    environment:',
        '      OPENAI_BASE_URL: https://api.openai.com/v1',
        '      ROLE: worker',
        '      MAIL: smtp.gmail.com:587',
        '  api:',
        '    image: acme/api:1',
        '  worker:',
        '    image: acme/worker:1',
        '  smtp:',
        '    image: acme/smtp:1',
        '  db:',
        '    image: postgres:16',
        '    environment:',
        '      POSTGRES_DB: app',
        '      POSTGRES_USER: api',
        '',
      ].join('\n'),
      'k8s/backend.yaml': [
        'apiVersion: apps/v1',
        'kind: Deployment',
        'metadata:',
        '  name: backend',
        'spec:',
        '  template:',
        '    spec:',
        '      tolerations:',
        '      - key: dedicated',
        '        value: smtp',
        '      containers:',
        '      - name: server',
        '        image: acme/backend:1',
        '        readinessProbe:',
        '          httpGet:',
        '            httpHeaders:',
        '            - name: Host',
        '              value: worker:80',
        '        env:',
        '        - name: AUTH_URL',
        '          value: "https://auth.acme.io"',
        '        - name: API_ADDR',
        '          value: "api.default.svc.cluster.local:8080"',
        '',
      ].join('\n'),
    }));
    expect(pairs(discovery).filter((pair) => pair.endsWith(':calls'))).toEqual(['backend->api:calls']);
  });

  it('reads compose list env written at the same indent as its key', async () => {
    const discovery = await runArchitectureDiscovery(await repo({
      'docker-compose.yml': 'services:\n  web:\n    image: acme/web:1\n    environment:\n    - API=http://api:80\n  api:\n    image: acme/api:1\n',
    }));
    expect(pairs(discovery)).toEqual(['web->api:calls']);
  });

  it('turns only a lone datastore image into a store, and links client imports to it', async () => {
    const discovery = await runArchitectureDiscovery(await repo({
      'docker-compose.yml': [
        'services:',
        '  db:',
        '    image: postgres:16',
        '  cache:',
        '    image: redis:7',
        '  admin:',
        '    image: rediscommander/redis-commander',
        '',
      ].join('\n'),
      'api/package.json': JSON.stringify({ name: 'api', dependencies: { pg: '^8', ioredis: '^5' } }),
      'k8s/api.yaml': [
        'kind: Deployment',
        'metadata:',
        '  name: api',
        'spec:',
        '  template:',
        '    spec:',
        '      containers:',
        '      - image: acme/api:1',
        '      - image: redis:7-alpine',
        '---',
        'kind: Deployment',
        'metadata:',
        '  name: postgres-exporter',
        'spec:',
        '  template:',
        '    spec:',
        '      containers:',
        '      - image: prometheuscommunity/postgres-exporter',
        '',
      ].join('\n'),
    }));
    expect(discovery.units.map((unit) => `${unit.name}:${unit.kind}`).sort()).toEqual([
      'admin:container', 'api:container', 'cache:store', 'db:store', 'postgres-exporter:container',
    ]);
    expect(pairs(discovery).filter((pair) => pair.endsWith(':uses'))).toEqual(['api->cache:uses', 'api->db:uses']);
  });

  it('counts manifest dependencies, keeps SDK hosts on one node, and ignores relative imports', async () => {
    const discovery = await runArchitectureDiscovery(await repo({
      'worker/requirements.txt': 'redis==5.0.0\nboto3>=1.34  # aws\n',
      'web/package.json': JSON.stringify({ name: 'web', dependencies: { openai: '^4' } }),
      'web/src/ask.ts': "import OpenAI from 'openai';\nimport { handler } from './lambda/handler';\nimport { pool } from '../db/pg';\nexport const go = () => fetch('https://api.openai.com/v1/chat');\n",
    }));
    expect(names(discovery)).toEqual(['AWS', 'OpenAI', 'Redis', 'web', 'worker']);
  });
});
