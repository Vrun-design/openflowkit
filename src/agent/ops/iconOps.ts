// Syntax and icon ops: the two lookups an agent needs before it can write DSL.
import { z } from 'zod';
import { defineOp } from './types';
import type { IconMatch } from './types';

// Concept → the words worth searching for in any provider catalog. Order is
// intent first ("database" should surface a database, not a database migration
// service); the op then keeps the catalog's own ranking inside each query.
export const ICON_CONCEPTS: Readonly<Record<string, readonly string[]>> = {
  database: ['rds', 'dynamodb', 'sql database', 'database'],
  cache: ['elasticache', 'redis', 'cache'],
  queue: ['sqs', 'service bus', 'kafka', 'queue'],
  stream: ['kinesis', 'event hubs', 'pubsub', 'pub/sub'],
  storage: ['s3', 'blob storage', 'cloud storage', 'bucket'],
  compute: ['lambda', 'functions', 'cloud functions', 'app service'],
  container: ['ecs', 'eks', 'kubernetes', 'container apps'],
  server: ['ec2', 'virtual machine', 'compute engine'],
  loadbalancer: ['elastic load balancing', 'application gateway', 'load balancer'],
  gateway: ['api gateway', 'api management', 'apigee'],
  cdn: ['cloudfront', 'front door', 'cloud cdn'],
  dns: ['route 53', 'dns', 'cloud dns'],
  auth: ['cognito', 'active directory', 'identity'],
  monitoring: ['cloudwatch', 'monitor', 'logging', 'observability'],
  notification: ['sns', 'notification hub', 'pubsub'],
  analytics: ['athena', 'synapse', 'bigquery', 'analytics'],
  ml: ['sagemaker', 'machine learning', 'vertex ai'],
  search: ['opensearch', 'cognitive search', 'elasticsearch'],
  email: ['ses', 'communication services', 'sendgrid'],
  payment: ['stripe', 'payment'],
  git: ['github', 'gitlab', 'git'],
  ci: ['actions', 'pipelines', 'jenkins', 'ci'],
  browser: ['browser', 'chrome', 'web'],
  mobile: ['mobile', 'android', 'ios'],
  user: ['user', 'person', 'customer'],
  api: ['api', 'rest', 'graphql'],
  message: ['message', 'chat', 'slack'],
  file: ['file', 'document', 'folder'],
};

const conceptFor = (query: string): { key: string; terms: readonly string[] } => {
  const needle = query.trim().toLowerCase().replace(/[^a-z]/g, '');
  for (const [key, terms] of Object.entries(ICON_CONCEPTS)) {
    if (key === needle || terms.some((term) => term.replace(/[^a-z]/g, '') === needle)) return { key, terms };
  }
  return { key: query.trim(), terms: [query.trim()] };
};

export const getSyntax = defineOp({
  name: 'get_syntax',
  title: 'Read the grammar',
  description: 'The OpenFlow DSL grammar: the full reference, or one family’s section.',
  schema: z.object({ family: z.string().min(1).optional().describe('flowchart, architecture, sequence, state, erd, class, gitgraph, mindmap') }),
  async run({ family }, context) {
    return { command: null, output: { family: family ?? null, syntax: await context.capabilities.syntax(family) } };
  },
});

export const searchIcons = defineOp({
  name: 'search_icons',
  title: 'Search icons',
  description: 'Search the shipped icon packs by name (e.g. "lambda", "sql database"). Use the returned provider/slug in DSL `icon:` attributes.',
  schema: z.object({
    query: z.string().min(1),
    limit: z.number().int().min(1).max(50).default(10),
  }),
  async run({ query, limit }, context) {
    const matches = await context.capabilities.searchIcons(query, limit);
    return { command: null, output: { query, matches } };
  },
});

export const findIconsFor = defineOp({
  name: 'find_icons_for',
  title: 'Find icons for a concept',
  description: 'Concept search ("cache", "queue", "auth") expanded into catalog queries and ranked; the fastest way to pick icon ids for architecture DSL.',
  schema: z.object({
    concept: z.string().min(1),
    limit: z.number().int().min(1).max(50).default(8),
  }),
  async run({ concept, limit }, context) {
    const { key, terms } = conceptFor(concept);
    const seen = new Set<string>();
    const matches: IconMatch[] = [];
    for (const term of terms) {
      if (matches.length >= limit) break;
      for (const match of await context.capabilities.searchIcons(term, limit)) {
        const id = `${match.provider}/${match.slug}`;
        if (seen.has(id)) continue;
        seen.add(id);
        matches.push(match);
        if (matches.length >= limit) break;
      }
    }
    return { command: null, output: { concept: key, matches } };
  },
});
