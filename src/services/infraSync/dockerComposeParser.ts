import type { InfraSyncResult, ParsedInfraEdge, ParsedInfraNode } from './types';

function sanitizeId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_]/g, '_');
}

function isRecord(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

function parseYamlSimple(text: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = text.split('\n');
  const stack: Array<{ indent: number; obj: Record<string, unknown> }> = [
    { indent: -1, obj: result },
  ];

  for (const rawLine of lines) {
    if (rawLine.trim() === '' || rawLine.trim().startsWith('#')) continue;
    const indent = rawLine.length - rawLine.trimStart().length;
    const trimmed = rawLine.trim();

    // List item
    if (trimmed.startsWith('- ')) {
      const value = trimmed.slice(2).trim();
      const parent = stack[stack.length - 1].obj;
      const parentKey = Object.keys(parent)[Object.keys(parent).length - 1];
      if (parentKey && Array.isArray(parent[parentKey])) {
        (parent[parentKey] as unknown[]).push(value);
      }
      continue;
    }

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
      stack.push({ indent, obj: childObj });
    } else {
      parent[key] = valueRaw;
    }
  }

  return result;
}

function extractListItems(text: string, sectionKey: string): string[] {
  const items: string[] = [];
  const lines = text.split('\n');
  let inSection = false;
  let sectionIndent = -1;

  for (const line of lines) {
    if (line.trim() === '' || line.trim().startsWith('#')) continue;
    const indent = line.length - line.trimStart().length;
    const trimmed = line.trim();

    if (trimmed === `${sectionKey}:` || trimmed.startsWith(`${sectionKey}:`)) {
      inSection = true;
      sectionIndent = indent;
      continue;
    }

    if (inSection) {
      if (indent <= sectionIndent && trimmed.length > 0 && !trimmed.startsWith('-')) {
        inSection = false;
        continue;
      }
      if (trimmed.startsWith('- ')) {
        items.push(trimmed.slice(2).trim());
      } else if (trimmed.startsWith('-')) {
        items.push(trimmed.slice(1).trim());
      }
    }
  }

  return items;
}

interface ServiceInfo {
  name: string;
  dependsOn: string[];
  networks: string[];
  ports: string[];
}

function extractServices(text: string): ServiceInfo[] {
  const services: ServiceInfo[] = [];
  const lines = text.split('\n');
  let inServices = false;
  let currentService: ServiceInfo | null = null;
  let currentSection = '';
  const serviceIndent = 2;

  for (const line of lines) {
    if (line.trim() === '' || line.trim().startsWith('#')) continue;
    const indent = line.length - line.trimStart().length;
    const trimmed = line.trim();

    if (trimmed === 'services:') {
      inServices = true;
      continue;
    }

    if (inServices) {
      // Top-level key at indent 0 ending services block
      if (indent === 0 && !trimmed.startsWith('-')) {
        inServices = false;
        if (currentService) services.push(currentService);
        currentService = null;
        continue;
      }

      // Service name at indent 2
      if (indent === serviceIndent && trimmed.endsWith(':') && !trimmed.startsWith('-')) {
        if (currentService) services.push(currentService);
        currentService = { name: trimmed.slice(0, -1), dependsOn: [], networks: [], ports: [] };
        currentSection = '';
        continue;
      }

      if (!currentService) continue;

      if (indent === serviceIndent + 2 && trimmed.endsWith(':') && !trimmed.startsWith('-')) {
        currentSection = trimmed.slice(0, -1);
        continue;
      }

      if (currentSection === 'depends_on' && trimmed.startsWith('- ')) {
        currentService.dependsOn.push(trimmed.slice(2).trim());
      }

      if (currentSection === 'networks' && trimmed.startsWith('- ')) {
        currentService.networks.push(trimmed.slice(2).trim());
      }

      if (currentSection === 'ports' && trimmed.startsWith('- ')) {
        currentService.ports.push(trimmed.slice(2).trim());
      }
    }
  }

  if (currentService) services.push(currentService);
  return services;
}

export function parseDockerCompose(input: string): InfraSyncResult {
  const raw = parseYamlSimple(input);
  const nodes: ParsedInfraNode[] = [];
  const edges: ParsedInfraEdge[] = [];
  const addedEdges = new Set<string>();

  function addEdge(from: string, to: string, label?: string): void {
    const key = `${from}->${to}`;
    if (!addedEdges.has(key) && from !== to) {
      addedEdges.add(key);
      edges.push({ from, to, label });
    }
  }

  // Parse network names from top-level networks key
  const networkSection = raw['networks'];
  if (isRecord(networkSection)) {
    for (const netName of Object.keys(networkSection)) {
      const nodeId = sanitizeId(`net_${netName}`);
      nodes.push({
        id: nodeId,
        label: netName,
        nodeType: 'section',
        provider: 'docker-compose',
        resourceType: 'network',
        resourceName: netName,
      });
    }
  }

  // Extract services with their depends_on and network connections
  const services = extractServices(input);

  // Also extract top-level network names from the yaml if not extracted above
  const networkNames = new Set(
    nodes.filter((n) => n.resourceType === 'network').map((n) => n.resourceName)
  );

  // Extract any network names referenced by services but not declared
  for (const svc of services) {
    for (const net of svc.networks) {
      if (!networkNames.has(net)) {
        networkNames.add(net);
        const nodeId = sanitizeId(`net_${net}`);
        nodes.push({
          id: nodeId,
          label: net,
          nodeType: 'section',
          provider: 'docker-compose',
          resourceType: 'network',
          resourceName: net,
        });
      }
    }
  }

  // Collect network names from yaml text as fallback
  const topLevelNetworkNames = extractListItems(input, 'networks');
  for (const net of topLevelNetworkNames) {
    if (!networkNames.has(net)) {
      networkNames.add(net);
    }
  }

  for (const svc of services) {
    const nodeId = sanitizeId(`svc_${svc.name}`);
    const portLabel = svc.ports.length > 0 ? svc.ports.join(', ') : undefined;
    nodes.push({
      id: nodeId,
      label: portLabel ? `${svc.name} [${portLabel}]` : svc.name,
      nodeType: 'system',
      provider: 'docker-compose',
      resourceType: 'service',
      resourceName: svc.name,
    });
  }

  for (const svc of services) {
    const nodeId = sanitizeId(`svc_${svc.name}`);
    for (const dep of svc.dependsOn) {
      const depId = sanitizeId(`svc_${dep}`);
      addEdge(nodeId, depId, 'depends_on');
    }
    for (const net of svc.networks) {
      const netId = sanitizeId(`net_${net}`);
      addEdge(nodeId, netId);
    }
  }

  return {
    nodes,
    edges,
    resourceCount: nodes.length,
    provider: 'docker-compose',
    lastParsed: Date.now(),
  };
}
