import type { SceneConnector, SceneNode } from '../opencanvas/domain/document/types';
import { resolveFreeformNodePresentation } from '../opencanvas/domain/nodes/freeformNodePresentation';
import type { DslFrameScene } from './sceneMeta';
import { serialize, type SerializeResult } from './serialize';

// What the text cannot say back. Serializing is lossy in exactly the ways the
// scene is richer than the language — canvas geometry (positions, sizes) is
// expected to be regenerated, so it is not a loss; paint and interaction
// styling that has no grammar word is.

const TEXT_STYLE_KEYS = ['fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'textDecoration', 'textAlign', 'lineHeight', 'letterSpacing', 'textPadding'] as const;

function labelOf(node: SceneNode): string {
  return typeof node.content.label === 'string' && node.content.label ? node.content.label : node.id;
}

function nodeLosses(node: SceneNode): string[] {
  const losses: string[] = [];
  const freeform = resolveFreeformNodePresentation(node);
  if (freeform && (freeform.kind === 'pen' || freeform.kind === 'highlighter' || freeform.kind === 'line' || freeform.kind === 'arrow')) {
    return [`${labelOf(node)}: freehand strokes have no text form`];
  }
  if (node.transform.rotationRadians !== 0) losses.push(`${labelOf(node)}: rotation is not in the language`);
  if (node.transform.scale.x !== 1 || node.transform.scale.y !== 1) losses.push(`${labelOf(node)}: scale is not in the language`);
  const opacity = node.appearance.opacity;
  if (typeof opacity === 'number' && opacity !== 1) losses.push(`${labelOf(node)}: opacity is not in the language`);
  const styled = TEXT_STYLE_KEYS.filter((key) => node.appearance[key] !== undefined);
  if (styled.length > 0) losses.push(`${labelOf(node)}: text style (${styled.join(', ')}) is not in the language`);
  if (typeof node.content.subLabel === 'string' && node.content.subLabel) losses.push(`${labelOf(node)}: sub-labels are not in the language`);
  return losses;
}

function connectorLosses(connector: SceneConnector, index: number): string[] {
  const losses: string[] = [];
  const name = `connector ${index + 1}`;
  if (connector.waypoints.length > 0) losses.push(`${name}: manual waypoints are redrawn by the layout`);
  const opacity = connector.appearance.opacity;
  if (typeof opacity === 'number' && opacity !== 1) losses.push(`${name}: opacity is not in the language`);
  if (connector.appearance.arrowSize !== undefined) losses.push(`${name}: arrow size is not in the language`);
  return losses;
}

export function serializeLosses(scene: DslFrameScene): readonly string[] {
  return [
    ...scene.nodes.flatMap(nodeLosses),
    ...(scene.groups ?? []).flatMap((group) => (group.transform.rotationRadians !== 0
      ? [`${labelOf(group)}: rotation is not in the language`] : [])),
    ...scene.connectors.flatMap(connectorLosses),
  ];
}

/** Canonical text plus the honest list of what the round-trip drops. */
export function serializeWithLosses(scene: DslFrameScene): SerializeResult {
  return { dsl: serialize(scene), losses: serializeLosses(scene) };
}
