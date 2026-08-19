import { describe, expect, it } from 'vitest';
import { createTestDocument, createTestNode } from '../../testing/builders/documentBuilder';
import { applyDocumentCommand } from '../../domain/commands/execute';
import { buildProductionNodePropertiesCommand, nodePropertyFields } from './productionNodeProperties';

const FAMILY_KINDS = [
  'process', 'text', 'image', 'annotation', 'architecture', 'group', 'section', 'swimlane',
  'class', 'er_entity', 'mindmap', 'journey', 'sequence_participant', 'sequence_note',
  'sequence_fragment', 'browser', 'mobile',
] as const;

describe('production node property editing', () => {
  it('defines typed fields for every production family', () => {
    for (const kind of FAMILY_KINDS) {
      expect(nodePropertyFields(createTestNode(kind, { kind })).length, kind).toBeGreaterThanOrEqual(3);
    }
  });

  it('builds one reversible canonical command and preserves opaque content', () => {
    const node = createTestNode('journey', {
      kind: 'journey', content: { label: 'Step', journeyScore: 2, opaque: { keep: true } },
    });
    const document = createTestDocument({ nodes: [node] });
    const command = buildProductionNodePropertiesCommand(document.pages[0], node.id, {
      journeyActor: 'Buyer', journeyScore: 99, colorMode: 'filled',
    })!;
    const applied = applyDocumentCommand(document, command);
    expect(applied.document.pages[0].nodes[0].content).toMatchObject({
      journeyActor: 'Buyer', journeyScore: 5, colorMode: 'filled', opaque: { keep: true },
    });
    expect(applyDocumentCommand(applied.document, applied.inverse).document).toEqual(document);
  });

  it('supports line arrays and validated JSON family payloads', () => {
    const classNode = createTestNode('class', { kind: 'class' });
    const classPage = createTestDocument({ nodes: [classNode] }).pages[0];
    expect(buildProductionNodePropertiesCommand(classPage, classNode.id, {
      classAttributes: ['+ id: UUID', '- secret: string'],
    })?.after.content.classAttributes).toEqual(['+ id: UUID', '- secret: string']);

    const entity = createTestNode('entity', { kind: 'er_entity' });
    const entityPage = createTestDocument({ nodes: [entity] }).pages[0];
    const fields = [{ name: 'id', dataType: 'UUID', isPrimaryKey: true }];
    expect(buildProductionNodePropertiesCommand(entityPage, entity.id, { erFields: fields })
      ?.after.content.erFields).toEqual(fields);
  });

  it('rejects unknown fields and invalid select values and skips no-ops', () => {
    const node = createTestNode('node', { kind: 'process' });
    const page = createTestDocument({ nodes: [node] }).pages[0];
    expect(() => buildProductionNodePropertiesCommand(page, node.id, { secret: 'no' }))
      .toThrow(/not editable/);
    expect(() => buildProductionNodePropertiesCommand(page, node.id, { shape: 'star' }))
      .toThrow(/unsupported/);
    expect(buildProductionNodePropertiesCommand(page, node.id, { subLabel: '' })).toBeNull();
  });

  it('accepts only validated custom SVG polygon geometry', () => {
    const node = createTestNode('custom', { kind: 'custom' });
    const page = createTestDocument({ nodes: [node] }).pages[0];
    expect(buildProductionNodePropertiesCommand(page, node.id, {
      shape: 'custom-path', customSvgPath: ' M0,0 L100,0 L50,100 Z ',
    })?.after.content).toMatchObject({
      shape: 'custom-path', customSvgPath: 'M0,0 L100,0 L50,100 Z',
    });
    expect(() => buildProductionNodePropertiesCommand(page, node.id, {
      shape: 'custom-path', customSvgPath: 'M0 0 C 1 2 3 4 5 6 Z',
    })).toThrow(/unsupported syntax/);
  });
});
