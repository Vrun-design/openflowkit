import type { FlowNode, FlowEdge } from '@/lib/types';

const NODE_LINE_RE = /^\[(\w+)\]\s+(\w[\w-]*):\s*(.+?)(?:\s*\{[^}]*\})?\s*$/;
const EDGE_LINE_RE = /^(\w[\w-]*)\s*->\s*(?:\|([^|]*)\|\s*)?(\w[\w-]*)/;
const GRID_COLS = 4;
const NODE_W = 180;
const NODE_H = 80;
const GAP_X = 40;
const GAP_Y = 40;

export interface StreamingParseResult {
  nodes: FlowNode[];
  edges: FlowEdge[];
  nodeCount: number;
  edgeCount: number;
}

export function parseStreamingDsl(text: string): StreamingParseResult {
  const lines = text.split('\n');
  const seenIds = new Set<string>();
  const nodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];
  let nodeIndex = 0;

  for (const raw of lines) {
    const line = raw.trim();
    if (
      !line ||
      line.startsWith('flow:') ||
      line.startsWith('direction:') ||
      line.startsWith('group')
    )
      continue;

    const nodeMatch = NODE_LINE_RE.exec(line);
    if (nodeMatch) {
      const id = nodeMatch[2];
      if (seenIds.has(id)) continue;
      seenIds.add(id);

      const col = nodeIndex % GRID_COLS;
      const row = Math.floor(nodeIndex / GRID_COLS);
      const rawLabel = nodeMatch[3].replace(/\{[^}]*\}$/, '').trim();
      const label = rawLabel.replace(/^"|"$/g, '').replace(/\\"/g, '"');

      nodes.push({
        id,
        type: nodeMatch[1] === 'section' ? 'group' : 'process',
        position: { x: col * (NODE_W + GAP_X), y: row * (NODE_H + GAP_Y) },
        data: { label },
        width: NODE_W,
        height: NODE_H,
      });
      nodeIndex++;
      continue;
    }

    const edgeMatch = EDGE_LINE_RE.exec(line);
    if (edgeMatch) {
      const source = edgeMatch[1];
      const label = edgeMatch[2]?.trim() || undefined;
      const target = edgeMatch[3];
      if (seenIds.has(source) && seenIds.has(target)) {
        const edgeId = `streaming-e-${source}-${target}`;
        if (!edges.some((e) => e.id === edgeId)) {
          edges.push({
            id: edgeId,
            source,
            target,
            label,
            type: 'default',
          });
        }
      }
    }
  }

  return { nodes, edges, nodeCount: nodes.length, edgeCount: edges.length };
}
