import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { compileWorkspace } from '../../../dsl/compile';
import { applyDocumentCommand } from '../../domain/commands/execute';
import type { SceneDocumentV1 } from '../../domain/document/types';
import { buildWorkspacePagesCommand } from '../../application/dsl/architectureCommands';
import { useV2Architecture } from './useV2Architecture';
import { createEmptyV2Document } from './v2Document';

let counter = 0;
const mintId = (prefix: string) => `${prefix}-arch-${counter++}`;
const model = (person: string, system: string) =>
  `architecture\nmodel {\n  person ${person}\n  system ${system} { container Web }\n  ${person} -> ${system}\n}\nviews {\n  view landscape\n  view container of ${system}\n}\n`;

async function withModel(document: SceneDocumentV1, text: string): Promise<SceneDocumentV1> {
  const command = buildWorkspacePagesCommand(document, await compileWorkspace(text), { mintId, intoPageId: document.pages[0]!.id })!;
  return applyDocumentCommand(document, command).document;
}

describe('useV2Architecture with two models in one document', () => {
  it('climbs to its own landscape and never to the other model', async () => {
    const document = await withModel(await withModel(createEmptyV2Document('d', 'Two'), model('Alice', 'Shop')), model('Bob', 'Bank'));
    const [aliceLandscape, , bobLandscape, bobContainers] = document.pages;
    const { result } = renderHook(() => useV2Architecture(document, bobContainers!));
    expect(result.current.breadcrumb.map((crumb) => crumb.pageId)).toEqual([bobLandscape!.id, bobContainers!.id]);
    expect(result.current.pageForView('view:landscape')?.id).toBe(bobLandscape!.id);
    expect(result.current.pageForView('view:landscape')?.id).not.toBe(aliceLandscape!.id);
  });
});
