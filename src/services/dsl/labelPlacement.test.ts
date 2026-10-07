import ELK from 'elkjs/lib/elk.bundled.js';
import { describe, expect, it } from 'vitest';
import { compile, compileWorkspace, type CompileResult } from '../../dsl/compile';
import { connectorLabelPlate } from '../../opencanvas/domain/connectors/labelStyle';
import { projectPageConnectors } from '../../opencanvas/domain/connectors/routeProjection';
import { intersectsBounds } from '../../opencanvas/domain/geometry/bounds';
import { buildNodeWorldMatrices, nodeWorldBounds } from '../../opencanvas/domain/scene/worldGeometry';
import { createTestDocument } from '../../opencanvas/testing/builders/documentBuilder';
import bigBank from './fixtures/structurizr-real/big-bank-plc.dsl?raw';
import platform from './fixtures/mermaid/platform.mmd?raw';
import { createElkLayoutPort } from './elkLayoutPort';
import { mermaidToDsl } from './mermaidToDsl';
import { structurizrToDsl } from './structurizrToDsl';

const layout = createElkLayoutPort(async () => new ELK());

/** The label plates of a compiled diagram, and the leaf nodes they must stay off. */
function labelsOf(result: CompileResult) {
  const page = { ...createTestDocument({ nodes: [] }).pages[0]!, nodes: [result.frame, ...result.groups, ...result.nodes], connectors: result.connectors };
  const matrices = buildNodeWorldMatrices(page);
  const parents = new Set(page.nodes.map((node) => node.parentId));
  const leaves = page.nodes.filter((node) => !parents.has(node.id)).map((node) => ({ id: node.id, box: nodeWorldBounds(node, matrices.get(node.id)!) }));
  const plates = projectPageConnectors(page).flatMap((edge) => edge.labels.map((label) => ({ id: `${edge.id}:${label.text}`, box: connectorLabelPlate(label.text, edge.presentation.label, label.point) })));
  return { plates, leaves };
}

function collisions(result: CompileResult) {
  const { plates, leaves } = labelsOf(result);
  const onEachOther = plates.flatMap((one, index) => plates.slice(index + 1).filter((other) => intersectsBounds(one.box, other.box)).map((other) => `${one.id} × ${other.id}`));
  const onNodes = plates.flatMap((plate) => leaves.filter((leaf) => intersectsBounds(leaf.box, plate.box)).map((leaf) => `${plate.id} × ${leaf.id}`));
  return { labels: plates.length, onEachOther, onNodes };
}

describe('connector labels on real diagrams', () => {
  it('the platform flowchart keeps every label off the others and off the nodes', async () => {
    const converted = mermaidToDsl(platform);
    if ('error' in converted) throw new Error(converted.error);
    const found = collisions(await compile(converted.dsl, { layout }));
    expect(found.labels).toBeGreaterThan(20);
    expect(found).toMatchObject({ onEachOther: [], onNodes: [] });
  }, 60_000);

  it('every Big Bank view does too, long labels included', async () => {
    const bank = structurizrToDsl(bigBank);
    if ('error' in bank) throw new Error(bank.error);
    const workspace = await compileWorkspace(bank.dsl, { layout });
    for (const view of workspace.views) {
      expect({ view: view.name, ...collisions(view.result) }).toMatchObject({ onEachOther: [], onNodes: [] });
    }
  }, 60_000);
});
