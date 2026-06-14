/**
 * Built-in starter templates that ship with the MCP server so agents can
 * generate diagrams without an API key. Each entry is a self-contained DSL
 * snippet that round-trips through the app's parser.
 */

export interface StarterTemplate {
  name: string;
  title: string;
  category: 'flowchart' | 'architecture' | 'sequence' | 'pipeline';
  summary: string;
  dsl: string;
}

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    name: 'auth-flow',
    title: 'User Authentication',
    category: 'flowchart',
    summary: 'Classic login flow with MFA branch and access-denied terminal.',
    dsl: `flow: User Authentication
direction: TB

[start] Start
[process] login: Login Form { icon: "LogIn", color: "blue" }
[decision] valid: Credentials valid? { color: "amber" }
[process] mfa: MFA Check { icon: "Smartphone", color: "blue" }
[system] token: Issue JWT { icon: "Key", color: "violet" }
[end] dashboard: Enter Dashboard { color: "emerald" }
[end] fail: Access Denied { color: "red" }

Start ==> login
login -> valid
valid ->|Yes| mfa
valid ->|No| fail
mfa ==> token
token ==> dashboard
`,
  },
  {
    name: 'ci-cd-pipeline',
    title: 'CI/CD Pipeline',
    category: 'pipeline',
    summary: 'Source → build → test → deploy with rollback on failure.',
    dsl: `flow: Build, Test, Deploy
direction: LR

[start] commit: Push to main
[process] build: Build { icon: "Cog", color: "blue" }
[process] test: Test Suite { icon: "FlaskConical", color: "amber" }
[decision] passed: All green?
[process] deploy: Deploy to prod { icon: "Rocket", color: "violet" }
[process] rollback: Rollback { icon: "Undo", color: "red" }
[end] live: Production
[end] revert: Reverted

commit ==> build
build ==> test
test -> passed
passed ->|Yes| deploy
passed ->|No| rollback
deploy ==> live
rollback ==> revert
`,
  },
  {
    name: 'three-tier-architecture',
    title: 'Three-Tier Web Architecture',
    category: 'architecture',
    summary: 'Browser → API → database with cache and CDN edge.',
    dsl: `flow: Three-Tier Web Architecture
direction: LR

[browser] web: Web App { color: "blue" }
[architecture] cdn: CloudFront { archProvider: "aws", archResourceType: "networking-content-delivery-cloudfront", color: "blue" }
[architecture] api: API Gateway { archProvider: "aws", archResourceType: "networking-content-delivery-api-gateway", color: "violet" }
[architecture] svc: ECS Service { archProvider: "aws", archResourceType: "containers-elastic-container-service", color: "violet" }
[architecture] cache: ElastiCache { archProvider: "aws", archResourceType: "databases-elasticache", color: "yellow" }
[architecture] db: RDS Postgres { archProvider: "aws", archResourceType: "databases-rds", color: "emerald" }

web --> cdn
cdn --> api
api --> svc
svc --> cache
svc --> db
`,
  },
  {
    name: 'request-sequence',
    title: 'API Request Sequence',
    category: 'sequence',
    summary: 'Linear request/response sequence between client, gateway, service, and database.',
    dsl: `flow: API Request Sequence
direction: TB

[browser] client: Client
[system] gateway: API Gateway { color: "violet" }
[system] service: Order Service { color: "violet" }
[architecture] db: Orders DB { color: "emerald" }

client ==> gateway
gateway ==> service
service ==> db
db ..|row| service
service ..|payload| gateway
gateway ..|JSON| client
`,
  },
  {
    name: 'event-driven-pipeline',
    title: 'Event-Driven Ingest Pipeline',
    category: 'pipeline',
    summary: 'Producer → queue → workers → storage with dead-letter side path.',
    dsl: `flow: Event Ingest
direction: LR

[architecture] producer: Web Producer { color: "blue" }
[architecture] queue: SQS { archProvider: "aws", archResourceType: "application-integration-simple-queue-service", color: "amber" }
[architecture] dlq: DLQ { archProvider: "aws", archResourceType: "application-integration-simple-queue-service", color: "red" }
[architecture] worker1: Worker 1 { archProvider: "aws", archResourceType: "compute-lambda", color: "violet" }
[architecture] worker2: Worker 2 { archProvider: "aws", archResourceType: "compute-lambda", color: "violet" }
[architecture] store: S3 { archProvider: "aws", archResourceType: "storage-simple-storage-service", color: "emerald" }

producer ==> queue
queue --> worker1
queue --> worker2
worker1 ..|fail| dlq
worker2 ..|fail| dlq
worker1 ==> store
worker2 ==> store
`,
  },
];

export function findStarterTemplate(name: string): StarterTemplate | undefined {
  return STARTER_TEMPLATES.find((template) => template.name === name);
}
