import { parseSqlDdl } from '@/hooks/ai-generation/sqlParser';
import { sqlSchemaToDsl } from '@/hooks/ai-generation/sqlToErd';
import { parseTerraformState } from '@/services/infraSync/terraformStateParser';
import { parseKubernetesManifests } from '@/services/infraSync/kubernetesParser';
import { parseDockerCompose } from '@/services/infraSync/dockerComposeParser';
import { infraSyncResultToDsl, infraSyncResultSummary } from '@/services/infraSync/infraToDsl';
import type { InfraFormat, InfraSyncResult } from '@/services/infraSync/types';

export interface NativeParseResult {
  dsl: string;
  nodeCount: number;
  edgeCount: number;
  summary: string;
}

function countDslNodesAndEdges(dsl: string): { nodes: number; edges: number } {
  const lines = dsl.split('\n');
  let nodes = 0;
  let edges = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (
      /^\[(entity|process|system|section|start|end|decision|browser|mobile|note|annotation|container)\]/.test(
        trimmed
      )
    ) {
      nodes++;
    } else if (
      /->/.test(trimmed) &&
      !trimmed.startsWith('flow:') &&
      !trimmed.startsWith('direction:')
    ) {
      edges++;
    }
  }
  return { nodes, edges };
}

export function parseSqlNative(input: string): NativeParseResult {
  const schema = parseSqlDdl(input);
  if (schema.tables.length === 0)
    throw new Error('No tables found. Paste CREATE TABLE statements.');
  const dsl = sqlSchemaToDsl(schema);
  const counts = countDslNodesAndEdges(dsl);
  return {
    dsl,
    nodeCount: counts.nodes,
    edgeCount: counts.edges,
    summary: `${schema.tables.length} table${schema.tables.length > 1 ? 's' : ''}, ${schema.tables.reduce((sum, t) => sum + t.foreignKeys.length, 0)} relationship(s)`,
  };
}

export function parseInfraNative(input: string, format: InfraFormat): NativeParseResult {
  let result: InfraSyncResult;
  if (format === 'terraform-state') result = parseTerraformState(input);
  else if (format === 'kubernetes') result = parseKubernetesManifests(input);
  else if (format === 'docker-compose') result = parseDockerCompose(input);
  else throw new Error('HCL requires AI analysis. Use the AI button.');

  if (result.nodes.length === 0)
    throw new Error('No resources detected. Check the format and content.');
  const dsl = infraSyncResultToDsl(result);
  const counts = countDslNodesAndEdges(dsl);
  return {
    dsl,
    nodeCount: counts.nodes,
    edgeCount: counts.edges,
    summary: infraSyncResultSummary(result),
  };
}
