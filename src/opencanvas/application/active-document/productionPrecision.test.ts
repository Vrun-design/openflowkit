import { describe, expect, it } from 'vitest';
import { applyDocumentCommand } from '../../domain/commands/execute';
import { createTestDocument, createTestNode } from '../../testing/builders/documentBuilder';
import { buildSetCanvasPrecisionCommand, buildSetNumericNodeGeometryCommand,
  resolveCanvasPrecisionSettings, snapPrecisionPoint } from './productionPrecision';

describe('production precision authoring', () => {
  it('stores bounded grid/guides and applies exact reversible numeric geometry', () => {
    const document = createTestDocument({ nodes: [createTestNode('a')] });
    const precision = buildSetCanvasPrecisionCommand(document.pages[0], {
      gridEnabled: true, snapEnabled: true, gridSize: 0, subdivisions: 99,
      guides: [{ axis: 'x', position: 42 }],
    })!;
    const configured = applyDocumentCommand(document, precision);
    expect(resolveCanvasPrecisionSettings(configured.document.pages[0])).toMatchObject({
      gridSize: 1, subdivisions: 16, guides: [{ axis: 'x', position: 42 }],
    });
    const geometry = buildSetNumericNodeGeometryCommand(configured.document.pages[0], 'a', {
      x: 12, y: 34, width: 200, height: 80, rotationDegrees: 90,
    })!;
    const applied = applyDocumentCommand(configured.document, geometry);
    expect(applied.document.pages[0].nodes[0]).toMatchObject({
      size: { width: 200, height: 80 }, transform: { translation: { x: 12, y: 34 } },
    });
    expect(applyDocumentCommand(applied.document, applied.inverse).document).toEqual(configured.document);
  });

  it('snaps in screen-pixel tolerance to guides, grid, edges, and centers', () => {
    const result = snapPrecisionPoint({ x: 39, y: 98 }, { width: 20, height: 20 }, {
      gridEnabled: true, snapEnabled: true, gridSize: 50, subdivisions: 1,
      guides: [{ axis: 'x', position: 40 }],
    }, [{ x: 0, y: 100, width: 20, height: 20 }], 2, 6);
    expect(result).toEqual({ point: { x: 40, y: 100 }, snappedX: 40, snappedY: 100 });
  });
});
