import type { IconChoice } from '../../domain/nodes/iconNode';

export interface FamilySample {
  readonly key: string;
  readonly text: string;
}

export const FAMILY_SAMPLES: readonly FamilySample[] = [
  {
    key: 'flowchart',
    text: `%% ofk 1
flowchart down
title: Flowchart — release decision

Start [ellipse]
Ready [diamond, blue]
Ship [rounded, green]
Fix [rounded, orange]
Done [ellipse]

Start -> Ready : review
Ready -> Ship : yes
Ready -> Fix : no
Fix --> Ready : retry
Ship -> Done
`,
  },
  {
    key: 'flowchart-groups',
    text: `%% ofk 1
flowchart right
title: Flowchart — groups, notes & flags

group Edge [blue] {
  CDN [cloud]
  Gateway [rounded]
  CDN -> Gateway : TLS
}

group Core [violet] {
  API [rounded, shadow]
  Worker [queue, orange]
  Cache [cylinder, teal]
  API --> Worker : jobs
  Worker -> Cache : warm
}

Gateway -> API : route
note Gateway : notes render as stickies
`,
  },
  {
    key: 'architecture',
    text: `%% ofk 1
architecture right
title: Architecture — AWS pipeline

Client [person]
Gateway [aws/api-gateway]
Resize [aws/lambda, green]
Bucket [aws/s3, orange]
Events [aws/eventbridge, violet]

Client -> Gateway : upload
Gateway -> Resize : invoke
Resize -> Bucket : write image
Resize --> Events : publish result
`,
  },
  {
    key: 'sequence',
    text: `%% ofk 1
sequence
title: Sequence — payment retries

participant Client [actor]
Gateway = API Gateway
Bank [db]

Client -> Gateway : pay
alt authorized {
  Gateway -> Bank : charge
  Bank -->> Gateway : ok
} else declined {
  Gateway -->> Client : error
  opt retryable {
    Client -> Gateway : retry
  }
}
loop every 5s {
  Gateway -> Bank : poll
}
note over Gateway : audit logged
`,
  },
  {
    key: 'state',
    text: `%% ofk 1
state
title: State — order lifecycle

[*] -> Idle
Idle -> Running : start
Running -> Done : finish
Running -> Failed : error
Failed --> Retry : retry
Retry -> Running : resumed
Done -> [*]
`,
  },
  {
    key: 'state-controls',
    text: `%% ofk 1
state
title: State — fork, join & choice

[*] -> Start
Start -> Split [fork]
Split -> A : left
Split -> B : right
A -> Merge [join]
B -> Merge [join]
Merge -> Pick [choice]
Pick -> One : a
Pick -> Two : b
One -> [*]
Two -> [*]
`,
  },
  {
    key: 'erd',
    text: `%% ofk 1
erd
title: ERD — shop schema

users [blue] {
  id uuid pk
  email text unique
  "full name" text
}

orders {
  id uuid pk
  user_id uuid fk
  total int not-null
}

products {
  sku text pk
  price int
}

users ||--o{ orders : places
orders }o--|| products : references
`,
  },
  {
    key: 'class',
    text: `%% ofk 1
class down
title: Class — shop domain

Order [interface] {
  +id: UUID
  -items: Item[]
  ---
  +total(): Money
  +save()$
}

Customer [blue] {
  +name: string
  +email: string
  ---
  +orders(): Order[]
}

Item {
  +sku: string
  +price: int
}

Order --|> Entity : extends
Order *-- Item : contains
Customer o-- Order : places
Order ..> Money : depends
`,
  },
  {
    key: 'mindmap',
    text: `%% ofk 1
mindmap
title: Mindmap — product strategy

central: Product
- Growth [green]
  - SEO
  - Referrals [icon: tabler/users]
  - Partnerships
- Retention [blue]
  - Onboarding
  - Notifications
- Platform
  - API
  - Integrations
`,
  },
  {
    key: 'gitgraph',
    text: `%% ofk 1
gitgraph
title: Git graph — release train

commit Initial
commit "Add API" [highlight]
branch feature
commit "Feature work"
checkout main
commit "Fix typo"
merge feature [label: "Merge feature"]
`,
  },
  {
    key: 'wireframe',
    text: `%% ofk 1
wireframe
title: Wireframe — shop app

screen Browse [phone] {
  statusbar
  search: Search products
  segmented: All | Popular | New [active: 0]
  card: "Sneakers · $89"
  tabbar: Shop | Cart | Account [active: 0]
  fab
}
screen Settings [window] {
  breadcrumbs: Home | Account | Settings [active: 2]
  avatar [third]
  input: Display name [two-thirds]
  toggle: Marketing emails [off]
  checkbox: Email me updates [checked]
  button: Save [half, primary]
  button: Discard [half]
}
`,
  },
  {
    key: 'chart',
    text: `%% ofk 1
chart bar
title: Chart family — monthly revenue

Revenue: Jan 12, Feb 19, Mar 9, Apr 22, May 17
Costs: Jan 8, Feb 9, Mar 7, Apr 11, May 12
`,
  },
];

export const C4_WORKSPACE = `%% ofk 1
architecture
title: C4 — shop platform

model {
  person Customer [desc: "Buys things"]
  system Shop [tech: "Go + React"] {
    container Web [tech: React]
    container API [icon: aws/lambda, tech: Go] @core
    store DB [cylinder, tech: Postgres]
    queue Events
  }
  external Stripe
  Customer -> Web : browses
  Web -> API : calls [tech: HTTPS/JSON]
  API -> DB : reads/writes
  API -> Events : publishes
  API -> Stripe : charges
}

deployment Prod {
  node AWS [aws/cloud] {
    node ECS { instance Shop.API }
    node RDS { instance Shop.DB }
  }
  node Browser
}

views {
  view landscape
  view context of Shop
  view container of Shop { exclude Events }
  view component of Shop.Web
  view deployment of Shop in Prod
}

flow "Checkout" {
  step Customer -> Web : opens cart
  alt "paid" {
    step Web -> API : POST /orders
  } else {
    step Web -> Customer : show error
  }
  step API -> DB : write order
  note "Idempotent by order id"
}
`;

export interface StressIcon extends IconChoice {
  /** The id a DSL line would write: `Name [aws/lambda]`. */
  readonly dslId: string;
}

export const STRESS_ICONS: readonly StressIcon[] = [
  { dslId: 'aws/lambda', provider: 'aws', packId: 'aws-official-starter-v1', shapeId: 'compute-lambda', label: 'Lambda' },
  { dslId: 'aws/api-gateway', provider: 'aws', packId: 'aws-official-starter-v1', shapeId: 'networking-content-delivery-api-gateway', label: 'API Gateway' },
  { dslId: 'aws/s3', provider: 'aws', packId: 'aws-official-starter-v1', shapeId: 'storage-simple-storage-service', label: 'S3' },
  { dslId: 'aws/rds', provider: 'aws', packId: 'aws-official-starter-v1', shapeId: 'databases-rds', label: 'RDS' },
  { dslId: 'aws/ec2', provider: 'aws', packId: 'aws-official-starter-v1', shapeId: 'compute-ec2', label: 'EC2' },
  { dslId: 'aws/cloudfront', provider: 'aws', packId: 'aws-official-starter-v1', shapeId: 'networking-content-delivery-cloudfront', label: 'CloudFront' },
  { dslId: 'aws/sqs', provider: 'aws', packId: 'aws-official-starter-v1', shapeId: 'application-integration-simple-queue-service', label: 'SQS' },
  { dslId: 'aws/eventbridge', provider: 'aws', packId: 'aws-official-starter-v1', shapeId: 'application-integration-eventbridge', label: 'EventBridge' },
  { dslId: 'aws/cloud', provider: 'aws', packId: 'aws-official-starter-v1', shapeId: 'architecture-group-cloud', label: 'AWS Cloud' },
  { dslId: 'azure/app-services', provider: 'azure', packId: 'azure-official-icons-v20', shapeId: 'compute-app-services', label: 'App Services' },
  { dslId: 'azure/kubernetes-services', provider: 'azure', packId: 'azure-official-icons-v20', shapeId: 'compute-kubernetes-services', label: 'AKS' },
  { dslId: 'azure/sql-database', provider: 'azure', packId: 'azure-official-icons-v20', shapeId: 'databases-sql-database', label: 'SQL Database' },
  { dslId: 'gcp/cloud-storage', provider: 'gcp', packId: 'gcp-official-icons-v1', shapeId: 'core-cloud-storage', label: 'Cloud Storage' },
  { dslId: 'gcp/bigquery', provider: 'gcp', packId: 'gcp-official-icons-v1', shapeId: 'core-bigquery', label: 'BigQuery' },
  { dslId: 'gcp/cloud', provider: 'gcp', packId: 'gcp-official-icons-v1', shapeId: 'core-google-cloud', label: 'Google Cloud' },
  { dslId: 'cncf/kubernetes', provider: 'cncf', packId: 'cncf-artwork-icons-v1', shapeId: 'projects-kubernetes', label: 'Kubernetes' },
  { dslId: 'cncf/prometheus', provider: 'cncf', packId: 'cncf-artwork-icons-v1', shapeId: 'projects-prometheus', label: 'Prometheus' },
  { dslId: 'cncf/envoy', provider: 'cncf', packId: 'cncf-artwork-icons-v1', shapeId: 'projects-envoy', label: 'Envoy' },
  { dslId: 'developer/react', provider: 'developer', packId: 'developer-icons-v1', shapeId: 'frontend-reactjs', label: 'React' },
  { dslId: 'developer/nodejs', provider: 'developer', packId: 'developer-icons-v1', shapeId: 'backend-nodejs', label: 'Node.js' },
  { dslId: 'developer/docker', provider: 'developer', packId: 'developer-icons-v1', shapeId: 'devops-ai-ml-docker', label: 'Docker' },
  { dslId: 'developer/python', provider: 'developer', packId: 'developer-icons-v1', shapeId: 'languages-python', label: 'Python' },
  { dslId: 'developer/typescript', provider: 'developer', packId: 'developer-icons-v1', shapeId: 'languages-typescript', label: 'TypeScript' },
  { dslId: 'developer/redis', provider: 'developer', packId: 'developer-icons-v1', shapeId: 'database-redis', label: 'Redis' },
  { dslId: 'developer/postgres', provider: 'developer', packId: 'developer-icons-v1', shapeId: 'database-postgresql', label: 'PostgreSQL' },
  { dslId: 'tabler/home', provider: 'tabler', packId: 'tabler-outline-v3', shapeId: 'home', label: 'Home' },
  { dslId: 'tabler/settings', provider: 'tabler', packId: 'tabler-outline-v3', shapeId: 'settings', label: 'Settings' },
  { dslId: 'tabler/user', provider: 'tabler', packId: 'tabler-outline-v3', shapeId: 'user', label: 'User' },
  { dslId: 'tabler/database', provider: 'tabler', packId: 'tabler-outline-v3', shapeId: 'database', label: 'Database' },
  { dslId: 'tabler/cloud', provider: 'tabler', packId: 'tabler-outline-v3', shapeId: 'cloud', label: 'Cloud' },
  { dslId: 'tabler/lock', provider: 'tabler', packId: 'tabler-outline-v3', shapeId: 'lock', label: 'Lock' },
  { dslId: 'tabler/bolt', provider: 'tabler', packId: 'tabler-outline-v3', shapeId: 'bolt', label: 'Bolt' },
  { dslId: 'tabler/search', provider: 'tabler', packId: 'tabler-outline-v3', shapeId: 'search', label: 'Search' },
];

export const STRESS_ICON_RESOLUTIONS: Readonly<Record<string, { packId: string; shapeId: string }>> =
  Object.fromEntries(STRESS_ICONS.map((icon) => [icon.dslId, { packId: icon.packId, shapeId: icon.shapeId }]));

export const IMAGE_DATA_URL =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200">' +
      '<rect width="320" height="200" fill="#eef2ff"/>' +
      '<circle cx="90" cy="80" r="34" fill="#6366f1"/>' +
      '<rect x="150" y="52" width="130" height="16" rx="8" fill="#a5b4fc"/>' +
      '<rect x="150" y="80" width="90" height="16" rx="8" fill="#c7d2fe"/>' +
      '<path d="M40 170 L120 110 L180 150 L240 96 L300 140" fill="none" stroke="#4f46e5" stroke-width="6" stroke-linecap="round"/>' +
      '</svg>'
  );

export const MERMAID_SAMPLE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="120" viewBox="0 0 240 120">' +
  '<rect x="8" y="36" width="96" height="48" rx="8" fill="#f8fafc" stroke="#475569"/>' +
  '<rect x="136" y="36" width="96" height="48" rx="8" fill="#f8fafc" stroke="#475569"/>' +
  '<path d="M104 60 H136" stroke="#475569" stroke-width="2" marker-end="url(#a)"/>' +
  '<defs><marker id="a" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6 Z" fill="#475569"/></marker></defs>' +
  '<text x="36" y="65" font-family="Inter, sans-serif" font-size="12" fill="#0f172a">Mermaid</text>' +
  '<text x="168" y="65" font-family="Inter, sans-serif" font-size="12" fill="#0f172a">SVG</text>' +
  '</svg>';
