// Auto icons: a node's label (and `tech:` when the family has one) names the
// technology it stands for, so the compiler can put that technology's icon on
// it. Precision beats recall: a wrong logo is worse than no logo, so only
// curated, unambiguous names match, as whole words, and generic concepts
// ("database", "users") only on short noun labels.
// ponytail: hand-curated table, ~200 names — grow it from real misses, or back
// it with the catalog's label index once the table stops being enough.

/**
 * Tiers, strongest first: a concrete technology ("Postgres") beats the
 * platform it runs on ("on AWS"), which beats a concept ("database"), which
 * beats a generic box word ("service"). Named things lead the label, so the
 * leftmost technology wins; concepts are compounds, so the head noun (the
 * rightmost) wins.
 */
type Tier = 0 | 1 | 2 | 3;

// [icon id, ...names]. Names are lowercase and matched as whole words;
// punctuation inside a name (node.js, c#, pub/sub) is part of it.
const TECH: readonly (readonly string[])[] = [
  // Databases and data stores
  ['developer/database-postgresql', 'postgres', 'postgresql', 'postgre sql', 'psql'],
  ['developer/database-mysql', 'mysql'],
  ['developer/database-mariadb', 'mariadb'],
  ['developer/database-mongodb', 'mongo', 'mongodb', 'mongo db'],
  ['developer/database-redis', 'redis', 'valkey'],
  ['developer/database-microsoft-sql-server', 'sql server', 'mssql', 'ms sql'],
  ['developer/database-oracle', 'oracle db', 'oracle database'],
  ['developer/database-clickhouse', 'clickhouse'],
  ['developer/database-cockroachdb', 'cockroachdb', 'cockroach db'],
  ['developer/database-couchdb', 'couchdb'],
  ['developer/database-couchbase', 'couchbase'],
  ['developer/database-duckdb', 'duckdb'],
  ['developer/database-influxdb', 'influxdb'],
  ['developer/database-neo4j', 'neo4j'],
  ['developer/database-scylladb', 'scylladb', 'scylla'],
  ['developer/database-supabase', 'supabase'],
  ['developer/database-firebase', 'firebase', 'firestore'],
  ['developer/others-cassandradb', 'cassandra'],
  ['developer/others-faunadb', 'faunadb'],
  ['developer/others-prisma', 'prisma'],
  ['developer/database-kibana', 'kibana'],
  ['developer/devops-ai-ml-elastic', 'elasticsearch', 'elastic search', 'elk'],
  ['tabler/brand-planetscale', 'planetscale'],
  ['tabler/brand-snowflake', 'snowflake'],
  ['developer/analytics-databricks', 'databricks'],
  ['developer/analytics-spark', 'spark', 'apache spark', 'pyspark'],
  ['developer/analytics-flink', 'flink'],
  ['developer/analytics-hadoop', 'hadoop', 'hdfs'],
  ['developer/analytics-trino', 'trino'],
  ['developer/devops-ai-ml-airflow', 'airflow'],
  ['developer/devops-ai-ml-minio', 'minio'],
  // Messaging
  ['developer/others-kafka', 'kafka', 'apache kafka'],
  ['developer/queue-rabbitmq', 'rabbitmq', 'rabbit mq'],
  ['developer/queue-nats', 'nats'],
  ['developer/queue-celery', 'celery'],
  ['developer/devops-ai-ml-temporal', 'temporal.io'],
  // Frontend
  ['developer/frontend-reactjs', 'react', 'react.js', 'reactjs', 'react native'],
  ['developer/frontend-nextjs', 'next.js', 'nextjs'],
  ['developer/frontend-vuejs', 'vue', 'vue.js', 'vuejs'],
  ['developer/frontend-nuxtjs', 'nuxt', 'nuxt.js', 'nuxtjs'],
  ['developer/frontend-angular', 'angular', 'angularjs'],
  ['developer/frontend-sveltejs', 'svelte', 'sveltekit'],
  ['developer/frontend-astro', 'astro'],
  ['developer/frontend-remix-dark', 'remix'],
  ['developer/frontend-gatsby', 'gatsby'],
  ['developer/frontend-preact', 'preact'],
  ['developer/others-solidjs', 'solidjs', 'solid.js'],
  ['developer/others-qwik', 'qwik'],
  ['developer/frontend-vitejs', 'vite'],
  ['developer/frontend-webpack', 'webpack'],
  ['developer/frontend-tailwindcss', 'tailwind', 'tailwindcss'],
  ['developer/frontend-threejs-dark', 'three.js', 'threejs'],
  ['developer/others-electron', 'electron'],
  ['developer/native-app-flutter', 'flutter'],
  ['developer/others-ionic', 'ionic'],
  // Backend frameworks and runtimes
  ['developer/backend-nodejs', 'node.js', 'nodejs', 'node js'],
  ['developer/backend-deno', 'deno'],
  ['developer/backend-bunjs', 'bun.js', 'bunjs'],
  ['developer/backend-nestjs', 'nestjs', 'nest.js'],
  ['developer/others-expressjs-dark', 'express.js', 'expressjs'],
  ['developer/backend-graphql', 'graphql', 'apollo'],
  ['developer/backend-trpc', 'trpc'],
  ['developer/others-django', 'django'],
  ['developer/others-flask-dark', 'flask'],
  ['developer/others-fast-api', 'fastapi', 'fast api'],
  ['developer/others-rails', 'rails', 'ruby on rails'],
  ['developer/others-laravel', 'laravel'],
  ['developer/backend-spring', 'spring boot', 'springboot'],
  ['developer/backend-dotnet', '.net', 'dotnet', 'asp.net'],
  ['developer/backend-convex', 'convex'],
  ['developer/others-appwrite', 'appwrite'],
  // Languages
  ['developer/languages-python', 'python'],
  ['developer/languages-typescript', 'typescript'],
  ['developer/languages-javascript', 'javascript'],
  ['developer/languages-java', 'java'],
  ['developer/others-go', 'golang'],
  ['developer/languages-rust-dark', 'rust'],
  ['developer/languages-kotlin', 'kotlin'],
  ['developer/languages-swift', 'swift', 'swiftui'],
  ['developer/languages-php', 'php'],
  ['developer/languages-ruby', 'ruby'],
  ['developer/languages-elixir', 'elixir'],
  ['developer/languages-scala', 'scala'],
  ['developer/languages-cpp', 'c++'],
  ['developer/others-c-sharp', 'c#'],
  // Infra, DevOps, observability
  ['developer/devops-ai-ml-docker', 'docker', 'docker compose'],
  ['developer/devops-ai-ml-kubernetes', 'kubernetes', 'k8s'],
  ['cncf/projects-helm', 'helm'],
  ['developer/devops-ai-ml-argocd', 'argocd', 'argo cd'],
  ['developer/infra-nginx', 'nginx'],
  ['developer/infra-traefik', 'traefik'],
  ['developer/infra-envoy', 'envoy'],
  ['developer/infra-istio', 'istio'],
  ['developer/infra-kong', 'kong'],
  ['developer/infra-caddy', 'caddy'],
  ['developer/infra-consul', 'consul'],
  ['developer/infra-etcd', 'etcd'],
  ['developer/others-terraform', 'terraform', 'opentofu'],
  ['developer/devops-ai-ml-pulumi', 'pulumi'],
  ['developer/devops-ai-ml-ansible', 'ansible'],
  ['developer/devops-ai-ml-vault', 'hashicorp vault'],
  ['developer/monitoring-prometheus', 'prometheus'],
  ['developer/others-grafana', 'grafana'],
  ['developer/monitoring-datadog', 'datadog'],
  ['developer/monitoring-sentry', 'sentry'],
  ['developer/monitoring-newrelic', 'new relic', 'newrelic'],
  ['developer/monitoring-jaeger', 'jaeger'],
  ['developer/monitoring-splunk', 'splunk'],
  ['cncf/projects-opentelemetry', 'opentelemetry', 'otel'],
  ['developer/others-jenkins', 'jenkins'],
  ['developer/others-circleci', 'circleci', 'circle ci'],
  ['developer/devops-ai-ml-github-dark', 'github', 'github actions'],
  ['developer/devops-ai-ml-gitlab', 'gitlab'],
  ['developer/devops-ai-ml-bitbucket', 'bitbucket'],
  // Identity and SaaS
  ['developer/devops-ai-ml-keycloak', 'keycloak'],
  ['developer/others-auth0', 'auth0'],
  ['tabler/brand-stripe', 'stripe'],
  ['tabler/brand-paypal', 'paypal'],
  ['tabler/brand-twilio', 'twilio'],
  ['tabler/brand-mailgun', 'mailgun'],
  ['developer/others-slack', 'slack'],
  ['developer/others-discord', 'discord'],
  ['developer/productivity-notion', 'notion'],
  ['developer/others-jira', 'jira'],
  ['developer/design-figma', 'figma'],
  ['tabler/brand-mixpanel', 'mixpanel'],
  // AI
  ['developer/devops-ai-ml-openai', 'openai', 'gpt', 'gpt-4', 'gpt-4o', 'chatgpt'],
  ['developer/others-claude-ai', 'claude', 'anthropic'],
  ['developer/gcp-gemini', 'gemini'],
  ['developer/others-deepseek', 'deepseek'],
  ['developer/devops-ai-ml-hugging-face', 'hugging face', 'huggingface'],
  ['developer/others-pytorch', 'pytorch'],
  ['developer/devops-ai-ml-tensorflow', 'tensorflow'],
  ['developer/devops-ai-ml-mlflow', 'mlflow'],
  // AWS services
  ['aws/compute-lambda', 'lambda', 'aws lambda', 'lambda function', 'lambda functions'],
  ['aws/storage-simple-storage-service', 's3', 'aws s3', 'amazon s3', 's3 bucket'],
  ['aws/databases-dynamodb', 'dynamodb', 'dynamo db'],
  ['aws/databases-rds', 'rds', 'amazon rds', 'aws rds'],
  ['aws/databases-aurora', 'aurora'],
  ['aws/databases-elasticache', 'elasticache'],
  ['aws/compute-ec2', 'ec2', 'amazon ec2'],
  ['aws/containers-elastic-container-service', 'ecs', 'amazon ecs'],
  ['aws/containers-elastic-kubernetes-service', 'eks', 'amazon eks'],
  ['aws/containers-fargate', 'fargate'],
  ['aws/compute-app-runner', 'app runner'],
  ['aws/application-integration-simple-queue-service', 'sqs', 'amazon sqs', 'aws sqs'],
  ['aws/application-integration-simple-notification-service', 'sns', 'amazon sns', 'aws sns'],
  ['aws/application-integration-eventbridge', 'eventbridge', 'event bridge'],
  ['aws/application-integration-step-functions', 'step functions'],
  ['aws/networking-content-delivery-cloudfront', 'cloudfront'],
  ['aws/networking-content-delivery-api-gateway', 'aws api gateway', 'amazon api gateway'],
  ['aws/networking-content-delivery-route-53', 'route 53', 'route53'],
  ['aws/networking-content-delivery-elastic-load-balancing', 'elb', 'alb', 'nlb', 'elastic load balancer'],
  ['aws/security-identity-cognito', 'cognito'],
  ['aws/security-identity-secrets-manager', 'secrets manager'],
  ['aws/security-identity-waf', 'aws waf'],
  ['aws/management-tools-cloudwatch', 'cloudwatch'],
  ['aws/analytics-kinesis', 'kinesis'],
  ['aws/analytics-redshift', 'redshift'],
  ['aws/analytics-athena', 'athena'],
  ['aws/analytics-glue', 'aws glue'],
  ['aws/analytics-opensearch-service', 'opensearch'],
  ['aws/artificial-intelligence-sagemaker-ai', 'sagemaker'],
  ['aws/artificial-intelligence-bedrock', 'bedrock'],
  ['aws/business-applications-simple-email-service', 'ses', 'amazon ses'],
  ['aws/front-end-web-mobile-amplify', 'aws amplify'],
  // Azure services
  ['azure/other-storage-functions', 'azure functions', 'azure function'],
  ['azure/databases-azure-cosmos-db', 'cosmos db', 'cosmosdb', 'cosmos'],
  ['azure/databases-sql-database', 'azure sql'],
  ['azure/storage-storage-accounts', 'blob storage', 'azure blob', 'azure storage'],
  ['azure/integration-azure-service-bus', 'service bus', 'azure service bus'],
  ['azure/analytics-event-hubs', 'event hubs', 'event hub'],
  ['azure/app-services-app-services', 'app service', 'azure app service'],
  ['azure/containers-kubernetes-services', 'aks', 'azure kubernetes service'],
  ['azure/other-container-apps-environments', 'container apps', 'azure container apps'],
  ['azure/ai-plus-machine-learning-azure-openai', 'azure openai'],
  ['azure/security-key-vaults', 'key vault', 'azure key vault'],
  ['azure/identity-entra-connect', 'entra', 'entra id', 'azure ad', 'active directory'],
  ['azure/networking-front-door-and-cdn-profiles', 'front door', 'azure front door'],
  ['azure/integration-api-management-services', 'azure api management', 'apim'],
  ['azure/monitor-application-insights', 'application insights', 'app insights'],
  ['azure/databases-cache-redis', 'azure cache for redis'],
  // Google Cloud services
  ['gcp/core-bigquery', 'bigquery', 'big query'],
  ['gcp/core-pubsub', 'pub/sub', 'pubsub', 'cloud pub/sub'],
  ['gcp/core-cloud-storage', 'cloud storage', 'gcs', 'google cloud storage'],
  ['gcp/core-cloud-spanner', 'spanner', 'cloud spanner'],
  ['gcp/core-dataflow', 'dataflow'],
  ['gcp/core-dataproc', 'dataproc'],
  ['gcp/core-cloud-composer', 'cloud composer'],
  ['gcp/core-looker', 'looker'],
];

const PLATFORM: readonly (readonly string[])[] = [
  ['developer/devops-ai-ml-aws', 'aws', 'amazon web services'],
  ['developer/others-azure', 'azure', 'microsoft azure'],
  ['gcp/core-google-cloud', 'gcp', 'google cloud', 'google cloud platform'],
  ['developer/devops-ai-ml-cloudflare', 'cloudflare', 'cloudflare workers', 'cloudflare pages', 'workers kv', 'cloudflare r2'],
  ['developer/devops-ai-ml-vercel-dark', 'vercel'],
  ['developer/devops-ai-ml-netlify', 'netlify'],
  ['developer/devops-ai-ml-heroku', 'heroku'],
  ['developer/others-flyio', 'fly.io', 'flyio'],
  ['developer/devops-ai-ml-digitalocean', 'digitalocean', 'digital ocean'],
  ['developer/devops-ai-ml-linux', 'linux'],
  ['developer/others-ubuntu', 'ubuntu'],
  ['developer/native-app-android', 'android'],
  ['tabler/brand-apple', 'ios', 'iphone', 'macos'],
  ['tabler/brand-windows', 'windows server', 'windows pc'],
  ['developer/browser-chrome', 'chrome'],
  ['developer/browser-safari', 'safari'],
  ['developer/browser-firefox', 'firefox'],
];

// Generic concepts, neutral Tabler glyphs. Only on short, noun-led labels,
// and the head noun wins ("Orders DB" is a database, "Payment Service" a card).
const CONCEPT: readonly (readonly string[])[] = [
  ['tabler/database', 'database', 'databases', 'db', 'datastore', 'data store', 'sql', 'sql database', 'replica'],
  ['tabler/bolt', 'cache', 'caching', 'cache layer'],
  ['tabler/stack-2', 'queue', 'queues', 'message queue', 'job queue', 'task queue', 'message broker', 'broker', 'event bus'],
  ['tabler/api', 'api gateway', 'gateway'],
  ['tabler/browser', 'frontend', 'front end', 'web app', 'webapp', 'website', 'web client', 'browser', 'spa', 'web ui', 'dashboard', 'client', 'clients'],
  ['tabler/device-mobile', 'mobile', 'mobile app', 'ios app', 'android app', 'phone'],
  ['tabler/device-desktop', 'desktop', 'desktop app'],
  ['tabler/user', 'user', 'customer', 'end user', 'visitor'],
  ['tabler/users', 'users', 'customers', 'team', 'visitors'],
  ['tabler/user-shield', 'admin', 'admins', 'administrator'],
  ['tabler/lock', 'auth', 'authentication', 'auth service', 'identity', 'sso', 'iam', 'authorization'],
  ['tabler/key', 'secrets', 'secret store', 'kms', 'vault'],
  ['tabler/shield', 'firewall', 'waf', 'security'],
  ['tabler/arrows-split', 'load balancer', 'lb', 'balancer', 'reverse proxy', 'proxy'],
  ['tabler/world', 'cdn', 'internet', 'dns'],
  ['tabler/cloud', 'cloud'],
  ['tabler/folder', 'storage', 'object storage', 'file storage', 'blob', 'bucket', 'files', 'file system'],
  ['tabler/file-text', 'file', 'document', 'documents', 'pdf'],
  ['tabler/mail', 'email', 'e-mail', 'mail', 'smtp'],
  ['tabler/bell', 'notification', 'notifications', 'alerts', 'alerting'],
  ['tabler/credit-card', 'payment', 'payments', 'billing', 'checkout'],
  ['tabler/shopping-cart', 'cart', 'shop', 'storefront', 'orders'],
  ['tabler/search', 'search', 'search index'],
  ['tabler/chart-bar', 'analytics', 'metrics', 'reporting', 'reports', 'bi'],
  ['tabler/activity', 'monitoring', 'observability', 'logging', 'logs', 'tracing'],
  ['tabler/brain', 'ml', 'machine learning', 'ai', 'llm', 'inference'],
  ['tabler/robot', 'bot', 'chatbot', 'agent', 'agents'],
  ['tabler/message', 'chat', 'messaging', 'sms'],
  ['tabler/webhook', 'webhook', 'webhooks'],
  ['tabler/clock', 'cron', 'scheduler', 'cron job', 'scheduled job'],
  ['tabler/git-branch', 'git', 'repo', 'repository'],
  ['tabler/rocket', 'ci', 'ci/cd', 'cicd', 'ci pipeline', 'deploy', 'deployment'],
  ['tabler/package', 'container', 'containers', 'artifact', 'registry'],
];

// Words that name a box without saying what it does: they only win alone.
const GENERIC: readonly (readonly string[])[] = [
  ['tabler/server', 'server', 'servers', 'backend', 'back end', 'api server', 'app server', 'web server', 'worker', 'workers', 'microservice', 'microservices', 'service', 'services'],
  ['tabler/api', 'api', 'apis', 'rest api', 'graphql api'],
];

// A flowchart step reads "Validate user", not "User": when the label opens
// with one of these verbs it is an action, and a generic concept is noise.
// ponytail: fixed verb list — swap for a part-of-speech check if steps slip through.
const ACTION_VERBS = new Set([
  'add', 'approve', 'ask', 'authenticate', 'build', 'call', 'cancel', 'charge', 'check', 'choose', 'click', 'close',
  'collect', 'compute', 'confirm', 'create', 'decide', 'delete', 'deploy', 'display', 'do', 'download', 'edit',
  'emit', 'enter', 'fetch', 'fill', 'find', 'generate', 'get', 'handle', 'init', 'initialize', 'insert', 'invoke',
  'is', 'load', 'log', 'login', 'logout', 'look', 'notify', 'open', 'parse', 'pay', 'persist', 'place', 'poll',
  'post', 'process', 'publish', 'push', 'put', 'query', 'read', 'receive', 'redirect', 'refresh', 'register',
  'reject', 'remove', 'render', 'request', 'retry', 'return', 'review', 'run', 'save', 'scan', 'select',
  'send', 'set', 'show', 'sign', 'start', 'stop', 'store', 'submit', 'subscribe', 'sync', 'track', 'transform',
  'trigger', 'update', 'upload', 'validate', 'verify', 'view', 'wait', 'write',
]);

// Longest concept label worth an icon; longer labels are sentences, not names.
const CONCEPT_MAX_WORDS = 4;

interface Rule { readonly icon: string; readonly name: string; readonly tier: Tier }

const RULES: readonly Rule[] = ([[TECH, 0], [PLATFORM, 1], [CONCEPT, 2], [GENERIC, 3]] as const).flatMap(([table, tier]) =>
  table.flatMap(([icon, ...names]) => names.map((name) => ({ icon: icon!, name, tier }))));

/**
 * Shapes that stand for a thing (a service, a store). Decisions, terminals,
 * people and notes keep their shape: an icon card would erase what it says.
 */
export const AUTO_ICON_SHAPES: ReadonlySet<string> = new Set(['rect', 'rounded', 'cylinder', 'queue', 'component', 'hexagon', 'cloud']);

/** Every icon id the table can produce, so a test can prove each still resolves. */
export const AUTO_ICON_IDS: readonly string[] = [...new Set(RULES.map((rule) => rule.icon))];

function words(text: string): string[] {
  return text.toLowerCase()
    .replace(/[^a-z0-9.+#/\- ]+/g, ' ')
    .split(/\s+/)
    // Sentence punctuation is not part of a name: "Postgres." / "(Redis)".
    .map((word) => word.replace(/[.\-/]+$/, '').replace(word.startsWith('.net') ? /^[-/]+/ : /^[.\-/]+/, ''))
    .filter(Boolean);
}

/**
 * The icon id a label names, or null. `hint` is a stronger, more specific
 * text (a `tech:` value) checked first.
 */
export function inferIcon(label: string, hint?: string): string | null {
  for (const text of hint ? [hint, label] : [label]) {
    const found = bestMatch(text);
    if (found) return found;
  }
  return null;
}

function bestMatch(text: string): string | null {
  const tokens = words(text);
  if (!tokens.length) return null;
  const haystack = ` ${tokens.join(' ')} `;
  // "Load balancer" opens with a verb but is a noun: a multiword concept that
  // starts the label outranks the verb check.
  const nounLed = !ACTION_VERBS.has(tokens[0]!)
    || RULES.some((rule) => rule.tier >= 2 && rule.name.includes(' ') && haystack.startsWith(` ${rule.name} `));
  const conceptsAllowed = tokens.length <= CONCEPT_MAX_WORDS && nounLed;
  let best: { rule: Rule; at: number } | null = null;
  for (const rule of RULES) {
    if (rule.tier >= 2 && !conceptsAllowed) continue;
    const found = haystack.indexOf(` ${rule.name} `);
    if (found < 0) continue;
    // Compare where the name ends for head nouns, so "load balancer" and
    // "balancer" tie and the longer name's position counts.
    const at = rule.tier >= 2 ? -(found + rule.name.length) : found;
    if (!best || rule.tier < best.rule.tier
      || (rule.tier === best.rule.tier && (at < best.at || (at === best.at && rule.name.length > best.rule.name.length)))) {
      best = { rule, at };
    }
  }
  return best?.rule.icon ?? null;
}
