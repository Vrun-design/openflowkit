import type { DocumentCommand } from '../../domain/commands/types';
import type { SceneConnector, SceneNode, ScenePage } from '../../domain/document/types';

export interface DiagramLintIssue {
  readonly id: string;
  readonly severity: 'error' | 'warning';
  readonly message: string;
  readonly nodeId?: string;
  readonly connectorId?: string;
  readonly fix?: DocumentCommand;
}

function setNodeFix(page: ScenePage, before: SceneNode, content: SceneNode['content'], label: string): DocumentCommand {
  return { kind: 'set-node', id: `lint-fix:${before.id}:${label}`, label, pageId: page.id,
    before, after: { ...before, content } };
}

export function assertSemanticConnectorConstraint(
  page: ScenePage, source: SceneNode, target: SceneNode
): void {
  const kind = page.diagramKind.toLowerCase();
  if (kind.includes('class') && (source.kind !== 'class' || target.kind !== 'class')) {
    throw new TypeError('Class diagram relationships must connect class nodes.');
  }
  if ((kind === 'er' || kind.includes('entity'))
    && (source.kind !== 'er_entity' || target.kind !== 'er_entity')) {
    throw new TypeError('ER relationships must connect entity nodes.');
  }
  if (kind.includes('sequence')
    && (source.kind !== 'sequence_participant' || target.kind !== 'sequence_participant')) {
    throw new TypeError('Sequence messages must connect participant lifelines.');
  }
  if (kind.includes('state') && /^state_start_/.test(target.id)) {
    throw new TypeError('Initial state cannot be a transition target.');
  }
  if (kind.includes('mindmap') && source.id === target.id) {
    throw new TypeError('Mindmap branches cannot connect a topic to itself.');
  }
}

export function lintStructuredPage(page: ScenePage): readonly DiagramLintIssue[] {
  const issues: DiagramLintIssue[] = [];
  const sequenceOrders = new Map<number, string>();
  for (const node of page.nodes) {
    if (node.kind === 'journey') {
      const score = node.content.journeyScore;
      if (typeof score !== 'number' || !Number.isFinite(score) || score < 1 || score > 5) {
        const fixed = Math.min(5, Math.max(1, typeof score === 'number' && Number.isFinite(score) ? score : 3));
        issues.push({ id: `journey-score:${node.id}`, severity: 'error', nodeId: node.id,
          message: 'Journey score must be between 1 and 5.',
          fix: setNodeFix(page, node, { ...node.content, journeyScore: fixed }, 'Clamp journey score') });
      }
    }
    if (node.kind === 'mindmap' && node.parentId && node.content.mindmapSide !== 'left'
      && node.content.mindmapSide !== 'right') {
      issues.push({ id: `mindmap-side:${node.id}`, severity: 'warning', nodeId: node.id,
        message: 'Mindmap child must have a left or right branch side.',
        fix: setNodeFix(page, node, { ...node.content, mindmapSide: 'right' }, 'Set mindmap branch side') });
    }
    if (node.kind === 'er_entity' && Array.isArray(node.content.erFields)) {
      const names = node.content.erFields.flatMap((field) => field && typeof field === 'object'
        && !Array.isArray(field) && typeof field.name === 'string' ? [field.name.trim().toLowerCase()] : []);
      if (new Set(names).size !== names.length) issues.push({ id: `er-fields:${node.id}`,
        severity: 'error', nodeId: node.id, message: 'Entity field names must be unique.' });
    }
    if (node.kind === 'sequence_note' && typeof node.content.seqMessageOrder === 'number') {
      const order = node.content.seqMessageOrder;
      const previous = sequenceOrders.get(order);
      if (previous) issues.push({ id: `sequence-order:${node.id}`, severity: 'warning', nodeId: node.id,
        message: `Sequence message order ${order} is also used by ${previous}.`,
        fix: setNodeFix(page, node, { ...node.content, seqMessageOrder: order + 1 }, 'Advance sequence order') });
      else sequenceOrders.set(order, node.id);
    }
  }
  for (const connector of page.connectors) {
    const source = page.nodes.find(({ id }) => id === connector.source.nodeId);
    const target = page.nodes.find(({ id }) => id === connector.target.nodeId);
    if (!source || !target) continue;
    try {
      assertSemanticConnectorConstraint(page, source, target);
    } catch (error) {
      issues.push({ id: `connector-semantics:${connector.id}`, severity: 'error', connectorId: connector.id,
        message: error instanceof Error ? error.message : 'Connector violates diagram semantics.' });
    }
    if (page.diagramKind.toLowerCase().includes('architecture')
      && typeof connector.semantics.protocol !== 'string') {
      const after: SceneConnector = { ...connector,
        semantics: { ...connector.semantics, protocol: 'HTTPS' } };
      issues.push({ id: `architecture-protocol:${connector.id}`, severity: 'warning', connectorId: connector.id,
        message: 'Architecture connection should declare a protocol.',
        fix: { kind: 'set-connector', id: `lint-fix:${connector.id}:protocol`, label: 'Set HTTPS protocol',
          pageId: page.id, before: connector, after } });
    }
  }
  return issues.sort((a, b) => a.id.localeCompare(b.id));
}
