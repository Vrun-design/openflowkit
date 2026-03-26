import type { FlowEdge, FlowNode } from '@/lib/types';

export interface RevealFrame {
  visibleNodeIds: ReadonlySet<string>;
  visibleEdgeIds: ReadonlySet<string>;
  /** Node IDs arriving in this frame that should fade (opacity < 1). */
  fadingNodeIds: ReadonlySet<string>;
  /** Opacity for fading nodes (0–1). Fully-visible nodes are always 1. */
  fadeOpacity: number;
  holdMs: number;
}

function assignBfsLevels(nodes: FlowNode[], edges: FlowEdge[]): Map<string, number> {
  const nodeIds = new Set(nodes.map((n) => n.id));
  const indegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const n of nodes) {
    indegree.set(n.id, 0);
    adj.set(n.id, []);
  }

  for (const e of edges) {
    if (!nodeIds.has(e.source) || !nodeIds.has(e.target) || e.source === e.target) continue;
    adj.get(e.source)!.push(e.target);
    indegree.set(e.target, (indegree.get(e.target) ?? 0) + 1);
  }

  const levelMap = new Map<string, number>();
  const queue = nodes.filter((n) => (indegree.get(n.id) ?? 0) === 0).map((n) => n.id);
  for (const id of queue) levelMap.set(id, 0);

  let head = 0;
  while (head < queue.length) {
    const id = queue[head++];
    const nextLevel = (levelMap.get(id) ?? 0) + 1;
    for (const neighbor of adj.get(id) ?? []) {
      if (nextLevel > (levelMap.get(neighbor) ?? -1)) levelMap.set(neighbor, nextLevel);
      const deg = (indegree.get(neighbor) ?? 1) - 1;
      indegree.set(neighbor, deg);
      if (deg === 0) queue.push(neighbor);
    }
  }

  // Nodes in cycles get max level + 1
  const maxLevel = levelMap.size > 0 ? Math.max(...levelMap.values()) : 0;
  for (const n of nodes) {
    if (!levelMap.has(n.id)) levelMap.set(n.id, maxLevel + 1);
  }

  return levelMap;
}

const FADE_STEPS = [0.3, 0.6, 1.0];
const FADE_STEP_HOLD_MS = 80;

export function buildRevealFrames(
  nodes: FlowNode[],
  edges: FlowEdge[],
  opts?: { holdMs?: number; fade?: boolean }
): RevealFrame[] {
  if (nodes.length === 0) return [];

  const holdMs = opts?.holdMs ?? 500;
  const fade = opts?.fade ?? true;
  const levelMap = assignBfsLevels(nodes, edges);

  const byLevel = new Map<number, string[]>();
  for (const [nodeId, level] of levelMap) {
    if (!byLevel.has(level)) byLevel.set(level, []);
    byLevel.get(level)!.push(nodeId);
  }

  const sortedLevels = [...byLevel.keys()].sort((a, b) => a - b);
  const frames: RevealFrame[] = [];
  const visibleNodes = new Set<string>();
  const visibleEdges = new Set<string>();
  const emptySet = new Set<string>();

  for (const lv of sortedLevels) {
    const arriving = new Set(byLevel.get(lv)!);
    for (const id of arriving) visibleNodes.add(id);

    for (const e of edges) {
      if (visibleNodes.has(e.source) && visibleNodes.has(e.target)) {
        visibleEdges.add(e.id);
      }
    }

    if (fade) {
      for (const opacity of FADE_STEPS) {
        frames.push({
          visibleNodeIds: new Set(visibleNodes),
          visibleEdgeIds: new Set(visibleEdges),
          fadingNodeIds: opacity < 1 ? new Set(arriving) : emptySet,
          fadeOpacity: opacity,
          holdMs: opacity < 1 ? FADE_STEP_HOLD_MS : holdMs,
        });
      }
    } else {
      frames.push({
        visibleNodeIds: new Set(visibleNodes),
        visibleEdgeIds: new Set(visibleEdges),
        fadingNodeIds: emptySet,
        fadeOpacity: 1,
        holdMs,
      });
    }
  }

  return frames;
}
