import { describe, expect, it } from 'vitest';
import { applyDocumentCommand } from '../../domain/commands/execute';
import { createTestDocument, createTestNode } from '../../testing/builders/documentBuilder';
import { buildCreateSymbolDefinitionCommand, buildCreateSymbolInstanceCommand,
  buildSetSymbolOverridesCommand, buildUpdateSymbolDefinitionCommand, symbolBinding } from './productionSymbols';

describe('production symbols', () => {
  it('creates linked instances, preserves overrides during propagation, and reverses exactly', () => {
    const source = createTestNode('card', { content: { label: 'Card', color: 'blue' }, appearance: { opacity: 1 } });
    const initial = createTestDocument({ nodes: [source] });
    const defined = applyDocumentCommand(initial,
      buildCreateSymbolDefinitionCommand(initial.pages[0], 'card', 'card-symbol')).document;
    expect(symbolBinding(defined.pages[0].nodes[0])).toMatchObject({ role: 'definition', definitionId: 'card-symbol' });
    const instanced = applyDocumentCommand(defined,
      buildCreateSymbolInstanceCommand(defined.pages[0], 'card-symbol', 'card-instance')).document;
    const overridden = applyDocumentCommand(instanced,
      buildSetSymbolOverridesCommand(instanced.pages[0], 'card-instance', {
        content: { label: 'Special card' }, appearance: { opacity: 0.5 },
      })).document;
    const currentDefinition = overridden.pages[0].nodes[0];
    const propagation = buildUpdateSymbolDefinitionCommand(overridden.pages[0], 'card-symbol', {
      ...currentDefinition, content: { label: 'Card v2', color: 'red' }, appearance: { opacity: 0.9 },
      size: { width: 200, height: 90 }, ports: [],
    });
    const applied = applyDocumentCommand(overridden, propagation);
    expect(applied.document.pages[0].nodes[1]).toMatchObject({
      content: { label: 'Special card', color: 'red' }, appearance: { opacity: 0.5 },
      size: { width: 200, height: 90 },
    });
    expect(applyDocumentCommand(applied.document, applied.inverse).document).toEqual(overridden);
  });

  it('rejects missing and duplicate definitions', () => {
    const document = createTestDocument({ nodes: [createTestNode('node')] });
    expect(() => buildCreateSymbolInstanceCommand(document.pages[0], 'missing', 'instance')).toThrow(/not found/);
    const defined = applyDocumentCommand(document,
      buildCreateSymbolDefinitionCommand(document.pages[0], 'node', 'symbol')).document;
    expect(() => buildCreateSymbolDefinitionCommand(defined.pages[0], 'node', 'symbol')).toThrow(/already exists/);
  });
});
