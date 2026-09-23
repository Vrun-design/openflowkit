import { describe, expect, it } from 'vitest';
import { compile, compileWorkspace } from '../../../dsl/compile';
import { architectureWorkspaceText } from '../../../dsl/families/architecture/text';
import { archModelOfPage, placedElementId } from '../../../dsl/model/model';
import { applyDocumentCommand } from '../../domain/commands/execute';
import { frameScene } from '../../../dsl/frameScene';
import { serialize } from '../../../dsl/serialize';
import type { DocumentCommand } from '../../domain/commands/types';
import type { SceneDocumentV1, SceneNode, ScenePage } from '../../domain/document/types';
import { createEmptyV2Document, createEmptyV2Page } from '../../presentation/v2/v2Document';
import { buildArchElementEditCommand, buildArchIconsOffCommand, buildArchRemoveIconsCommand, buildWorkspacePagesCommand } from './architectureCommands';
import { buildDslPageCommand } from './dslPageCommand';
import { buildAutoIconsOffCommand, buildRemoveIconCommand, hasAutoIcon, refreshAutoIcon, withoutIcon } from './iconCommands';

const resolveIcon = (id: string) => ({ packId: 'pack', shapeId: id.split('/')[1]! });

async function diagram(text: string): Promise<{ page: ScenePage; frameId: string }> {
  const compiled = await compile(text, { resolveIcon, autoIcons: true });
  const command = buildDslPageCommand(createEmptyV2Page(), compiled) as Extract<DocumentCommand, { kind: 'set-page' }>;
  return { page: command.after, frameId: compiled.frame.id };
}

function apply(page: ScenePage, command: DocumentCommand | null): ScenePage {
  if (command?.kind !== 'batch') throw new Error('expected a batch');
  const after = new Map(command.commands.map((entry) => {
    if (entry.kind !== 'set-node') throw new Error('expected set-node');
    return [entry.after.id, entry.after] as const;
  }));
  return { ...page, nodes: page.nodes.map((node) => after.get(node.id) ?? node) };
}

const byLabel = (page: ScenePage, label: string): SceneNode => page.nodes.find((node) => node.content.label === label)!;
const text = (page: ScenePage, frameId: string) => serialize(frameScene(page, frameId)!);

describe('icon commands', () => {
  it('turns one node back into its plain shape, centred, and opts it out in the text', async () => {
    const { page, frameId } = await diagram('flowchart\nPostgres [cylinder, blue] -> Redis');
    const card = byLabel(page, 'Postgres');
    const next = apply(page, buildRemoveIconCommand(page, [card.id]));
    const plain = byLabel(next, 'Postgres');
    expect(plain).toMatchObject({ kind: 'process', content: { shape: 'cylinder' }, metadata: { dsl: { icon: 'none' } } });
    expect(plain.content.icon).toBeUndefined();
    expect(plain.appearance.fill).toBeTypeOf('string');
    const centre = (node: SceneNode) => node.transform.translation.x + node.size.width / 2;
    expect(centre(plain)).toBeCloseTo(centre(card));
    expect(hasAutoIcon(byLabel(next, 'Redis'))).toBe(true);
    const dsl = text(next, frameId);
    expect(dsl).toContain('Postgres [cylinder, blue, icon: none]');
    const again = await compile(dsl, { resolveIcon, autoIcons: true });
    expect(again.nodes.find((node) => node.content.label === 'Postgres')!.content.icon).toBeUndefined();
  });

  it('ignores nodes without an icon', async () => {
    const { page } = await diagram('flowchart\nValidate input');
    expect(buildRemoveIconCommand(page, [byLabel(page, 'Validate input').id])).toBeNull();
  });

  it('turns a whole diagram off in one step and keeps authored icons', async () => {
    const { page, frameId } = await diagram('flowchart\nPostgres -> Redis -> Worker [aws/compute-ec2]');
    const next = apply(page, buildAutoIconsOffCommand(page, frameId));
    expect(byLabel(next, 'Postgres').content.icon).toBeUndefined();
    expect(byLabel(next, 'Redis').content.icon).toBeUndefined();
    expect(byLabel(next, 'Worker').content.icon).toBe('aws/compute-ec2');
    const dsl = text(next, frameId);
    expect(dsl).toContain('icons: off');
    expect(dsl).not.toContain('icon: none');
    const again = await compile(dsl, { resolveIcon, autoIcons: true });
    expect(again.nodes.filter((node) => node.content.icon).map((node) => node.content.label)).toEqual(['Worker']);
  });
});

describe('icons on a C4 workspace', () => {
  const WORKSPACE = `architecture
appearance: paper
model {
  system Shop {
    container Web [tech: React]
    container API [tech: Node.js]
    store DB [tech: PostgreSQL]
    worker = container Worker [icon: aws/compute-ec2]
    Web -> API
    API -> DB
  }
}
views {
  view container of Shop
  view landscape
}
`;

  async function workspaceDocument(text = WORKSPACE): Promise<SceneDocumentV1> {
    const workspace = await compileWorkspace(text, { resolveIcon, autoIcons: true });
    const empty = createEmptyV2Document('doc-1', 'Shop');
    let id = 0;
    const command = buildWorkspacePagesCommand(empty, workspace, { mintId: (prefix) => `${prefix}-icons-${id++}` })!;
    return applyDocumentCommand(empty, command).document;
  }
  const placements = (document: SceneDocumentV1, elementId: string) => document.pages
    .flatMap((page) => page.nodes).filter((node) => placedElementId(node) === elementId);
  const text = (document: SceneDocumentV1) => architectureWorkspaceText(document.pages.map(archModelOfPage).find(Boolean)!);

  it('takes one element\'s icon off in every view, as the plain element, in one step', async () => {
    const document = await workspaceDocument();
    const before = placements(document, 'shop.db');
    expect(before.length).toBeGreaterThan(0);
    expect(before.every((node) => node.content.icon === 'developer/database-postgresql')).toBe(true);
    const command = buildArchRemoveIconsCommand(document, ['shop.db'])!;
    const after = applyDocumentCommand(document, command).document;
    const plain = placements(after, 'shop.db');
    expect(plain.every((node) => node.kind === 'process' && node.content.shape === 'cylinder' && !node.content.icon)).toBe(true);
    expect(plain.every((node) => node.content.subLabel === 'PostgreSQL')).toBe(true);
    expect(placements(after, 'shop.api')[0]!.content.icon).toBe('developer/backend-nodejs');
    expect(text(after)).toContain('icon: none');
    const again = await workspaceDocument(text(after));
    expect(placements(again, 'shop.db')[0]!.content.icon).toBeUndefined();
  });

  it('turns the workspace off in every view and keeps authored icons and the palette', async () => {
    const document = await workspaceDocument();
    const after = applyDocumentCommand(document, buildArchIconsOffCommand(document)!).document;
    const icons = after.pages.flatMap((page) => page.nodes).map((node) => node.content.icon).filter(Boolean);
    expect(new Set(icons)).toEqual(new Set(['aws/compute-ec2']));
    const dsl = text(after);
    expect(dsl).toContain('icons: off');
    expect(dsl).toContain('appearance: paper');
    const again = await workspaceDocument(dsl);
    expect(placements(again, 'shop.web')[0]!.content.icon).toBeUndefined();
    expect(buildArchIconsOffCommand(after)).toBeNull();
  });
});

describe('renaming a node with an inferred icon', () => {
  const strip = (node: SceneNode) => withoutIcon(node, false);

  it('swaps to the new label\'s icon, or back to the plain shape, and leaves chosen icons alone', async () => {
    const { page } = await diagram('flowchart\nPostgres -> Worker [aws/compute-ec2]\nValidate input');
    const postgres = byLabel(page, 'Postgres');
    const renamed = refreshAutoIcon({ ...postgres, content: { ...postgres.content, label: 'MySQL' } }, 'MySQL', undefined, resolveIcon, strip);
    expect(renamed.content).toMatchObject({ icon: 'developer/database-mysql', archIconShapeId: 'database-mysql' });
    expect(renamed.metadata.dsl).toMatchObject({ autoIcon: 'developer/database-mysql' });
    const nothing = refreshAutoIcon({ ...postgres, content: { ...postgres.content, label: 'Ledger' } }, 'Ledger', undefined, resolveIcon, strip);
    expect(nothing).toMatchObject({ kind: 'process', content: { label: 'Ledger' } });
    expect(nothing.content.icon).toBeUndefined();
    const worker = byLabel(page, 'Worker');
    expect(refreshAutoIcon(worker, 'Postgres', undefined, resolveIcon, strip)).toBe(worker);
    const plain = byLabel(page, 'Validate input');
    expect(refreshAutoIcon(plain, 'Postgres', undefined, resolveIcon, strip)).toBe(plain);
  });

  it('follows a C4 element\'s rename or new tech in every view', async () => {
    const compiled = await compileWorkspace('architecture\nmodel {\n  system Shop {\n    container Web [tech: React]\n    store DB\n  }\n}\nviews {\n  view container of Shop\n}\n', { resolveIcon, autoIcons: true });
    const empty = createEmptyV2Document('doc-1', 'Shop');
    let id = 0;
    const document = applyDocumentCommand(empty, buildWorkspacePagesCommand(empty, compiled, { mintId: (prefix) => `${prefix}-rename-${id++}` })!).document;
    const placed = (doc: SceneDocumentV1, elementId: string) => doc.pages.flatMap((page) => page.nodes).find((node) => placedElementId(node) === elementId)!;
    const vue = applyDocumentCommand(document, buildArchElementEditCommand(document, 'shop.web', { tech: 'Vue' }, resolveIcon)!).document;
    expect(placed(vue, 'shop.web').content.icon).toBe('developer/frontend-vuejs');
    const redis = applyDocumentCommand(document, buildArchElementEditCommand(document, 'shop.db', { name: 'Redis' }, resolveIcon)!).document;
    expect(placed(redis, 'shop.db').content.icon).toBe('developer/database-redis');
    const ledger = applyDocumentCommand(redis, buildArchElementEditCommand(redis, 'shop.db', { name: 'Ledger' }, resolveIcon)!).document;
    expect(placed(ledger, 'shop.db')).toMatchObject({ kind: 'process', content: { label: 'Ledger' } });
  });
});
