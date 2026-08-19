import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { toFigmaSVG } from '@/services/figmaExportService';
import { toMermaid } from '@/services/exportService';
import { serializeSceneDocument, stringifyCanonicalJson } from '../../domain/document/serialization';
import { createPixiSpikeDocument } from '../../infrastructure/pixi/spikeFixture';
import { projectSceneDocumentToReactFlow } from '../../infrastructure/reactflow/toReactFlow';

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

describe('OpenCanvas mixed-family export goldens', () => {
  it('keeps canonical JSON, legacy JSON, editable SVG, and Mermaid outputs stable', async () => {
    const document = createPixiSpikeDocument(30);
    const projection = projectSceneDocumentToReactFlow(document, document.pages[0].id);
    const canonicalJson = serializeSceneDocument(document);
    const legacyJson = stringifyCanonicalJson({
      nodes: projection.nodes,
      edges: projection.edges,
      diagramType: projection.diagramType,
    });
    const figmaSvg = await toFigmaSVG(projection.nodes, projection.edges);
    const mermaid = toMermaid(projection.nodes, projection.edges);

    expect(canonicalJson).toContain('"seqParticipantAlias": "buyer"');
    expect(canonicalJson).toContain('"kind": "browser"');
    expect(canonicalJson).toContain('"variant": "dashboard"');
    expect(legacyJson).toContain('"classAttributes"');
    expect(figmaSvg).toContain('<g id="sections">');
    expect(figmaSvg).toContain('OpenFlowKit diagram export');
    expect(mermaid).toContain('flowchart');

    expect({
      canonicalJson: sha256(canonicalJson),
      legacyJson: sha256(legacyJson),
      figmaSvg: sha256(figmaSvg),
      mermaid: sha256(mermaid),
    }).toMatchInlineSnapshot(`
      {
        "canonicalJson": "d50e49111c7aba1970ccbcc7b7440978fdfe9ee4fff235a153f8f3649ea73d51",
        "figmaSvg": "716ea25c6e6bb4a37e5cc61e5208db8e1e3352f0e55abc6d6d63e3f032fcc52a",
        "legacyJson": "e1c2e2f96da7f8555d9a50e446f17d0e230245865d943a514114080e2d09d3bb",
        "mermaid": "ceaa6739e62810079662052144272521c3b88de0899c39e006e9810e7d5bcd1d",
      }
    `);
  });
});
