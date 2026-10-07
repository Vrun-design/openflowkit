import { describe, expect, it } from 'vitest';
import { compileWorkspace } from '../../../dsl/compile';
import { applyDocumentCommand } from '../../domain/commands/execute';
import type { SceneDocumentV1 } from '../../domain/document/types';
import { createEmptyV2Document } from '../../presentation/v2/v2Document';
import { buildWorkspacePagesCommand } from './architectureCommands';
import { pageListEntries } from './pageGroups';

let counter = 0;
const mintId = (prefix: string) => `${prefix}-groups-${counter++}`;

const SHOP = `architecture
title: Shop architecture
model {
  person Customer
  system Shop { container Web { component Cart }  container API }
  Customer -> Shop.Web : uses
}
views {
  view landscape
  view context of Shop
  view container of Shop
  view component of Shop.Web
}
`;
const BANK = 'architecture\nmodel {\n  person Teller\n  system Bank\n  Teller -> Bank\n}\nviews {\n  view context of Bank\n}\n';

async function withWorkspace(document: SceneDocumentV1, text: string): Promise<SceneDocumentV1> {
  const command = buildWorkspacePagesCommand(document, await compileWorkspace(text), { mintId, intoPageId: document.pages[0]!.id })!;
  return applyDocumentCommand(document, command).document;
}

const shape = (document: SceneDocumentV1) => pageListEntries(document.pages).map((entry) =>
  entry.kind === 'group' ? `# ${entry.name}` : `${'  '.repeat(entry.depth)}${entry.page.name}`);

describe('pageListEntries', () => {
  it('lists the views of one model under its name, each a level deeper than the last', async () => {
    const document = await withWorkspace(createEmptyV2Document('d1', 'Shop'), SHOP);
    expect(shape(document)).toEqual([
      '# Shop architecture', 'System landscape', '  Context: Shop', '    Containers: Shop', '      Components: Web',
    ]);
  });

  it('leaves ordinary pages and a model with one view page as plain rows', async () => {
    const document = await withWorkspace(await withWorkspace(createEmptyV2Document('d2', 'Mix'), SHOP), BANK);
    expect(shape(document)).toEqual([
      '# Shop architecture', 'System landscape', '  Context: Shop', '    Containers: Shop', '      Components: Web', 'Context: Bank',
    ]);
    expect(shape(createEmptyV2Document('d3', 'Blank'))).toEqual(['Page 1']);
  });

  it('keeps two models apart, each where its first page is, with an ordinary page between', async () => {
    let document = await withWorkspace(createEmptyV2Document('d4', 'Two'), SHOP);
    const plain = createEmptyV2Document('x', 'x').pages[0]!;
    document = { ...document, pages: [document.pages[0]!, { ...plain, id: 'plain', name: 'Notes' }, ...document.pages.slice(1)] };
    document = await withWorkspace(document, BANK.replace('context of Bank', 'landscape\n  view context of Bank'));
    expect(shape(document)).toEqual([
      '# Shop architecture', 'System landscape', '  Context: Shop', '    Containers: Shop', '      Components: Web',
      'Notes', '# Bank', 'System landscape', '  Context: Bank',
    ]);
  });
});
