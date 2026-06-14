import { describe, expect, it } from 'vitest';
import { parseOpenFlowDslV2 } from './flowmindDSLParserV2';
import { enrichNodesWithIcons } from './nodeEnricher';

// These test the full pipeline: AI-generated DSL → parse → enrich → correct icons
// Simulates what happens when AI outputs DSL with archProvider/archResourceType

describe('AI + Icons Pipeline (E2E)', () => {
  it('Node.js API with PostgreSQL and Redis', async () => {
    const dsl = `
      flow: Node.js Stack
      direction: TB

      [system] api: Express API { archProvider: "developer", archResourceType: "others-expressjs-dark", color: "blue" }
      [system] db: PostgreSQL { archProvider: "developer", archResourceType: "database-postgresql", color: "violet" }
      [system] cache: Redis { archProvider: "developer", archResourceType: "database-redis", color: "red" }

      api ->|SQL| db
      api ->|cache| cache
    `;

    const parsed = parseOpenFlowDslV2(dsl);
    const enriched = await enrichNodesWithIcons(parsed.nodes);

    expect(enriched).toHaveLength(3);

    const api = enriched.find((n) => n.id === 'api');
    expect(api?.data.archIconPackId).toBe('developer-icons-v1');
    expect(api?.data.archIconShapeId).toBe('others-expressjs-dark');

    const db = enriched.find((n) => n.id === 'db');
    expect(db?.data.archIconPackId).toBe('developer-icons-v1');
    expect(db?.data.archIconShapeId).toBe('database-postgresql');

    const cache = enriched.find((n) => n.id === 'cache');
    expect(cache?.data.archIconPackId).toBe('developer-icons-v1');
    expect(cache?.data.archIconShapeId).toContain('redis');
  });

  it('AWS Lambda → SQS → DynamoDB', async () => {
    const dsl = `
      flow: Serverless Pipeline
      direction: TB

      [architecture] lambda: Lambda { archProvider: "aws", archResourceType: "compute-lambda", color: "violet" }
      [architecture] sqs: SQS Queue { archProvider: "aws", archResourceType: "application-integration-simple-queue-service", color: "amber" }
      [architecture] dynamo: DynamoDB { archProvider: "aws", archResourceType: "databases-dynamodb", color: "emerald" }

      lambda ->|publish| sqs
      sqs ->|write| dynamo
    `;

    const parsed = parseOpenFlowDslV2(dsl);
    const enriched = await enrichNodesWithIcons(parsed.nodes);

    expect(enriched).toHaveLength(3);

    for (const node of enriched) {
      expect(node.data.archIconPackId).toBe('aws-official-starter-v1');
      expect(node.data.archIconShapeId).toBeTruthy();
    }
  });

  it('React → Express → MongoDB → S3 (mixed stacks)', async () => {
    const dsl = `
      flow: Full Stack
      direction: TB

      [system] react: React App { archProvider: "developer", archResourceType: "frontend-react", color: "blue" }
      [system] api: Express { archProvider: "developer", archResourceType: "others-expressjs-dark", color: "violet" }
      [system] mongo: MongoDB { archProvider: "developer", archResourceType: "database-mongodb", color: "emerald" }
      [architecture] s3: S3 Storage { archProvider: "aws", archResourceType: "storage-s3", color: "amber" }

      react ->|HTTP| api
      api ->|query| mongo
      api ->|upload| s3
    `;

    const parsed = parseOpenFlowDslV2(dsl);
    const enriched = await enrichNodesWithIcons(parsed.nodes);

    expect(enriched).toHaveLength(4);

    const react = enriched.find((n) => n.id === 'react');
    expect(react?.data.archIconPackId).toBe('developer-icons-v1');
    expect(react?.data.color).toBe('blue');

    const s3 = enriched.find((n) => n.id === 's3');
    expect(s3?.data.archIconPackId).toBe('aws-official-starter-v1');
  });

  it('auto-enriches nodes without explicit icons (icons: auto behavior)', async () => {
    const dsl = `
      flow: Auto Icons
      direction: TB

      [system] api: Express API
      [system] db: PostgreSQL Database
      [system] cache: Redis Cache
    `;

    const parsed = parseOpenFlowDslV2(dsl);
    const enriched = await enrichNodesWithIcons(parsed.nodes);

    // Without explicit archProvider, enricher should match by label
    const api = enriched.find((n) => n.id === 'api');
    expect(api?.data.archIconPackId).toBeTruthy();
    expect(api?.data.color).toBe('blue');

    const db = enriched.find((n) => n.id === 'db');
    expect(db?.data.color).toBe('violet');
  });

  it('enricher does not overwrite AI-set provider icons', async () => {
    const dsl = `
      [architecture] lambda: My Lambda { archProvider: "aws", archResourceType: "compute-lambda", color: "violet" }
    `;

    const parsed = parseOpenFlowDslV2(dsl);
    const enriched = await enrichNodesWithIcons(parsed.nodes);

    const lambda = enriched.find((n) => n.id === 'lambda');
    expect(lambda?.data.archIconPackId).toBe('aws-official-starter-v1');
    expect(lambda?.data.archIconShapeId).toBe('compute-lambda');
    expect(lambda?.data.color).toBe('violet');
  });

  it('enriches architecture-beta imported nodes', async () => {
    const dsl = `
      flow: Architecture
      direction: TB

      [architecture] server: Express.js { color: "violet" }
      [architecture] db: PostgreSQL { color: "violet" }
      [architecture] cache: Redis { color: "red" }

      server ->|query| db
      server ->|cache| cache
    `;

    const parsed = parseOpenFlowDslV2(dsl);
    const enriched = await enrichNodesWithIcons(parsed.nodes);

    const server = enriched.find((n) => n.id === 'server');
    expect(server?.data.archIconPackId).toBeTruthy();
    expect(server?.data.color).toBe('violet');

    const db = enriched.find((n) => n.id === 'db');
    expect(db?.data.archIconPackId).toBeTruthy();

    const cache = enriched.find((n) => n.id === 'cache');
    expect(cache?.data.archIconPackId).toBeTruthy();
  });
});
