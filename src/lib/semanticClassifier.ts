import type { NodeColorKey } from '@/theme';

export type SemanticCategory =
  | 'start'
  | 'end'
  | 'decision'
  | 'database'
  | 'cache'
  | 'queue'
  | 'service'
  | 'frontend'
  | 'user'
  | 'action'
  | 'gateway'
  | 'auth'
  | 'storage'
  | 'process';

export interface SemanticHint {
  category: SemanticCategory;
  color: NodeColorKey;
  iconQuery: string;
  lucideFallback: string;
}

const SPECIFIC_TECHNOLOGY_PATTERNS = [
  /\bpostgres(?:ql)?\b/i,
  /\bmysql\b/i,
  /\bmongo(?:db)?\b/i,
  /\bdynamodb\b/i,
  /\baurora\b/i,
  /\bsqlite\b/i,
  /\bmariadb\b/i,
  /\bcockroach\b/i,
  /\bsupabase\b/i,
  /\bredis\b/i,
  /\bmemcache(?:d)?\b/i,
  /\belasticache\b/i,
  /\bkafka\b/i,
  /\brabbitmq\b/i,
  /\bsqs\b/i,
  /\bpulsar\b/i,
  /\bnats\b/i,
  /\bnginx\b/i,
  /\bhaproxy\b/i,
  /\balb\b/i,
  /\bcloudfront\b/i,
  /\bingress\b/i,
  /\benvoy\b/i,
  /\bcognito\b/i,
  /\breact\b/i,
  /\bvue\b/i,
  /\bangular\b/i,
  /\bsvelte\b/i,
  /\bnext\.?js\b/i,
  /\bnuxt\b/i,
  /\bexpress\b/i,
  /\bnode\.?js\b/i,
  /\bdjango\b/i,
  /\bflask\b/i,
  /\bfastapi\b/i,
  /\bspring\b/i,
  /\brails\b/i,
  /\blaravel\b/i,
  /\bgin\b/i,
  /\bactix\b/i,
  /\bnest\.?js\b/i,
  /\bdocker\b/i,
  /\bkubernetes\b/i,
  /\bk8s\b/i,
  /\becs\b/i,
  /\beks\b/i,
  /\bcloud\s*run\b/i,
  /\bs3\b/i,
  /\bgemini\b/i,
  /\bopenai\b/i,
  /\banthropic\b/i,
  /\bchatgpt\b/i,
  /\bgpt-?[a-z0-9.]*\b/i,
  /\bclaude(?:-[a-z0-9.]+)?\b/i,
  /\bvertexai\b/i,
  /\bbedrock\b/i,
  /\bamazon\s*s3\b/i,
  /\baws\s*lambda\b/i,
  /\blambda\b/i,
  // CNCF / cloud-native
  /\bistio\b/i,
  /\bcilium\b/i,
  /\blinkerd\b/i,
  /\bhelm\b/i,
  /\bargo(?:\s*cd)?\b/i,
  /\bdapr\b/i,
  /\bprometheus\b/i,
  /\bjaeger\b/i,
  /\bopentelemetry\b/i,
  /\botel\b/i,
  /\bflux(?:cd)?\b/i,
  /\bharbor\b/i,
  /\betcd\b/i,
  /\bcert-?manager\b/i,
  /\bkeda\b/i,
  /\bcrossplane\b/i,
  /\bknative\b/i,
  /\bvault\b/i,
  /\bkeycloak\b/i,
  /\bgrpc\b/i,
  /\bcontainerd\b/i,
  /\bfalco\b/i,
  /\bgrafana\b/i,
  /\bdatadog\b/i,
  /\bnewrelic\b/i,
  /\bsentry\b/i,
  /\bsplunk\b/i,
  /\bdynatrace\b/i,
  // Azure
  /\bcosmos\s*db\b/i,
  /\bazure\s*cosmos\b/i,
  /\bservice\s*bus\b/i,
  /\bazure\s*service\s*bus\b/i,
  /\bevent\s*hub(?:s)?\b/i,
  /\bazure\s*event\s*hub\b/i,
  /\baks\b/i,
  /\bazure\s*kubernetes\b/i,
  /\bazure\s*functions?\b/i,
  /\bazure\s*openai\b/i,
  /\bazure\s*monitor\b/i,
  /\bkey\s*vault\b/i,
  /\bazure\s*key\s*vault\b/i,
  /\bcontainer\s*apps?\b/i,
  /\bazure\s*container\b/i,
  /\bapi\s*management\b/i,
  /\bapim\b/i,
  /\bevent\s*grid\b/i,
  /\bcognitive\s*services?\b/i,
  /\bazure\s*devops\b/i,
  /\bazure\s*sql\b/i,
  /\bazure\s*blob\b/i,
  /\bfront\s*door\b/i,
];

const COMMON_ENGLISH_ICON_TERMS = new Set([
  'action',
  'admin',
  'api',
  'app',
  'auth',
  'backend',
  'browser',
  'cache',
  'check',
  'client',
  'component',
  'compute',
  'condition',
  'data',
  'database',
  'db',
  'decision',
  'edge',
  'end',
  'external',
  'flow',
  'frontend',
  'gateway',
  'input',
  'job',
  'mobile',
  'node',
  'output',
  'payment',
  'process',
  'queue',
  'screen',
  'server',
  'service',
  'stage',
  'start',
  'state',
  'step',
  'storage',
  'system',
  'task',
  'ui',
  'user',
  'users',
  'validator',
  'view',
  'worker',
]);

interface ClassifierRule {
  patterns: RegExp[];
  category: SemanticCategory;
  color: NodeColorKey;
  lucideFallback: string;
  extractQuery?: (text: string, id: string) => string;
}

function extractFirstMatch(text: string, pattern: RegExp): string {
  const match = text.match(pattern);
  return match?.[1] ?? '';
}

function createExtractQuery(pattern: RegExp): (text: string) => string {
  return (text: string) => extractFirstMatch(text, pattern);
}

const RULES: ClassifierRule[] = [
  {
    patterns: [/\bstart\b/i, /\bbegin\b/i, /\binit\b/i, /\bentry\b/i, /\blaunch\b/i],
    category: 'start',
    color: 'emerald',
    lucideFallback: 'play',
  },
  {
    patterns: [/\bend\b/i, /\bfinish\b/i, /\bdone\b/i, /\bcomplete\b/i, /\bstop\b/i, /\bexit\b/i],
    category: 'end',
    color: 'red',
    lucideFallback: 'check-circle',
  },
  {
    patterns: [
      /\bdb\b/i,
      /\bdatabase\b/i,
      /\bsql\b/i,
      /\bpostgres/i,
      /\bmysql\b/i,
      /\bmongo/i,
      /\bdynamodb\b/i,
      /\baurora\b/i,
      /\bsqlite\b/i,
      /\bmariadb\b/i,
      /\bcockroach\b/i,
      /\bsupabase\b/i,
    ],
    category: 'database',
    color: 'violet',
    lucideFallback: 'database',
    extractQuery: createExtractQuery(
      /(postgres(?:ql)?|mysql|mongo(?:db)?|dynamodb|aurora|sqlite|mariadb|cockroach|supabase)/i
    ),
  },
  {
    patterns: [/\bredis\b/i, /\bmemcache/i, /\bcache\b/i, /\belasticache\b/i],
    category: 'cache',
    color: 'red',
    lucideFallback: 'hard-drive',
    extractQuery: createExtractQuery(/(redis|memcache(?:d)?|elasticache)/i),
  },
  {
    patterns: [
      /\bkafka\b/i,
      /\brabbitmq\b/i,
      /\bsqs\b/i,
      /\bpulsar\b/i,
      /\bnats\b/i,
      /\bqueue\b/i,
      /\bbus\b/i,
    ],
    category: 'queue',
    color: 'amber',
    lucideFallback: 'layers',
    extractQuery: createExtractQuery(/(kafka|rabbitmq|sqs|pulsar|nats)/i),
  },
  {
    patterns: [
      /\buser\b/i,
      /\bactor\b/i,
      /\bcustomer\b/i,
      /\badmin\b/i,
      /\bclient\b/i,
      /\bperson\b/i,
      /\bviewer\b/i,
    ],
    category: 'user',
    color: 'blue',
    lucideFallback: 'user',
  },
  {
    patterns: [
      /\bapi[- ]?gateway\b/i,
      /\bgateway\b/i,
      /\bload[- ]?balancer\b/i,
      /\bnginx\b/i,
      /\bhaproxy\b/i,
      /\balb\b/i,
      /\bcloudfront\b/i,
      /\bingress\b/i,
      /\benvoy\b/i,
    ],
    category: 'gateway',
    color: 'slate',
    lucideFallback: 'shield',
    extractQuery: createExtractQuery(/(nginx|haproxy|alb|cloudfront|ingress|envoy)/i),
  },
  {
    patterns: [
      /\bauth\b/i,
      /\blogin\b/i,
      /\bsign[- ]?in\b/i,
      /\boauth\b/i,
      /\bjwt\b/i,
      /\bsso\b/i,
      /\bcognito\b/i,
      /\bidentity\b/i,
    ],
    category: 'auth',
    color: 'amber',
    lucideFallback: 'key-round',
    extractQuery: createExtractQuery(/(cognito|auth0|keycloak|oauth2)/i),
  },
  {
    patterns: [/\bs3\b/i, /\bblob\b/i, /\bstorage\b/i, /\buploads?\b/i, /\bcdn\b/i],
    category: 'storage',
    color: 'yellow',
    lucideFallback: 'folder',
    extractQuery: createExtractQuery(/(amazon\s*s3|s3)/i),
  },
  {
    patterns: [
      /\breact\b/i,
      /\bvue\b/i,
      /\bangular\b/i,
      /\bsvelte\b/i,
      /\bnext\.?js\b/i,
      /\bnuxt\b/i,
      /\bfrontend\b/i,
      /\bui\b/i,
      /\bweb\s*app\b/i,
      /\bclient[- ]?app\b/i,
      /\bhtml\b/i,
      /\bcss\b/i,
    ],
    category: 'frontend',
    color: 'blue',
    lucideFallback: 'monitor',
    extractQuery: createExtractQuery(/(react|vue|angular|svelte|next(?:\.?js)?|nuxt)/i),
  },
  {
    patterns: [
      /\bgemini\b/i,
      /\bgpt\b/i,
      /\bclaude\b/i,
      /\bopenai\b/i,
      /\bllm\b/i,
      /\bvertexai\b/i,
      /\bbedrock\b/i,
      /\bmodel\b/i,
    ],
    category: 'service',
    color: 'blue',
    lucideFallback: 'cpu',
    extractQuery: createExtractQuery(
      /(gemini|openai|chatgpt|gpt-?[a-z0-9.]*|claude(?:-[a-z0-9.]+)?|vertexai|bedrock|anthropic)/i
    ),
  },
  {
    patterns: [
      /\bexpress\b/i,
      /\bnode\.?js\b/i,
      /\bdjango\b/i,
      /\bflask\b/i,
      /\bfastapi\b/i,
      /\bspring\b/i,
      /\brails\b/i,
      /\blaravel\b/i,
      /\bgin\b/i,
      /\bactix\b/i,
      /\bnest\.?js\b/i,
      /\baws\s*lambda\b/i,
      /\blambda\b/i,
      /\bapi\b/i,
      /\bservice\b/i,
      /\bbackend\b/i,
      /\bserver\b/i,
      /\bmicroservice\b/i,
    ],
    category: 'service',
    color: 'blue',
    lucideFallback: 'server',
    extractQuery: createExtractQuery(
      /(express|node\.?js|django|flask|fastapi|spring|rails|laravel|gin|actix|nest\.?js|aws\s*lambda|lambda)/i
    ),
  },
  {
    patterns: [
      /\bdocker\b/i,
      /\bkubernetes\b/i,
      /\bk8s\b/i,
      /\becs\b/i,
      /\beks\b/i,
      /\baks\b/i,
      /\bcloud\s*run\b/i,
      /\bcontainer\b/i,
      /\bcontainerd\b/i,
    ],
    category: 'service',
    color: 'blue',
    lucideFallback: 'container',
    extractQuery: createExtractQuery(/(docker|kubernetes|k8s|ecs|eks|aks|cloud\s*run|containerd)/i),
  },
  {
    patterns: [
      /\bistio\b/i,
      /\bcilium\b/i,
      /\blinkerd\b/i,
      /\bkuma\b/i,
    ],
    category: 'gateway',
    color: 'slate',
    lucideFallback: 'shield',
    extractQuery: createExtractQuery(/(istio|cilium|linkerd|kuma)/i),
  },
  {
    patterns: [
      /\bhelm\b/i,
      /\bargo(?:\s*cd)?\b/i,
      /\bflux(?:cd)?\b/i,
      /\bcrossplane\b/i,
      /\bkeda\b/i,
      /\bknative\b/i,
      /\bdapr\b/i,
      /\bcert-?manager\b/i,
      /\betcd\b/i,
      /\bharbor\b/i,
      /\bfalco\b/i,
    ],
    category: 'service',
    color: 'blue',
    lucideFallback: 'settings',
    extractQuery: createExtractQuery(/(helm|argocd|argo|fluxcd|flux|crossplane|keda|knative|dapr|etcd|harbor|falco)/i),
  },
  {
    patterns: [
      /\bprometheus\b/i,
      /\bjaeger\b/i,
      /\bopentelemetry\b/i,
      /\botel\b/i,
      /\bgrafana\b/i,
      /\bdatadog\b/i,
      /\bnewrelic\b/i,
      /\bsentry\b/i,
      /\bsplunk\b/i,
      /\bdynatrace\b/i,
    ],
    category: 'service',
    color: 'slate',
    lucideFallback: 'activity',
    extractQuery: createExtractQuery(/(prometheus|jaeger|opentelemetry|grafana|datadog|newrelic|sentry|splunk|dynatrace)/i),
  },
  {
    patterns: [
      /\bcosmos\s*db\b/i,
      /\bazure\s*cosmos\b/i,
      /\bazure\s*sql\b/i,
      /\bazure\s*postgres\b/i,
      /\bazure\s*mysql\b/i,
    ],
    category: 'database',
    color: 'violet',
    lucideFallback: 'database',
    extractQuery: createExtractQuery(/(azure-cosmos-db|cosmos|azure-database-postgresql|azure-database-mysql|azure-sql)/i),
  },
  {
    patterns: [
      /\bservice\s*bus\b/i,
      /\bevent\s*hub(?:s)?\b/i,
      /\bevent\s*grid\b/i,
    ],
    category: 'queue',
    color: 'amber',
    lucideFallback: 'layers',
    extractQuery: createExtractQuery(/(azure-service-bus|event-hubs|event-grid)/i),
  },
  {
    patterns: [
      /\bazure\s*functions?\b/i,
      /\bazure\s*container\s*apps?\b/i,
      /\bcontainer\s*apps?\b/i,
      /\bazure\s*openai\b/i,
      /\bazure\s*monitor\b/i,
      /\bazure\s*devops\b/i,
      /\bapi\s*management\b/i,
      /\bapim\b/i,
      /\bcognitive\s*services?\b/i,
      /\bfront\s*door\b/i,
    ],
    category: 'service',
    color: 'blue',
    lucideFallback: 'server',
    extractQuery: createExtractQuery(/(azure-functions|container-apps|azure-openai|azure-monitor|azure-devops|api-management|cognitive-services|front-door)/i),
  },
  {
    patterns: [
      /\bkey\s*vault\b/i,
      /\bazure\s*key\s*vault\b/i,
      /\bvault\b/i,
    ],
    category: 'auth',
    color: 'amber',
    lucideFallback: 'key-round',
    extractQuery: createExtractQuery(/(key-vault|vault)/i),
  },
  {
    patterns: [
      /\bazure\s*blob\b/i,
      /\bazure\s*storage\b/i,
    ],
    category: 'storage',
    color: 'yellow',
    lucideFallback: 'folder',
    extractQuery: createExtractQuery(/(azure-blob|blob-block|azure-storage)/i),
  },
];

const DEFAULT_HINT: SemanticHint = {
  category: 'process',
  color: 'slate',
  iconQuery: '',
  lucideFallback: 'box',
};

export function classifyNode(node: { id: string; label: string; shape?: string }): SemanticHint {
  if (node.shape === 'diamond') {
    return { category: 'decision', color: 'amber', iconQuery: '', lucideFallback: 'help-circle' };
  }

  if (node.shape === 'cylinder') {
    const text = `${node.id} ${node.label}`;
    const m = text.match(/(postgres(?:ql)?|mysql|mongo(?:db)?|redis|dynamodb|aurora)/i);
    return {
      category: 'database',
      color: 'violet',
      iconQuery: m ? m[1] : '',
      lucideFallback: 'database',
    };
  }

  const text = `${node.id} ${node.label}`;

  for (const rule of RULES) {
    if (rule.patterns.some((p) => p.test(text))) {
      const iconQuery = rule.extractQuery ? rule.extractQuery(text, node.id) : '';
      return {
        category: rule.category,
        color: rule.color,
        iconQuery,
        lucideFallback: rule.lucideFallback,
      };
    }
  }

  return DEFAULT_HINT;
}

function normalizeIconQueryForGuard(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function isCommonEnglishIconTerm(value: string): boolean {
  const normalized = normalizeIconQueryForGuard(value);
  if (!normalized) {
    return true;
  }
  return COMMON_ENGLISH_ICON_TERMS.has(normalized);
}

export function isSpecificTechnologyIconQuery(value: string): boolean {
  const normalized = normalizeIconQueryForGuard(value);
  if (!normalized || isCommonEnglishIconTerm(normalized)) {
    return false;
  }
  return SPECIFIC_TECHNOLOGY_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function classifyNodes(
  nodes: Array<{ id: string; label: string; shape?: string }>
): Map<string, SemanticHint> {
  const results = new Map<string, SemanticHint>();
  for (const node of nodes) {
    results.set(node.id, classifyNode(node));
  }
  return results;
}
