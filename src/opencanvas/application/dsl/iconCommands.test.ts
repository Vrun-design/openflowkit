import { describe, expect, it } from 'vitest';
import { compile } from '../../../dsl/compile';
import { frameScene } from '../../../dsl/frameScene';
import { serialize } from '../../../dsl/serialize';
import type { DocumentCommand } from '../../domain/commands/types';
import type { SceneNode, ScenePage } from '../../domain/document/types';
import { createEmptyV2Page } from '../../presentation/v2/v2Document';
import { buildDslPageCommand } from './dslPageCommand';
import { buildAutoIconsOffCommand, buildRemoveIconCommand, hasAutoIcon } from './iconCommands';

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
