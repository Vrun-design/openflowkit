import type { ArchModel, ArchView } from '../../model/types';
import { compileGraph, parseGraphStatements } from '../graph';
import type { Family, FamilyContext, FamilyScene, FamilyViewScene } from '../types';
import { parseArchitectureWorkspace } from './parse';
import { compileArchitectureView } from './scene';
import { architectureText } from './text';

/**
 * The architecture family, v2: C4 blocks get model semantics and one frame per
 * view; anything else in the family stays plain graph syntax (the v1 contract).
 */
export const architectureFamily: Family = {
  name: 'architecture',

  async compile(segments, context) {
    const workspace = parseArchitectureWorkspace(segments, context.diagnostics);
    if (!workspace) return compileGraphGraph(segments, context);
    const view = primaryView(workspace.model);
    return withReserved(await compileArchitectureView(workspace.model, view, context), workspace.reserved);
  },

  async compileViews(segments, context): Promise<readonly FamilyViewScene[]> {
    const workspace = parseArchitectureWorkspace(segments, context.diagnostics);
    if (!workspace) {
      return [{ id: 'primary', name: context.title ?? 'Diagram', scene: await compileGraphGraph(segments, context) }];
    }
    const views = workspace.model.views.length > 0 ? workspace.model.views : [implicitView(workspace.model)];
    const out: FamilyViewScene[] = [];
    for (const view of views) {
      const scene = await compileArchitectureView(workspace.model, view, context);
      out.push({ id: view.id, name: view.name, scene: withReserved(scene, workspace.reserved) });
    }
    return out;
  },

  serialize: architectureText,
};

async function compileGraphGraph(segments: Parameters<Family['compile']>[0], context: FamilyContext): Promise<FamilyScene> {
  const statements = parseGraphStatements(segments, context.diagnostics);
  return compileGraph({ statements, family: 'architecture' }, context);
}

/** The view the single-frame pipeline renders when a workspace has several. */
export function primaryView(model: ArchModel): ArchView {
  return model.views[0] ?? implicitView(model);
}

function implicitView(model: ArchModel): ArchView {
  return {
    id: 'view:landscape',
    kind: 'landscape',
    name: model.name ?? 'System landscape',
    rules: [],
  };
}

function withReserved(scene: FamilyScene, reserved: readonly string[]): FamilyScene {
  if (reserved.length === 0) return scene;
  return { ...scene, meta: { ...scene.meta, reserved: [...reserved] } };
}
