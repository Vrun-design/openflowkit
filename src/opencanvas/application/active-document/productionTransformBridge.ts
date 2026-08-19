import type { ReactFlowProjection } from '../../infrastructure/reactflow/contracts';
import { projectSceneDocumentToReactFlow } from '../../infrastructure/reactflow/toReactFlow';
import type { SceneDocumentV1 } from '../../domain/document/types';
import type { TransformResult } from '../../domain/transforms/types';
import { applyDocumentCommand } from '../../domain/commands/execute';
import type { DocumentCommand } from '../../domain/commands/types';

export function buildProductionTransformCommand(
  document: SceneDocumentV1,
  pageId: string,
  result: TransformResult
): DocumentCommand {
  const page = document.pages.find((candidate) => candidate.id === pageId);
  if (!page) throw new RangeError(`OpenCanvas page "${pageId}" was not found.`);
  const replacements = new Map(result.nodes.map((node) => [node.id, node]));
  if (replacements.size !== result.nodes.length) {
    throw new TypeError('Transform result contains duplicate node ids.');
  }
  const commands: DocumentCommand[] = result.nodes.map((after) => {
    const before = page.nodes.find((node) => node.id === after.id);
    if (!before) throw new RangeError(`Transform result contains unknown node "${after.id}".`);
    return {
      kind: 'set-node', id: `transform-node:${after.id}`, label: 'Transform node',
      pageId, before, after,
    };
  });
  if (commands.length === 1) return commands[0];
  return { kind: 'batch', id: 'transform-selection', label: 'Transform selection', commands };
}

export function projectProductionTransform(
  document: SceneDocumentV1,
  pageId: string,
  result: TransformResult,
  updatedAt: string
): ReactFlowProjection {
  const command = buildProductionTransformCommand(document, pageId, result);
  const nextDocument: SceneDocumentV1 = {
    ...applyDocumentCommand(document, command).document, updatedAt,
  };
  return projectSceneDocumentToReactFlow(nextDocument, pageId);
}
