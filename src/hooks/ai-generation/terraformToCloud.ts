export type TerraformInputFormat = 'terraform' | 'kubernetes' | 'docker-compose';

export const TERRAFORM_FORMAT_LABELS: Record<TerraformInputFormat, string> = {
    terraform: 'Terraform / HCL',
    kubernetes: 'Kubernetes YAML',
    'docker-compose': 'Docker Compose',
};

export function buildTerraformToCloudPrompt(input: string, format: TerraformInputFormat): string {
    const formatName = TERRAFORM_FORMAT_LABELS[format];
    return `Analyze the following ${formatName} infrastructure-as-code and generate a cloud architecture diagram.

Guidelines:
- Map each resource/service to a node using [system] for services and [architecture] for infrastructure resources such as namespaces, VPCs, or environments
- Use cloud provider icon names where applicable (e.g. aws-s3, aws-rds, aws-ec2, gcp-gke, azure-vm)
- Show network topology: edges represent traffic flow, dependencies, or data movement
- Label edges with protocol or relationship (e.g. "HTTPS", "depends_on", "ingress")
- Do not use section or group containers; keep related resources adjacent and use labels or subtitles to communicate region, VPC, or namespace
- Surface key config like ports, instance types, or replica counts as node subtitles

${formatName.toUpperCase()}:
\`\`\`
${input}
\`\`\``;
}
