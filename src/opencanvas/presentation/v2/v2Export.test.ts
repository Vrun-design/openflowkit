import { describe, expect, it } from 'vitest';
import { applyDocumentCommand } from '../../domain/commands/execute';
import type { DocumentCommand } from '../../domain/commands/types';
import { migrateSceneDocument } from '../../domain/document/migration';
import type { ScenePage } from '../../domain/document/types';
import { createEmptyV2Document } from './v2Document';
import {
  buildInsertConnectorCommand,
  buildInsertShapeCommand,
  buildSetNodeLabelCommand,
} from '../../domain/commands/sceneEdits';
import { buildV2JsonExport, buildV2SvgExport } from './v2Export';

function labeledConnectedDocument() {
  const steps: ((page: ScenePage) => DocumentCommand)[] = [
    (page) => buildInsertShapeCommand(page, { kind: 'rectangle', id: 'node-a', at: { x: 10, y: 20 } }),
    (page) => buildInsertShapeCommand(page, { kind: 'ellipse', id: 'node-b', at: { x: 300, y: 20 } }),
    (page) => buildSetNodeLabelCommand(page, 'node-a', 'Checkout flow'),
    (page) =>
      buildInsertConnectorCommand(page, {
        id: 'edge-1',
        source: { nodeId: 'node-a' },
        target: { nodeId: 'node-b' },
      }),
  ];
  return steps.reduce(
    (document, step) => applyDocumentCommand(document, step(document.pages[0])).document,
    createEmptyV2Document('journey-doc', 'Journey')
  );
}

describe('v2 export', () => {
  // The 04d gate: downloaded JSON re-imported through migration deep-equals
  // the session document.
  it('round-trips JSON through migration without loss', () => {
    const document = labeledConnectedDocument();
    const { filename, json } = buildV2JsonExport(document);
    const migrated = migrateSceneDocument(JSON.parse(json));
    expect(filename).toBe('journey-doc.json');
    expect(migrated.success).toBe(true);
    expect(migrated.success && migrated.document).toEqual(document);
  });

  it('emits SVG containing the label text', () => {
    const { svg, filename } = buildV2SvgExport(labeledConnectedDocument());
    expect(filename).toBe('journey-doc.svg');
    expect(svg).toContain('Checkout flow');
    expect(svg).toContain('data-connector-id="edge-1"');
  });
});
