import type { InfraSyncResult, ParsedInfraEdge, ParsedInfraNode } from './types';

const SKIP_KINDS = new Set([
  'ConfigMap',
  'Secret',
  'ServiceAccount',
  'Role',
  'ClusterRole',
  'RoleBinding',
  'ClusterRoleBinding',
]);

function getNodeType(kind: string): string {
  switch (kind) {
    case 'Deployment':
    case 'StatefulSet':
    case 'DaemonSet':
    case 'Pod':
    case 'PersistentVolumeClaim':
    case 'PersistentVolume':
    case 'Service':
      return 'system';
    case 'Ingress':
    case 'IngressClass':
      return 'browser';
    case 'Namespace':
      return 'section';
    case 'CronJob':
    case 'Job':
      return 'process';
    default:
      return 'system';
  }
}

function sanitizeId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_]/g, '_');
}

function stripHelmTemplates(text: string): string {
  return text.replace(/\{\{[^}]*\}\}/g, 'helm-value');
}

interface SimpleK8sMetadata {
  name?: string;
  namespace?: string;
  labels?: Record<string, string>;
}

interface SimpleK8sSpec {
  selector?: {
    matchLabels?: Record<string, string>;
  };
  template?: {
    metadata?: {
      labels?: Record<string, string>;
    };
  };
  type?: string;
  rules?: SimpleK8sIngressRule[];
}

interface SimpleK8sIngressRule {
  http?: {
    paths?: SimpleK8sIngressPath[];
  };
}

interface SimpleK8sIngressPath {
  backend?: {
    service?: {
      name?: string;
    };
  };
}

interface SimpleK8sManifest {
  kind: string;
  metadata: SimpleK8sMetadata;
  spec?: SimpleK8sSpec;
}

function isRecord(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

function isStringRecord(val: unknown): val is Record<string, string> {
  if (!isRecord(val)) return false;
  return Object.values(val).every((v) => typeof v === 'string');
}

function parseYamlSimple(text: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = text.split('\n');
  const stack: Array<{ indent: number; obj: Record<string, unknown>; key: string | null }> = [
    { indent: -1, obj: result, key: null },
  ];

  for (const line of lines) {
    if (line.trim() === '' || line.trim().startsWith('#')) continue;
    const indent = line.length - line.trimStart().length;
    const trimmed = line.trim();

    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;

    const key = trimmed.slice(0, colonIdx).trim();
    const valueRaw = trimmed.slice(colonIdx + 1).trim();

    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }

    const parent = stack[stack.length - 1].obj;

    if (valueRaw === '' || valueRaw === '|' || valueRaw === '>') {
      const childObj: Record<string, unknown> = {};
      parent[key] = childObj;
      stack.push({ indent, obj: childObj, key });
    } else if (valueRaw.startsWith('"') || valueRaw.startsWith("'")) {
      parent[key] = valueRaw.replace(/^['"]|['"]$/g, '');
    } else if (valueRaw === 'true' || valueRaw === 'false') {
      parent[key] = valueRaw === 'true';
    } else {
      parent[key] = valueRaw;
    }
  }

  return result;
}

function extractManifest(raw: Record<string, unknown>): SimpleK8sManifest | null {
  if (typeof raw['kind'] !== 'string') return null;
  if (!isRecord(raw['metadata'])) return null;

  const meta = raw['metadata'];
  const metadata: SimpleK8sMetadata = {
    name: typeof meta['name'] === 'string' ? meta['name'] : undefined,
    namespace: typeof meta['namespace'] === 'string' ? meta['namespace'] : undefined,
    labels: isStringRecord(meta['labels']) ? meta['labels'] : undefined,
  };

  let spec: SimpleK8sSpec | undefined;
  if (isRecord(raw['spec'])) {
    const rawSpec = raw['spec'];
    spec = {};

    if (isRecord(rawSpec['selector'])) {
      const sel = rawSpec['selector'];
      spec.selector = {
        matchLabels: isStringRecord(sel['matchLabels']) ? sel['matchLabels'] : undefined,
      };
    }

    if (typeof rawSpec['type'] === 'string') {
      spec.type = rawSpec['type'];
    }

    if (
      isRecord(rawSpec['template']) &&
      isRecord((rawSpec['template'] as Record<string, unknown>)['metadata'])
    ) {
      const tmpl = rawSpec['template'] as Record<string, unknown>;
      const tmplMeta = tmpl['metadata'] as Record<string, unknown>;
      spec.template = {
        metadata: {
          labels: isStringRecord(tmplMeta['labels']) ? tmplMeta['labels'] : undefined,
        },
      };
    }
  }

  return { kind: raw['kind'], metadata, spec };
}

interface ManifestWithSource {
  manifest: SimpleK8sManifest;
  rawDoc: string;
}

function extractIngressBackendServiceNames(rawDoc: string): string[] {
  const names: string[] = [];
  // Match `service:\n    name: <value>` or `service:\r?\n\s+name: <value>`
  const re = /service:\s*\n\s+name:\s*(\S+)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(rawDoc)) !== null) {
    names.push(match[1]);
  }
  return names;
}

export function parseKubernetesManifests(input: string): InfraSyncResult {
  const cleaned = stripHelmTemplates(input);
  const docs = cleaned.split(/^---/m).filter((d) => d.trim().length > 0);
  const manifestsWithSource: ManifestWithSource[] = [];

  for (const doc of docs) {
    try {
      const raw = parseYamlSimple(doc);
      const manifest = extractManifest(raw);
      if (manifest) manifestsWithSource.push({ manifest, rawDoc: doc });
    } catch {
      // skip unparseable docs
    }
  }

  const manifests = manifestsWithSource.map((m) => m.manifest);

  const nodes: ParsedInfraNode[] = [];
  const nodeIdByNameNs = new Map<string, string>();

  for (const manifest of manifests) {
    const { kind, metadata } = manifest;
    if (SKIP_KINDS.has(kind)) continue;
    if (!metadata.name) continue;

    const ns = metadata.namespace ?? 'default';
    const rawId = `${kind.toLowerCase()}_${ns}_${metadata.name}`;
    const nodeId = sanitizeId(rawId);

    let label = metadata.name;
    if (kind === 'Service' && manifest.spec?.type === 'LoadBalancer') {
      label = `${metadata.name} (LB)`;
    }

    nodes.push({
      id: nodeId,
      label,
      nodeType: getNodeType(kind),
      provider: 'kubernetes',
      resourceType: kind,
      resourceName: metadata.name,
    });

    nodeIdByNameNs.set(`${kind.toLowerCase()}:${ns}:${metadata.name}`, nodeId);
    nodeIdByNameNs.set(`${kind.toLowerCase()}::${metadata.name}`, nodeId);
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

  for (const { manifest, rawDoc } of manifestsWithSource) {
    const { kind, metadata, spec } = manifest;
    if (!metadata.name) continue;
    const ns = metadata.namespace ?? 'default';

    if (kind === 'Service' && spec?.selector) {
      const selectorLabels = spec.selector.matchLabels ?? {};
      for (const depManifest of manifests) {
        if (!['Deployment', 'StatefulSet', 'DaemonSet'].includes(depManifest.kind)) continue;
        const podLabels = depManifest.spec?.template?.metadata?.labels ?? {};
        const matches = Object.entries(selectorLabels).every(([k, v]) => podLabels[k] === v);
        if (matches && depManifest.metadata.name) {
          const depNs = depManifest.metadata.namespace ?? 'default';
          const svcNodeId = sanitizeId(`service_${ns}_${metadata.name}`);
          const depNodeId = sanitizeId(
            `${depManifest.kind.toLowerCase()}_${depNs}_${depManifest.metadata.name}`
          );
          addEdge(svcNodeId, depNodeId);
        }
      }
    }

    if (kind === 'Ingress') {
      const ingressNodeId = sanitizeId(`ingress_${ns}_${metadata.name}`);
      const backendServiceNames = extractIngressBackendServiceNames(rawDoc);
      for (const svcName of backendServiceNames) {
        const svcNodeId =
          nodeIdByNameNs.get(`service:${ns}:${svcName}`) ??
          nodeIdByNameNs.get(`service::${svcName}`);
        if (svcNodeId) addEdge(ingressNodeId, svcNodeId);
      }
    }
  }

  return {
    nodes,
    edges,
    resourceCount: nodes.length,
    provider: 'kubernetes',
    lastParsed: Date.now(),
  };
}
