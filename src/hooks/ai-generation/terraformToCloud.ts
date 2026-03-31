export type TerraformInputFormat = 'terraform' | 'kubernetes' | 'docker-compose';

export const TERRAFORM_FORMAT_LABELS: Record<TerraformInputFormat, string> = {
    terraform: 'Terraform / HCL',
    kubernetes: 'Kubernetes YAML',
    'docker-compose': 'Docker Compose',
};

const INFRA_ICON_HINTS = `AVAILABLE ICON PACKS (use these exact values when the resource matches):
AWS (archProvider: "aws", archIconPackId: "aws-official-starter-v1"):
  Lambda         -> archIconShapeId: "compute-lambda", color: "violet"
  EC2            -> archIconShapeId: "compute-ec2", color: "violet"
  ECS/Fargate    -> archIconShapeId: "containers-elastic-container-service", color: "violet"
  EKS            -> archIconShapeId: "containers-elastic-kubernetes-service", color: "violet"
  API Gateway    -> archIconShapeId: "app-integration-api-gateway", color: "violet"
  S3             -> archIconShapeId: "storage-simple-storage-service", color: "emerald"
  RDS/Postgres   -> archIconShapeId: "database-rds", color: "emerald"
  DynamoDB       -> archIconShapeId: "database-dynamodb", color: "emerald"
  ElastiCache    -> archIconShapeId: "database-elasticache", color: "yellow"
  SQS            -> archIconShapeId: "app-integration-simple-queue-service", color: "amber"
  SNS            -> archIconShapeId: "app-integration-simple-notification-service", color: "amber"
  CloudFront     -> archIconShapeId: "networking-cloudfront", color: "pink"
  Route 53       -> archIconShapeId: "networking-route-53", color: "pink"
  Cognito        -> archIconShapeId: "security-cognito", color: "slate"
  CloudWatch     -> archIconShapeId: "management-governance-cloudwatch", color: "slate"

Azure (archProvider: "azure", archIconPackId: "azure-official-icons-v20"):
  Azure Functions -> archIconShapeId: "compute-function-apps", color: "violet"
  AKS             -> archIconShapeId: "compute-kubernetes-services", color: "violet"
  Azure SQL       -> archIconShapeId: "databases-azure-sql", color: "emerald"
  Blob Storage    -> archIconShapeId: "storage-storage-accounts", color: "emerald"
  Service Bus     -> archIconShapeId: "integration-service-bus", color: "amber"
  API Management  -> archIconShapeId: "integration-api-management-services", color: "violet"

GCP (archProvider: "gcp", archIconPackId: "gcp-official-icons-v1"):
  Cloud Run       -> archIconShapeId: "compute-cloud-run", color: "violet"
  GKE             -> archIconShapeId: "compute-kubernetes-engine", color: "violet"
  Cloud SQL       -> archIconShapeId: "databases-cloud-sql", color: "emerald"
  Pub/Sub         -> archIconShapeId: "data-analytics-pub-sub", color: "amber"
  Cloud Storage   -> archIconShapeId: "storage-cloud-storage", color: "emerald"

CNCF/Kubernetes (archProvider: "cncf", archIconPackId: "cncf-artwork-icons-v1"):
  Kubernetes      -> archIconShapeId: "projects-clusternet", color: "violet"`;

export function buildTerraformToCloudPrompt(input: string, format: TerraformInputFormat): string {
    const formatName = TERRAFORM_FORMAT_LABELS[format];
    return `Analyze the following ${formatName} infrastructure-as-code and generate a cloud architecture diagram.

Guidelines:
- Use [architecture] nodes for all infrastructure resources (databases, queues, storage, compute, networking)
- Use [system] nodes for application services and containers
- For each [architecture] node, set archProvider, archIconPackId, and archIconShapeId using the icon hints below — this ensures the correct provider icon is shown
- Show network topology: edges represent traffic flow, dependencies, or data movement
- Label edges with protocol or relationship (e.g. "HTTPS", "depends_on", "ingress")
- Do not use section or group containers; keep related resources adjacent and use labels or subtitles to communicate region, VPC, or namespace
- Surface key config like ports, instance types, or replica counts as node subtitles
- Color by resource type:
  - violet for compute (Lambda, EC2, ECS, Functions)
  - emerald for databases and storage (RDS, S3, DynamoDB, Blob)
  - amber for queues and messaging (SQS, SNS, Service Bus, Pub/Sub)
  - yellow for caches (ElastiCache, Redis, Memorystore)
  - pink for CDN and DNS (CloudFront, Route 53)
  - slate for observability and IAM (CloudWatch, Cognito)

${INFRA_ICON_HINTS}

${formatName.toUpperCase()}:
\`\`\`
${input}
\`\`\``;
}
