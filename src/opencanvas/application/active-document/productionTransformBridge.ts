import type { SceneDocumentV1 } from '../../domain/document/types';
import type { TransformResult } from '../../domain/transforms/types';
import type { DocumentCommand } from '../../domain/commands/types';
import { bakeTransformScale } from '../../domain/transforms/bakeScale';

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
  const commands: DocumentCommand[] = result.nodes.map((scaled) => {
    const before = page.nodes.find((node) => node.id === scaled.id);
    if (!before) throw new RangeError(`Transform result contains unknown node "${scaled.id}".`);
    return {
      kind: 'set-node', id: `transform-node:${scaled.id}`, label: 'Transform node',
      pageId, before, after: bakeTransformScale(scaled),
    };
  });
  if (commands.length === 1) return commands[0];
  return { kind: 'batch', id: 'transform-selection', label: 'Transform selection', commands };
}
