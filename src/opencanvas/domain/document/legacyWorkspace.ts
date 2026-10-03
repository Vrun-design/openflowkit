import type { Point2d } from '../geometry/types';
import { isJsonObject, type JsonObject, type JsonValue } from './json';
import { projectLegacyDocument, type LegacyProjectionOptions } from './legacyProjection';
import type { SceneDocumentV1, ScenePage } from './types';
import { validateSceneDocumentV1 } from './validation';

/**
 * Raw v1 records, exactly as they sit in the browser. Nothing here is parsed
 * by the caller, so a corrupt blob is a reported failure, never a boot crash.
 */
export interface LegacyWorkspaceSources {
  /** IndexedDB `documents` rows (`PersistedDocument`, since 2026-03-27). */
  readonly documents: readonly unknown[];
  /** localStorage `openflowkit-documents-fallback`: a JSON array of the same shape. */
  readonly fallback: string | null;
  /** zustand `openflowkit-storage` blobs holding pre-March `{ state: { tabs } }`. */
  readonly tabStates: readonly (string | null)[];
}

/**
 * Re-draws a v1 `mermaid_svg` node (renderer-first import) as native nodes on
 * `page`, which no longer holds that node. Null keeps the original node.
 */
export type LegacyMermaidConverter = (page: ScenePage, source: string, origin: Point2d) => Promise<ScenePage | null>;

export interface LegacyWorkspaceOptions {
  readonly resolveNodeSize?: LegacyProjectionOptions['resolveNodeSize'];
  readonly convertMermaid?: LegacyMermaidConverter;
  /** True leaves a v1 document out (already imported at this `updatedAt`): no projection, no Mermaid work. */
  readonly skip?: (v1Id: string, updatedAt: string) => boolean;
}

export interface LegacyImportFailure {
  /** Empty when no single document is to blame: an unreadable source blob, or a row with no id. */
  readonly v1Id: string;
  readonly name: string;
  readonly error: string;
}

export interface LegacyWorkspace {
  /** Sorted by v1 id, so two runs over the same records are identical. */
  readonly documents: readonly SceneDocumentV1[];
  readonly idMap: Readonly<Record<string, string>>;
  readonly failures: readonly LegacyImportFailure[];
}

interface LegacyRecord {
  readonly id: string;
  readonly name: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly deleted: boolean;
  readonly pages: readonly JsonValue[];
  /** The v1 row as stored (a tab already in document shape), for the backup file. */
  readonly row: JsonObject;
}

export const legacyDocumentId = (v1Id: string): string => `v1-${v1Id}`;

const text = (value: JsonValue | undefined): string | null =>
  typeof value === 'string' && value.length > 0 ? value : null;

const message = (error: unknown): string => (error instanceof Error ? error.message : String(error));

// v1 types its dates as ISO strings; anything else Date can read is normalised so "newest" compares right.
function isoDate(value: JsonValue | undefined): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

const latest = (dates: readonly (string | null)[]): string | null =>
  dates.reduce<string | null>((best, date) => (date && (!best || date > best) ? date : best), null);

// One v1 `PersistedDocument`. Rows from before multi-page carry only `content`.
function fromPersisted(value: JsonObject, id: string): LegacyRecord {
  const pages = Array.isArray(value.pages) && value.pages.length > 0
    ? value.pages
    : [{ id: `${id}:page:primary`, name: value.name ?? null, diagramType: value.diagramType ?? null, content: value.content ?? null }];
  const updatedAt = latest([isoDate(value.updatedAt), ...pages.map((page) => (isJsonObject(page) ? isoDate(page.updatedAt) : null))])
    ?? '1970-01-01T00:00:00.000Z';
  return {
    id, name: text(value.name) ?? 'Untitled Flow', createdAt: isoDate(value.createdAt) ?? updatedAt, updatedAt,
    deleted: value.deletedAt !== null && value.deletedAt !== undefined, pages, row: value,
  };
}

// v1 turned each pre-March tab into one document (main `createPersistedDocumentFromTab`).
function fromTab(value: JsonObject): JsonObject {
  const id = text(value.id);
  return {
    id, name: value.name ?? null, createdAt: value.updatedAt ?? null, updatedAt: value.updatedAt ?? null, deletedAt: null,
    pages: [{ id: `${id}:page:primary`, name: value.name ?? null, diagramType: value.diagramType ?? null, updatedAt: value.updatedAt ?? null,
      content: { nodes: value.nodes ?? null, edges: value.edges ?? null, ...(value.playback ? { playback: value.playback } : {}) } }],
  };
}

function parse(source: string, blob: string | null, pick: (value: unknown) => unknown, failures: LegacyImportFailure[]): JsonObject[] {
  if (blob === null) return [];
  try {
    const rows = pick(JSON.parse(blob));
    if (!Array.isArray(rows)) throw new TypeError('no list of diagrams');
    return rows.filter(isJsonObject);
  } catch (error) {
    failures.push({ v1Id: '', name: source, error: message(error) });
    return [];
  }
}

async function convertMermaidNodes(page: ScenePage, convert: LegacyMermaidConverter | undefined): Promise<ScenePage> {
  if (!convert) return page;
  let current = page;
  for (const node of page.nodes) {
    const source = node.kind === 'mermaid_svg' ? text(node.content.mermaidSource) : null;
    // A connector to the picture would have nothing to land on once it is redrawn: leave that node be.
    if (!source || page.connectors.some((connector) => connector.source.nodeId === node.id || connector.target.nodeId === node.id)) continue;
    const without: ScenePage = { ...current, nodes: current.nodes.filter(({ id }) => id !== node.id) };
    // The node already lies to v1 (no viewBox); a failed conversion keeps it as it was.
    const converted = await convert(without, source, node.transform.translation).catch(() => null);
    if (converted) current = converted;
  }
  return current;
}

async function migrateRecord(record: LegacyRecord, options: LegacyWorkspaceOptions): Promise<SceneDocumentV1> {
  const documentId = legacyDocumentId(record.id);
  const taken = new Set<string>();
  const projected = record.pages.map((page, index) => {
    if (!isJsonObject(page)) throw new TypeError(`Page ${index + 1} is not an object.`);
    const content = isJsonObject(page.content) ? page.content : {};
    const name = text(page.name) ?? `Page ${index + 1}`;
    // Page ids only need to be unique inside the document; a repeated one gets a suffix, never a drop.
    let pageId = text(page.id) ?? `${documentId}:page-${index + 1}`;
    for (let copy = 2; taken.has(pageId); copy += 1) pageId = `${text(page.id) ?? documentId}:${copy}`;
    taken.add(pageId);
    return projectLegacyDocument(
      { ...content, name, diagramType: page.diagramType ?? content.diagramType ?? 'flowchart' },
      { documentId, pageId, pageName: name, now: record.updatedAt,
        ...(options.resolveNodeSize ? { resolveNodeSize: options.resolveNodeSize } : {}) }
    );
  });
  if (projected.length === 0) throw new TypeError('Legacy document has no pages.');
  const pages: ScenePage[] = [];
  for (const document of projected) pages.push(await convertMermaidNodes(document.pages[0]!, options.convertMermaid));
  const document = { ...projected[0]!, name: record.name, createdAt: record.createdAt, updatedAt: record.updatedAt, pages };
  const validation = validateSceneDocumentV1(document);
  if (validation.success === false) throw new TypeError(`${validation.issues[0]?.path}: ${validation.issues[0]?.message}`);
  return document;
}

// The newest live copy of every v1 document across the three sources.
function collectLegacyRecords(sources: LegacyWorkspaceSources, failures: LegacyImportFailure[]): LegacyRecord[] {
  // A row that is not plain JSON is reported, never dropped without a word.
  const rows: JsonObject[] = [];
  for (const row of sources.documents) {
    if (isJsonObject(row)) rows.push(row);
    else failures.push({ v1Id: String((row as { id?: unknown } | null)?.id ?? ''), name: 'Untitled Flow', error: 'v1 row is not plain JSON.' });
  }
  const raw = [
    ...rows,
    ...parse('openflowkit-documents-fallback', sources.fallback, (value) => value, failures),
    ...sources.tabStates.flatMap((blob) => parse('openflowkit-storage', blob, (value) =>
      isJsonObject(value) && isJsonObject(value.state) ? (value.state.tabs ?? []) : null, failures).map(fromTab)),
  ];
  // ponytail: every source merges, so a stale fallback/tab copy of a document v1 later
  // hard-deleted comes back — recoverable (delete it again), unlike dropping a live one.
  const winners = new Map<string, LegacyRecord>();
  for (const row of raw) {
    const id = text(row.id);
    if (!id) {
      failures.push({ v1Id: '', name: text(row.name) ?? 'Untitled Flow', error: 'v1 diagram has no id.' });
      continue;
    }
    const record = fromPersisted(row, id);
    const held = winners.get(id);
    if (!held || record.updatedAt > held.updatedAt) winners.set(id, record);
  }
  return [...winners.values()].filter((record) => !record.deleted).sort((a, b) => (a.id < b.id ? -1 : 1));
}

/** Every live v1 document as v1 stored it (pre-March tabs in document shape), for the 12.1 backup file. */
export function legacyWorkspaceRows(sources: LegacyWorkspaceSources): readonly JsonObject[] {
  return collectLegacyRecords(sources, []).map((record) => record.row);
}

/**
 * v1 workspace → v2 documents. One document per v1 document (`v1-<v1Id>`), one
 * page per v1 page. The same id in several sources: newest `updatedAt` wins
 * (a deleted copy too), ties go to the earlier source. One document that
 * throws is reported and never stops the rest.
 */
export async function migrateLegacyWorkspace(
  sources: LegacyWorkspaceSources,
  options: LegacyWorkspaceOptions = {}
): Promise<LegacyWorkspace> {
  const failures: LegacyImportFailure[] = [];
  const documents: SceneDocumentV1[] = [];
  const idMap: Record<string, string> = {};
  for (const record of collectLegacyRecords(sources, failures)) {
    if (options.skip?.(record.id, record.updatedAt)) continue;
    try {
      documents.push(await migrateRecord(record, options));
      idMap[record.id] = legacyDocumentId(record.id);
    } catch (error) {
      failures.push({ v1Id: record.id, name: record.name, error: message(error) });
    }
  }
  return { documents, idMap, failures };
}
