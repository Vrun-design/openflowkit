import type {
  CloudPlatform,
  DetectedService,
  DetectedServiceProvider,
  DetectedServiceType,
  SuggestedArchitectureResourceType,
  SuggestedNodeColor,
} from './types';

interface DetectionRule {
  name: string;
  type: DetectedServiceType;
  provider: DetectedServiceProvider;
  resourceType?: SuggestedArchitectureResourceType;
  suggestedColor?: SuggestedNodeColor;
  patterns: RegExp[];
}

const SERVICE_DETECTION_RULES: DetectionRule[] = [
  {
    name: 'PostgreSQL',
    type: 'database',
    provider: 'unknown',
    resourceType: 'database',
    patterns: [/\bpsycopg\b/i, /\bpostgres\b/i, /\bpostgresql\b/i, /\bpg\b/i],
  },
  {
    name: 'MySQL',
    type: 'database',
    provider: 'unknown',
    resourceType: 'database',
    patterns: [/\bmysql2?\b/i, /\bpymysql\b/i],
  },
  {
    name: 'MongoDB',
    type: 'database',
    provider: 'unknown',
    resourceType: 'database',
    patterns: [/\bmongodb\b/i, /\bmongoose\b/i],
  },
  {
    name: 'Redis',
    type: 'cache',
    provider: 'unknown',
    resourceType: 'service',
    suggestedColor: 'yellow',
    patterns: [/\bioredis\b/i, /\bredis\b/i],
  },
  {
    name: 'Kafka',
    type: 'messaging',
    provider: 'unknown',
    resourceType: 'queue',
    patterns: [/\bkafkajs\b/i, /\bconfluent-kafka\b/i, /\bkafka-python\b/i],
  },
  {
    name: 'RabbitMQ',
    type: 'queue',
    provider: 'unknown',
    resourceType: 'queue',
    patterns: [/\bamqplib\b/i, /\bpika\b/i],
  },
  {
    name: 'S3',
    type: 'storage',
    provider: 'aws',
    resourceType: 'service',
    patterns: [/\bS3Client\b/, /\bs3\b/i, /\bboto3\b/i],
  },
  {
    name: 'CloudFront',
    type: 'network',
    provider: 'aws',
    resourceType: 'cdn',
    patterns: [/\bcloudfront\b/i],
  },
  {
    name: 'RDS',
    type: 'database',
    provider: 'aws',
    resourceType: 'database',
    patterns: [/\bRDS\b/, /\brds\b/i],
  },
  {
    name: 'DynamoDB',
    type: 'database',
    provider: 'aws',
    resourceType: 'database',
    patterns: [/\bDynamoDB\b/, /\bdynamodb\b/i],
  },
  {
    name: 'Lambda',
    type: 'compute',
    provider: 'aws',
    resourceType: 'service',
    patterns: [/\bLambda\b/, /@aws-sdk\/client-lambda/, /\blambda\b/i],
  },
  {
    name: 'API Gateway',
    type: 'api',
    provider: 'aws',
    resourceType: 'service',
    patterns: [/\bapigateway\b/i, /\bapi gateway\b/i],
  },
  {
    name: 'ElastiCache',
    type: 'cache',
    provider: 'aws',
    resourceType: 'service',
    suggestedColor: 'yellow',
    patterns: [/\belasticache\b/i],
  },
  {
    name: 'SQS',
    type: 'queue',
    provider: 'aws',
    resourceType: 'queue',
    patterns: [/\bSQS\b/, /\bsqs\b/i],
  },
  {
    name: 'SNS',
    type: 'messaging',
    provider: 'aws',
    resourceType: 'queue',
    patterns: [/\bSNS\b/, /\bsns\b/i],
  },
  {
    name: 'EventBridge',
    type: 'messaging',
    provider: 'aws',
    resourceType: 'queue',
    patterns: [/\beventbridge\b/i],
  },
  {
    name: 'ECS',
    type: 'compute',
    provider: 'aws',
    resourceType: 'service',
    patterns: [/\baws ecs\b/i, /\becs\b/i, /ecsTaskDefinition/i],
  },
  {
    name: 'EKS',
    type: 'compute',
    provider: 'aws',
    resourceType: 'service',
    patterns: [/\baws eks\b/i, /\beks\b/i],
  },
  {
    name: 'Cognito',
    type: 'identity',
    provider: 'aws',
    resourceType: 'service',
    patterns: [/\bCognito\b/, /\bcognito\b/i],
  },
  {
    name: 'Azure Functions',
    type: 'compute',
    provider: 'azure',
    resourceType: 'service',
    patterns: [/@azure\/functions/i, /\bfunctionapp\b/i, /\bazure functions\b/i],
  },
  {
    name: 'Azure SQL',
    type: 'database',
    provider: 'azure',
    resourceType: 'database',
    patterns: [/\bazure sql\b/i, /\bmssql\b/i],
  },
  {
    name: 'Azure Storage',
    type: 'storage',
    provider: 'azure',
    resourceType: 'service',
    patterns: [/\bblob storage\b/i, /@azure\/storage/i],
  },
  {
    name: 'Azure API Management',
    type: 'api',
    provider: 'azure',
    resourceType: 'service',
    patterns: [/\bapi management\b/i, /api-management-services/i],
  },
  {
    name: 'Azure Front Door',
    type: 'network',
    provider: 'azure',
    resourceType: 'cdn',
    patterns: [/\bfront door\b/i, /front-door-and-cdn-profiles/i],
  },
  {
    name: 'Azure Service Bus',
    type: 'messaging',
    provider: 'azure',
    resourceType: 'queue',
    patterns: [/\bservice bus\b/i, /@azure\/service-bus/i],
  },
  {
    name: 'AKS',
    type: 'compute',
    provider: 'azure',
    resourceType: 'service',
    patterns: [/\bazure kubernetes service\b/i, /\baks\b/i],
  },
  {
    name: 'Cloud Storage',
    type: 'storage',
    provider: 'gcp',
    resourceType: 'service',
    patterns: [/@google-cloud\/storage/, /\bcloud storage\b/i],
  },
  {
    name: 'Cloud SQL',
    type: 'database',
    provider: 'gcp',
    resourceType: 'database',
    patterns: [/\bcloud sql\b/i, /@google-cloud\/sql/i],
  },
  {
    name: 'Cloud Run',
    type: 'compute',
    provider: 'gcp',
    resourceType: 'service',
    patterns: [/\bcloud run\b/i],
  },
  {
    name: 'Cloud Functions',
    type: 'compute',
    provider: 'gcp',
    resourceType: 'service',
    patterns: [/@google-cloud\/functions/i, /\bcloud functions?\b/i],
  },
  {
    name: 'Pub/Sub',
    type: 'messaging',
    provider: 'gcp',
    resourceType: 'queue',
    patterns: [/@google-cloud\/pubsub/i, /\bpubsub\b/i, /\bpub\/sub\b/i],
  },
  {
    name: 'BigQuery',
    type: 'database',
    provider: 'gcp',
    resourceType: 'database',
    patterns: [/@google-cloud\/bigquery/i, /\bbigquery\b/i],
  },
  {
    name: 'Kubernetes',
    type: 'compute',
    provider: 'cncf',
    resourceType: 'service',
    patterns: [/\bapiVersion:\s*apps\//i, /\bkind:\s*Deployment\b/i, /\bkubernetes\b/i, /\bkubectl\b/i],
  },
  {
    name: 'Docker Compose',
    type: 'compute',
    provider: 'docker',
    resourceType: 'service',
    patterns: [/\bservices:\b/i, /\bimage:\b/i, /\bdocker-compose\b/i],
  },
  {
    name: 'Stripe',
    type: 'api',
    provider: 'third-party',
    resourceType: 'service',
    suggestedColor: 'pink',
    patterns: [/\bstripe\b/i],
  },
];

const INFRA_FILE_SUFFIXES = ['.tf', '.tfvars', '.tfstate', 'compose.yaml', 'compose.yml', 'chart.yaml'] as const;
const INFRA_PATH_SNIPPETS = ['docker-compose'] as const;
const STRUCTURED_INFRA_CONTENT = /\bapiVersion:\b|\bkind:\b|\bterraform_version\b|\bresources\b/;

const PROVIDER_ICON_PACK_IDS = {
  aws: 'aws-official-starter-v1',
  azure: 'azure-official-icons-v20',
  cncf: 'cncf-artwork-icons-v1',
} as const satisfies Partial<Record<DetectedServiceProvider, string>>;

const SERVICE_ICON_HINTS: Partial<
  Record<
    DetectedServiceProvider,
    Partial<Record<string, { packId: string; shapeId: string }>>
  >
> = {
  aws: {
    'API Gateway': {
      packId: 'aws-official-starter-v1',
      shapeId: 'networking-content-delivery-api-gateway',
    },
    CloudFront: {
      packId: 'aws-official-starter-v1',
      shapeId: 'networking-content-delivery-cloudfront',
    },
    Cognito: {
      packId: 'aws-official-starter-v1',
      shapeId: 'security-identity-cognito',
    },
    DynamoDB: { packId: 'aws-official-starter-v1', shapeId: 'databases-dynamodb' },
    ElastiCache: { packId: 'aws-official-starter-v1', shapeId: 'databases-elasticache' },
    ECS: {
      packId: 'aws-official-starter-v1',
      shapeId: 'containers-elastic-container-service',
    },
    EKS: {
      packId: 'aws-official-starter-v1',
      shapeId: 'containers-elastic-kubernetes-service',
    },
    EventBridge: {
      packId: 'aws-official-starter-v1',
      shapeId: 'application-integration-eventbridge',
    },
    Lambda: { packId: 'aws-official-starter-v1', shapeId: 'compute-lambda' },
    RDS: { packId: 'aws-official-starter-v1', shapeId: 'databases-rds' },
    S3: { packId: 'aws-official-starter-v1', shapeId: 'storage-simple-storage-service' },
    SNS: {
      packId: 'aws-official-starter-v1',
      shapeId: 'application-integration-simple-notification-service',
    },
    SQS: {
      packId: 'aws-official-starter-v1',
      shapeId: 'application-integration-simple-queue-service',
    },
  },
  azure: {
    'Azure Functions': { packId: 'azure-official-icons-v20', shapeId: 'compute-function-apps' },
    AKS: { packId: 'azure-official-icons-v20', shapeId: 'compute-kubernetes-services' },
    'Azure API Management': {
      packId: 'azure-official-icons-v20',
      shapeId: 'web-api-management-services',
    },
    'Azure Front Door': {
      packId: 'azure-official-icons-v20',
      shapeId: 'web-front-door-and-cdn-profiles',
    },
    'Azure Service Bus': {
      packId: 'azure-official-icons-v20',
      shapeId: 'integration-azure-service-bus',
    },
    'Azure SQL': { packId: 'azure-official-icons-v20', shapeId: 'databases-azure-sql' },
    'Azure Storage': {
      packId: 'azure-official-icons-v20',
      shapeId: 'storage-storage-accounts',
    },
  },
  cncf: {
    Kubernetes: { packId: 'cncf-artwork-icons-v1', shapeId: 'projects-clusternet' },
  },
};

function getSuggestedColor(
  type: DetectedServiceType,
  provider: DetectedServiceProvider
): SuggestedNodeColor {
  if (provider === 'third-party') {
    return 'pink';
  }

  switch (type) {
    case 'database':
    case 'storage':
      return 'emerald';
    case 'cache':
      return 'yellow';
    case 'queue':
    case 'messaging':
      return 'amber';
    case 'identity':
      return 'amber';
    case 'network':
      return 'blue';
    case 'api':
    case 'compute':
    case 'service':
      return 'violet';
    case 'observability':
      return 'slate';
    default:
      return 'slate';
  }
}

function getServiceIconHint(
  name: string,
  provider: DetectedServiceProvider
): { iconPackId?: string; iconShapeId?: string } {
  const exactMatch = SERVICE_ICON_HINTS[provider]?.[name];
  if (exactMatch) {
    return {
      iconPackId: exactMatch.packId,
      iconShapeId: exactMatch.shapeId,
    };
  }

  const packId = PROVIDER_ICON_PACK_IDS[provider];
  if (!packId) {
    return {};
  }

  return { iconPackId: packId };
}

function matchesRule(file: { path: string; content: string }, patterns: RegExp[]): boolean {
  const normalizedPath = file.path.toLowerCase();
  return patterns.some((pattern) => pattern.test(file.content) || pattern.test(normalizedPath));
}

function matchesInfraFilePath(normalizedPath: string): boolean {
  return (
    INFRA_FILE_SUFFIXES.some((suffix) => normalizedPath.endsWith(suffix)) ||
    INFRA_PATH_SNIPPETS.some((snippet) => normalizedPath.includes(snippet))
  );
}

export function detectCloudPlatform(files: Array<{ path: string; content: string }>): CloudPlatform {
  const joinedContent = files.map((file) => file.content).join('\n');
  const paths = files.map((file) => file.path.toLowerCase());
  const hits = new Set<Exclude<CloudPlatform, 'mixed' | 'unknown'>>();

  if (/@aws-sdk\/|aws-sdk|boto3|botocore|provider\s+"aws"/i.test(joinedContent)) {
    hits.add('aws');
  }
  if (/@google-cloud|google\.cloud|firebase|provider\s+"google"/i.test(joinedContent)) {
    hits.add('gcp');
  }
  if (/@azure\/|azure-identity|azurerm/i.test(joinedContent)) {
    hits.add('azure');
  }
  if (
    /\bkubernetes\b|\bkubectl\b|\bkind:\s*(Deployment|Service|Ingress|ConfigMap|StatefulSet)\b/i.test(
      joinedContent
    ) ||
    paths.some((path) => path.endsWith('chart.yaml') || path.includes('/charts/'))
  ) {
    hits.add('cncf');
  }
  if (paths.some((path) => path.includes('docker-compose') || path.endsWith('compose.yaml'))) {
    hits.add('docker');
  }

  if (hits.size === 0) {
    return 'unknown';
  }
  if (hits.size === 1) {
    return [...hits][0];
  }
  return 'mixed';
}

export function detectInfraFiles(files: Array<{ path: string; content: string }>): string[] {
  return files
    .filter((file) => {
      const normalizedPath = file.path.toLowerCase();
      if (matchesInfraFilePath(normalizedPath)) {
        return true;
      }

      if (
        normalizedPath.endsWith('.yaml') ||
        normalizedPath.endsWith('.yml') ||
        normalizedPath.endsWith('.json')
      ) {
        return STRUCTURED_INFRA_CONTENT.test(file.content);
      }

      return false;
    })
    .map((file) => file.path)
    .sort((left, right) => left.localeCompare(right));
}

export function detectServices(files: Array<{ path: string; content: string }>): DetectedService[] {
  const serviceMap = new Map<string, DetectedService>();

  for (const rule of SERVICE_DETECTION_RULES) {
    const evidence = new Set<string>();

    for (const file of files) {
      if (matchesRule(file, rule.patterns)) {
        evidence.add(file.path);
      }
    }

    if (evidence.size === 0) {
      continue;
    }

    serviceMap.set(rule.name, {
      name: rule.name,
      type: rule.type,
      provider: rule.provider,
      resourceType: rule.resourceType ?? 'service',
      suggestedColor: rule.suggestedColor ?? getSuggestedColor(rule.type, rule.provider),
      ...getServiceIconHint(rule.name, rule.provider),
      evidence: [...evidence].sort((left, right) => left.localeCompare(right)).slice(0, 3),
    });
  }

  return [...serviceMap.values()].sort((left, right) => left.name.localeCompare(right.name));
}
