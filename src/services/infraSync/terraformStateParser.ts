import type { InfraProvider, InfraSyncResult, ParsedInfraEdge, ParsedInfraNode } from './types';

interface TfStateResourceAttributes {
  id?: string;
  tags?: Record<string, string>;
  vpc_id?: string;
  subnet_id?: string;
  security_groups?: string[];
  load_balancer_arn?: string;
  load_balancer_arns?: string[];
  cluster_id?: string;
  cluster_arn?: string;
  db_instance_identifier?: string;
  depends_on?: string[];
  [key: string]: unknown;
}

interface TfStateResourceInstance {
  attributes: TfStateResourceAttributes;
}

interface TfStateResource {
  type: string;
  name: string;
  provider: string;
  instances: TfStateResourceInstance[];
}

interface TfState {
  version: number;
  resources: TfStateResource[];
}

function isTfStateResourceAttributes(val: unknown): val is TfStateResourceAttributes {
  return typeof val === 'object' && val !== null;
}

function isTfStateResourceInstance(val: unknown): val is TfStateResourceInstance {
  if (typeof val !== 'object' || val === null) return false;
  const obj = val as Record<string, unknown>;
  return isTfStateResourceAttributes(obj['attributes']);
}

function isTfStateResource(val: unknown): val is TfStateResource {
  if (typeof val !== 'object' || val === null) return false;
  const obj = val as Record<string, unknown>;
  return (
    typeof obj['type'] === 'string' &&
    typeof obj['name'] === 'string' &&
    typeof obj['provider'] === 'string' &&
    Array.isArray(obj['instances'])
  );
}

function isTfState(val: unknown): val is TfState {
  if (typeof val !== 'object' || val === null) return false;
  const obj = val as Record<string, unknown>;
  return typeof obj['version'] === 'number' && Array.isArray(obj['resources']);
}

const SKIP_TYPES = new Set([
  'aws_security_group',
  'aws_iam_role',
  'aws_iam_policy',
  'aws_iam_role_policy',
  'aws_iam_role_policy_attachment',
  'aws_iam_instance_profile',
  'aws_route_table',
  'aws_route_table_association',
  'aws_route',
  'aws_subnet',
  'aws_internet_gateway',
  'aws_nat_gateway',
  'aws_eip',
]);

function getNodeType(resourceType: string): string {
  switch (resourceType) {
    case 'aws_instance':
    case 'google_compute_instance':
    case 'azurerm_linux_virtual_machine':
      return 'system';
    case 'aws_lambda_function':
    case 'google_cloudfunctions_function':
    case 'azurerm_function_app':
      return 'process';
    case 'aws_rds_instance':
    case 'aws_rds_cluster':
    case 'aws_dynamodb_table':
    case 'google_sql_database_instance':
    case 'azurerm_sql_server':
      return 'system';
    case 'aws_s3_bucket':
    case 'google_storage_bucket':
    case 'azurerm_storage_account':
      return 'system';
    case 'aws_vpc':
    case 'google_compute_network':
    case 'azurerm_virtual_network':
      return 'section';
    case 'aws_lb':
    case 'aws_alb':
    case 'aws_elb':
    case 'google_compute_forwarding_rule':
    case 'azurerm_lb':
      return 'system';
    case 'aws_ecs_cluster':
    case 'aws_eks_cluster':
    case 'google_container_cluster':
    case 'azurerm_kubernetes_cluster':
      return 'section';
    case 'aws_ecs_service':
    case 'aws_eks_node_group':
      return 'system';
    case 'aws_api_gateway_rest_api':
    case 'aws_apigatewayv2_api':
    case 'google_api_gateway_api':
      return 'system';
    case 'aws_cloudfront_distribution':
    case 'google_compute_global_forwarding_rule':
      return 'browser';
    case 'kubernetes_deployment':
    case 'kubernetes_pod':
    case 'kubernetes_service':
      return 'system';
    case 'kubernetes_ingress':
    case 'kubernetes_ingress_v1':
      return 'browser';
    case 'aws_elasticache_cluster':
    case 'aws_elasticache_replication_group':
      return 'system';
    case 'aws_sqs_queue':
    case 'google_pubsub_topic':
    case 'azurerm_servicebus_queue':
    case 'aws_sns_topic':
    case 'aws_step_functions_state_machine':
    case 'aws_sfn_state_machine':
      return 'process';
    case 'aws_waf_web_acl':
    case 'aws_wafv2_web_acl':
    case 'aws_route53_zone':
    case 'aws_route53_record':
    case 'aws_cognito_user_pool':
    case 'aws_opensearch_domain':
    case 'aws_elasticsearch_domain':
      return 'system';
    case 'google_compute_instance_group':
      return 'section';
    case 'azurerm_app_service':
    case 'azurerm_app_service_plan':
      return 'system';
    default:
      return 'system';
  }
}

function sanitizeId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_]/g, '_');
}

function detectProvider(resources: TfStateResource[]): InfraProvider {
  const types = resources.map((r) => r.type);
  const hasAws = types.some((t) => t.startsWith('aws_'));
  const hasGcp = types.some((t) => t.startsWith('google_') || t.startsWith('gcp_'));
  const hasAzure = types.some((t) => t.startsWith('azurerm_'));
  const count = [hasAws, hasGcp, hasAzure].filter(Boolean).length;
  if (count > 1) return 'mixed';
  if (hasAws) return 'aws';
  if (hasGcp) return 'gcp';
  if (hasAzure) return 'azure';
  return 'mixed';
}

export function parseTerraformState(input: string): InfraSyncResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input) as unknown;
  } catch {
    return { nodes: [], edges: [], resourceCount: 0, provider: 'mixed', lastParsed: Date.now() };
  }

  if (!isTfState(parsed)) {
    return { nodes: [], edges: [], resourceCount: 0, provider: 'mixed', lastParsed: Date.now() };
  }

  const validResources = parsed.resources.filter(isTfStateResource);
  const filtered = validResources.filter(
    (r) => !SKIP_TYPES.has(r.type) && !r.type.startsWith('aws_iam_')
  );

  const nodes: ParsedInfraNode[] = [];
  const attrIdToNodeId = new Map<string, string>();

  for (const resource of filtered) {
    const rawId = `${resource.type}_${resource.name}`;
    const nodeId = sanitizeId(rawId);
    const firstInstance = resource.instances[0];
    const attrs =
      firstInstance && isTfStateResourceInstance(firstInstance)
        ? firstInstance.attributes
        : undefined;

    const tagName = attrs?.tags?.['Name'];
    const attrName = typeof attrs?.name === 'string' ? attrs.name : undefined;
    const attrFunctionName =
      typeof attrs?.function_name === 'string' ? attrs.function_name : undefined;
    const attrDbIdentifier =
      typeof attrs?.db_instance_identifier === 'string' ? attrs.db_instance_identifier : undefined;
    const fallbackLabel = `${resource.type.split('_').slice(1).join(' ')}: ${resource.name}`;
    const label = tagName ?? attrName ?? attrFunctionName ?? attrDbIdentifier ?? fallbackLabel;

    nodes.push({
      id: nodeId,
      label,
      nodeType: getNodeType(resource.type),
      provider: resource.provider,
      resourceType: resource.type,
      resourceName: resource.name,
    });

    if (attrs?.id && typeof attrs.id === 'string') {
      attrIdToNodeId.set(attrs.id, nodeId);
    }
  }

  const edges: ParsedInfraEdge[] = [];
  const addedEdges = new Set<string>();

  function addEdge(from: string, to: string, label?: string): void {
    const key = `${from}->${to}`;
    if (!addedEdges.has(key) && from !== to) {
      addedEdges.add(key);
      edges.push({ from, to, label });
    }
  }

  for (const resource of filtered) {
    const rawId = `${resource.type}_${resource.name}`;
    const nodeId = sanitizeId(rawId);
    const firstInstance = resource.instances[0];
    if (!firstInstance || !isTfStateResourceInstance(firstInstance)) continue;
    const attrs = firstInstance.attributes;

    if (typeof attrs.vpc_id === 'string') {
      const target = attrIdToNodeId.get(attrs.vpc_id);
      if (target) addEdge(target, nodeId);
    }

    if (typeof attrs.load_balancer_arn === 'string') {
      const target = attrIdToNodeId.get(attrs.load_balancer_arn);
      if (target) addEdge(target, nodeId);
    }

    if (Array.isArray(attrs.load_balancer_arns)) {
      for (const arn of attrs.load_balancer_arns) {
        if (typeof arn === 'string') {
          const target = attrIdToNodeId.get(arn);
          if (target) addEdge(target, nodeId);
        }
      }
    }

    if (typeof attrs.cluster_id === 'string') {
      const target = attrIdToNodeId.get(attrs.cluster_id);
      if (target) addEdge(target, nodeId);
    }

    if (typeof attrs.cluster_arn === 'string') {
      const target = attrIdToNodeId.get(attrs.cluster_arn);
      if (target) addEdge(target, nodeId);
    }

    if (typeof attrs.db_instance_identifier === 'string') {
      const target = attrIdToNodeId.get(attrs.db_instance_identifier);
      if (target) addEdge(target, nodeId);
    }

    if (typeof attrs.subnet_id === 'string') {
      const target = attrIdToNodeId.get(attrs.subnet_id);
      if (target) addEdge(target, nodeId, 'subnet');
    }

    if (Array.isArray(attrs.security_groups)) {
      for (const sg of attrs.security_groups) {
        if (typeof sg === 'string') {
          const target = attrIdToNodeId.get(sg);
          if (target) addEdge(target, nodeId, 'security_group');
        }
      }
    }

    if (Array.isArray(attrs.depends_on)) {
      for (const dep of attrs.depends_on) {
        if (typeof dep === 'string') {
          const depId = sanitizeId(dep.replace(/[^a-zA-Z0-9_.]/g, '_'));
          const target = attrIdToNodeId.get(dep) ?? nodes.find((n) => n.id === depId)?.id;
          if (target) addEdge(target, nodeId, 'depends_on');
        }
      }
    }

    const networkKey = attrs['network'] ?? attrs['network_id'] ?? attrs['network_interface'];
    if (typeof networkKey === 'string') {
      const target = attrIdToNodeId.get(networkKey);
      if (target) addEdge(target, nodeId, 'network');
    }

    const subnetKey = attrs['subnetwork'] ?? attrs['subnet_ids'];
    if (typeof subnetKey === 'string') {
      const target = attrIdToNodeId.get(subnetKey);
      if (target) addEdge(target, nodeId, 'subnet');
    }
    if (Array.isArray(subnetKey)) {
      for (const sn of subnetKey) {
        if (typeof sn === 'string') {
          const target = attrIdToNodeId.get(sn);
          if (target) addEdge(target, nodeId, 'subnet');
        }
      }
    }
  }

  return {
    nodes,
    edges,
    resourceCount: nodes.length,
    provider: detectProvider(validResources),
    lastParsed: Date.now(),
  };
}
