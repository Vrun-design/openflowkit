import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { legacyMermaidConverter } from '../../application/dsl/legacyMermaid';
import { deterministicLayout } from '../../../dsl/layout';
import { restoreLegacyDocumentSnapshot } from './legacyProjection';
import { migrateLegacyWorkspace, type LegacyWorkspaceSources } from './legacyWorkspace';
import { validateSceneDocumentV1 } from './validation';

// Real records v1 wrote (scripts/v1-fidelity/capture.mjs), not look-alikes.
const FIXTURES = 'src/services/storage/v2/__fixtures__/v1';
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- untyped v1 fixture JSON
type Json = Record<string, any>;
const read = (file: string): Json => JSON.parse(readFileSync(`${FIXTURES}/${file}`, 'utf8'));
const indexedDb = read('indexeddb.json').indexedDb;
const fallback = read('localstorage-fallback.json').localStorage['openflowkit-documents-fallback'] as string;
const tabState = read('premarch-tabs.json').indexedDb.flowMetadata.find((row: Json) => row.id === 'openflowkit-storage').value as string;
const manifest = read('manifest.json') as Record<string, string>;

const sources: LegacyWorkspaceSources = { documents: indexedDb.documents, fallback, tabStates: [tabState] };
const convertMermaid = legacyMermaidConverter({ layout: deterministicLayout });
const byId = <T extends { id: string }>(documents: readonly T[], id: string) => documents.find((document) => document.id === id);

describe('migrateLegacyWorkspace on captured v1 workspaces', () => {
  it('brings every live document from all three sources, valid and page for page', async () => {
    const { documents, idMap, failures } = await migrateLegacyWorkspace(sources, { convertMermaid });
    expect(failures).toEqual([]);
    const tabs = JSON.parse(tabState).state.tabs as Json[];
    const v1 = [...indexedDb.documents, ...JSON.parse(fallback)] as Json[];
    expect(documents).toHaveLength(v1.length + tabs.length);
    for (const row of v1) {
      const document = byId(documents, `v1-${row.id}`)!;
      expect(idMap[row.id]).toBe(document.id);
      expect(document.name).toBe(row.name);
      expect(document.createdAt).toBe(row.createdAt);
      expect(document.pages.map(({ id, name }) => [id, name])).toEqual(row.pages.map((page: Json) => [page.id, page.name]));
    }
    for (const document of documents) expect(validateSceneDocumentV1(document)).toMatchObject({ success: true });
    const deleted = Object.keys(manifest).find((id) => manifest[id] === 'deleted')!;
    expect(idMap[deleted]).toBeUndefined();
  });

  it('keeps both pages of a multi-page document', async () => {
    const id = Object.keys(manifest).find((key) => manifest[key] === 'multi-page')!;
    const document = byId((await migrateLegacyWorkspace(sources)).documents, `v1-${id}`)!;
    expect(document.pages.map((page) => page.nodes.length)).toEqual([9, 6]);
    expect(document.updatedAt).toBe('2026-10-03T05:28:24.474Z'); // its newest page
  });

  it('redraws renderer-first Mermaid as native nodes and keeps the original', async () => {
    const { documents } = await migrateLegacyWorkspace(sources, { convertMermaid });
    const original = (document: (typeof documents)[number]) =>
      (restoreLegacyDocumentSnapshot(document, document.pages[0]!.id)?.nodes ?? []) as Json[];
    const mermaid = documents.filter((document) => original(document).some((node) => node.type === 'mermaid_svg'));
    expect(mermaid).toHaveLength(7);
    const still = mermaid.filter((document) => document.pages[0]!.nodes.some((node) => node.kind === 'mermaid_svg'));
    // `journey` has no DSL family yet: that one keeps v1's node, exactly as v1 shows it.
    expect(still.map((document) => document.pages[0]!.diagramKind)).toEqual(['journey']);
    for (const document of mermaid.filter((item) => !still.includes(item))) {
      expect(document.pages[0]!.nodes.length).toBeGreaterThan(1);
    }
  });

  it('gives identical output when run twice', async () => {
    expect(await migrateLegacyWorkspace(sources, { convertMermaid })).toEqual(await migrateLegacyWorkspace(sources, { convertMermaid }));
  });
});

describe('migrateLegacyWorkspace rules', () => {
  const row = indexedDb.documents.find((document: Json) => document.pages.length === 1) as Json;
  const at = (updatedAt: string, name: string) => ({ ...row, name, updatedAt, pages: row.pages.map((page: Json) => ({ ...page, updatedAt })) });

  it('takes the newest copy of an id; a tie goes to IndexedDB', async () => {
    const newer = await migrateLegacyWorkspace({ documents: [at('2026-01-01T00:00:00.000Z', 'idb')], fallback: JSON.stringify([at('2026-02-01T00:00:00.000Z', 'ls')]), tabStates: [] });
    expect(newer.documents.map((document) => document.name)).toEqual(['ls']);
    const tie = await migrateLegacyWorkspace({ documents: [at('2026-01-01T00:00:00.000Z', 'idb')], fallback: JSON.stringify([at('2026-01-01T00:00:00.000Z', 'ls')]), tabStates: [] });
    expect(tie.documents.map((document) => document.name)).toEqual(['idb']);
  });

  it('skips deleted rows and reports a broken one without stopping the rest', async () => {
    const broken = { ...row, id: 'broken', pages: [{ ...row.pages[0], content: { nodes: 'x', edges: [] } }] };
    const result = await migrateLegacyWorkspace({
      documents: [{ ...row, id: 'gone', deletedAt: '2026-01-01T00:00:00.000Z' }, broken, row],
      fallback: '{not json', tabStates: [null, '{"state":{}}'],
    });
    expect(result.documents.map((document) => document.id)).toEqual([`v1-${row.id}`]);
    expect(result.failures.map((failure) => failure.v1Id)).toEqual(['openflowkit-documents-fallback', 'broken']);
  });
  it('lets a newer deleted copy win, so a delete is not undone by an older copy', async () => {
    const result = await migrateLegacyWorkspace({
      documents: [{ ...at('2026-05-01T00:00:00.000Z', 'idb'), deletedAt: '2026-05-01T00:00:00.000Z' }],
      fallback: JSON.stringify([at('2026-01-01T00:00:00.000Z', 'ls')]), tabStates: [],
    });
    expect(result.documents).toEqual([]);
  });

  it('keeps pages that share an id, reports rows without one, and validates what it returns', async () => {
    const twin = { ...row, pages: [row.pages[0], row.pages[0]] };
    const dupeNodes = { ...row, id: 'dupe', pages: [{ ...row.pages[0], content: { ...row.pages[0].content, nodes: [row.pages[0].content.nodes[0], row.pages[0].content.nodes[0]] } }] };
    const result = await migrateLegacyWorkspace({ documents: [twin, dupeNodes], fallback: null,
      tabStates: [JSON.stringify({ state: { tabs: [{ name: 'no id', nodes: [], edges: [] }] } })] });
    expect(result.documents.map((document) => document.pages.map((page) => page.id))).toEqual([[row.pages[0].id, `${row.pages[0].id}:2`]]);
    expect(result.failures.map((failure) => failure.v1Id)).toEqual(['(no id)', 'dupe']);
  });

  it('skips what the caller already imported', async () => {
    const result = await migrateLegacyWorkspace({ documents: [row], fallback: null, tabStates: [] }, { skip: (id) => id === row.id });
    expect(result).toEqual({ documents: [], idMap: {}, failures: [] });
  });
});
