import type { SceneConnector, SceneNode } from '../../../opencanvas/domain/document/types';
import { nodePaletteName, paletteResolver } from '../../../opencanvas/domain/nodes/nodePalette';
import { dslConnectorMeta, dslFrameRaw, dslNodeMeta, type CanonicalAttribute, type DslFrameScene } from '../../sceneMeta';
import {
  attributeText, commentLines, compareNodes, connectorAttrs, connectorDashed, markerName,
  nodeAttributes, nodeName, nodeReference, quote, slugifyDslId,
} from '../../text';

export interface GraphTextOptions {
  /** Statement keyword for a group block; state composites emit `state`. */
  readonly groupKeyword?: (group: SceneNode) => string;
  /** Emitted reference for a node whose text form is fixed (`[*]` pseudo-states). */
  readonly nodeRef?: (node: SceneNode) => string | undefined;
}

/**
 * Canonical graph text (grammar §6.4): top-level declarations, groups with
 * their members and internal edges, then the remaining edges, align lines,
 * notes and reserved records. Deterministic — canvas geometry only orders
 * statements that have no parsed line.
 */
export function graphText(scene: DslFrameScene, options: GraphTextOptions = {}): string[] {
  const frame = scene.frame;
  const frameDsl = dslFrameRaw(frame);
  // Colours snap back through the palette the frame was compiled with, so a
  // paper/mono document re-serializes to words, not hex.
  const swatchOf = paletteResolver(nodePaletteName(frame));
  const groups = [...(scene.groups ?? [])];
  const nodes = [...scene.nodes].filter((node) => !dslNodeMeta(node).noteFor);
  const noteCarriers = nodes.filter((node) => (dslNodeMeta(node).notes ?? []).length > 0);
  const byId = new Map([...nodes, ...groups].map((node) => [node.id, node]));
  const groupIds = new Set(groups.map((group) => group.id));
  const connected = new Set(scene.connectors.flatMap((connector) => [connector.source.nodeId, connector.target.nodeId].filter((id): id is string => !!id)));
  const lines: string[] = [];

  const chainOf = (nodeId: string): string[] => {
    const chain: string[] = [];
    let current = byId.get(nodeId);
    while (current) {
      if (current.parentId && groupIds.has(current.parentId)) chain.unshift(current.parentId);
      current = byId.get(current.parentId ?? '');
    }
    return chain;
  };
  const deepestCommon = (a: string, b: string): string | null => {
    const left = chainOf(a);
    const right = chainOf(b);
    let common: string | null = null;
    for (let index = 0; index < Math.min(left.length, right.length); index += 1) {
      if (left[index] === right[index]) common = left[index]!;
    }
    return common;
  };

  const edgeAttributes = (connector: SceneConnector, dashed: boolean, head: string, tail: string): CanonicalAttribute[] => {
    const extra: CanonicalAttribute[] = [];
    if (dashed && head === 'none' && tail === 'none') extra.push({ value: 'dashed' });
    if (head !== 'arrow' && head !== 'none') extra.push({ key: 'head', value: head });
    if (tail !== 'none' && tail !== 'arrow') extra.push({ key: 'tail', value: tail });
    return connectorAttrs(connector, extra);
  };
  const nameOf = (node: SceneNode): string => options.nodeRef?.(node) ?? nodeName(node);
  const edgeLine = (connector: SceneConnector): string | undefined => {
    const source = connector.source.nodeId ? byId.get(connector.source.nodeId) : undefined;
    const target = connector.target.nodeId ? byId.get(connector.target.nodeId) : undefined;
    if (!source || !target) return undefined;
    const dashed = connectorDashed(connector);
    const start = markerName(connector.appearance.markerStart);
    const end = markerName(connector.appearance.markerEnd);
    const head = end ?? 'none';
    const tail = start ?? 'none';
    const both = head === 'arrow' && tail === 'arrow';
    const forward = head === 'arrow' || tail !== 'arrow' || Boolean(connector.labels.length);
    const arrow = both ? (dashed ? '<-->' : '<->') : forward ? (head === 'arrow' ? (dashed ? '-->' : '->') : '--') : (dashed ? '-->' : '->');
    const from = forward ? source : target;
    const to = forward ? target : source;
    const label = connector.labels[0]?.text;
    const attrs = forward || both ? edgeAttributes(connector, dashed, head, tail) : [];
    return [
      ...commentLines(dslConnectorMeta(connector).comments, ''),
      `${nameOf(from)} ${arrow} ${nameOf(to)}${label ? ` : ${quote(label)}` : ''}${attributeText(attrs)}`,
    ].join('\n');
  };

  const emitNode = (node: SceneNode, indent: string) => {
    lines.push(...commentLines(dslNodeMeta(node).comments, indent));
    lines.push(`${indent}${nodeName(node)}${attributeText(nodeAttributes(node, swatchOf))}`);
  };
  const edges = scene.connectors
    .map((connector) => ({ connector, line: edgeLine(connector), depth: deepestCommon(connector.source.nodeId ?? '', connector.target.nodeId ?? '') }))
    .filter((entry): entry is { connector: SceneConnector; line: string; depth: string | null } => Boolean(entry.line))
    // Stable sort on the parsed line keeps chains and fans in author order.
    .sort((a, b) => dslConnectorMeta(a.connector).line - dslConnectorMeta(b.connector).line);

  const emitGroup = (group: SceneNode, indent: string) => {
    lines.push(...commentLines(dslNodeMeta(group).comments, indent));
    lines.push(`${indent}${options.groupKeyword?.(group) ?? 'group'} ${nodeName(group)}${attributeText(nodeAttributes(group, swatchOf))} {`);
    for (const member of nodes.filter((node) => node.parentId === group.id).sort(compareNodes)) {
      if (options.nodeRef?.(member)) continue;
      emitNode(member, `${indent}  `);
    }
    for (const child of groups.filter((candidate) => candidate.parentId === group.id).sort(compareNodes)) emitGroup(child, `${indent}  `);
    for (const { connector, line } of edges) {
      if (line && deepestCommon(connector.source.nodeId ?? '', connector.target.nodeId ?? '') === group.id) {
        lines.push(`${indent}  ${line.split('\n').join(`\n${indent}  `)}`);
      }
    }
    lines.push(`${indent}}`);
  };

  for (const node of nodes.filter((node) => node.parentId === frame.id).sort(compareNodes)) {
    if (options.nodeRef?.(node)) continue;
    const hasAttributes = nodeAttributes(node, swatchOf).length > 0;
    const needsName = dslNodeMeta(node).name !== undefined || slugifyDslId(nodeReference(node)) !== node.id;
    if (hasAttributes || needsName || !connected.has(node.id)) emitNode(node, '');
  }
  for (const group of groups.filter((group) => group.parentId === frame.id).sort(compareNodes)) emitGroup(group, '');
  const insideGroup = new Set(edges.filter((entry) => entry.depth !== null).map((entry) => entry.connector.id));
  for (const { connector, line } of edges) {
    if (!line || insideGroup.has(connector.id)) continue;
    lines.push(...line.split('\n'));
  }
  if (Array.isArray(frameDsl.align)) lines.push(...frameDsl.align.filter((item): item is string => typeof item === 'string'));
  for (const node of noteCarriers) {
    for (const note of dslNodeMeta(node).notes ?? []) lines.push(`note ${quote(nodeReference(node))} : ${note}`);
  }
  if (Array.isArray(frameDsl.reserved)) lines.push(...frameDsl.reserved.filter((item): item is string => typeof item === 'string'));
  while (lines.length > 0 && lines.at(-1) === '') lines.pop();
  return lines;
}
