import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile, type CompileResult } from '../../../dsl/compile';
import type { SceneDocumentV1 } from '../../domain/document/types';
import { exportCanonicalSvg } from './canonicalSvg';

// Export goldens: one real fixture per family, compiled and rendered to SVG.
// A change that moves geometry, ink or typography shows up as a diff here —
// that is the point. Update with `vitest -u` only when the change is intended.
const FIXTURES: readonly { readonly family: string; readonly file: string }[] = [
  { family: 'flowchart', file: '01-tiny-connection.dsl' },
  { family: 'flowchart-groups', file: '05-groups.dsl' },
  { family: 'architecture', file: 'architecture/aws-3tier.dsl' },
  { family: 'sequence', file: 'sequence/basic.dsl' },
  { family: 'state', file: 'state/basic.dsl' },
  { family: 'erd', file: 'erd/shop.dsl' },
  { family: 'class', file: 'class/shop.dsl' },
  { family: 'gitgraph', file: 'gitgraph/basic.dsl' },
  { family: 'mindmap', file: 'mindmap/product.dsl' },
  { family: 'shape-library', file: 'shapes/library.dsl' },
  { family: 'edge-markers', file: 'flowchart/markers.dsl' },
] as const;

function documentFrom(compiled: CompileResult, name: string): SceneDocumentV1 {
  return {
    format: 'openflowkit.scene', schemaVersion: 1, id: 'golden', name,
    createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    pages: [{
      id: 'page-1', name: 'Page 1', diagramKind: compiled.meta.family,
      layers: [{ id: 'default', name: 'Layer 1', visible: true, locked: false }],
      nodes: [compiled.frame, ...compiled.groups, ...compiled.nodes],
      connectors: compiled.connectors, metadata: {}, extensions: {},
    }],
    metadata: {}, extensions: {},
  } as SceneDocumentV1;
}

function readFixture(file: string): string {
  return readFileSync(join(process.cwd(), 'src/dsl/fixtures', file), 'utf8');
}

describe('canonical SVG goldens', () => {
  for (const { family, file } of FIXTURES) {
    it(`renders ${family}`, async () => {
      const source = readFixture(file);
      const compiled = await compile(source);
      const svg = exportCanonicalSvg(documentFrom(compiled, family), { theme: 'light', pixelRatio: 2 });
      expect(svg).toMatchSnapshot();
      const dark = exportCanonicalSvg(documentFrom(compiled, family), { theme: 'dark', pixelRatio: 1 });
      expect(dark).toMatchSnapshot();
      expect(dark).toContain('data-theme="dark"');
    });
  }
});
