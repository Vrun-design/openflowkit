import { isRepoMapAddress } from '../../application/map/repoMapSource';
import { UNTITLED_DOCUMENT_NAME, createDefaultSceneLayer } from '../../domain/document/defaults';
import {
  SCENE_DOCUMENT_FORMAT,
  SCENE_DOCUMENT_VERSION,
  type SceneDocumentV1,
  type ScenePage,
} from '../../domain/document/types';

// ponytail: one page, one layer. Multi-page arrives in V2-12; the repository
// and session already operate per document id, so nothing here needs to change.
export function createEmptyV2Page(pageId = 'page-1'): ScenePage {
  return {
    id: pageId,
    name: 'Page 1',
    diagramKind: 'flowchart',
    layers: [createDefaultSceneLayer()],
    nodes: [],
    connectors: [],
    metadata: {},
    extensions: {},
  };
}

export function createEmptyV2Document(id: string, name = UNTITLED_DOCUMENT_NAME): SceneDocumentV1 {
  const now = new Date().toISOString();
  return {
    format: SCENE_DOCUMENT_FORMAT,
    schemaVersion: SCENE_DOCUMENT_VERSION,
    id,
    name,
    createdAt: now,
    updatedAt: now,
    pages: [createEmptyV2Page()],
    metadata: {},
    extensions: {},
  };
}

export function firstV2Page(document: SceneDocumentV1): ScenePage {
  const page = document.pages[0];
  if (!page) throw new RangeError('V2 document has no pages.');
  return page;
}

let v2IdCounter = 0;

// Session-unique node/connector ids. Undo/redo restore identical ids from
// the stored command, so the counter only needs process-wide uniqueness.
export function mintV2Id(prefix: string): string {
  v2IdCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${v2IdCounter}`;
}

// `/` reopens the document you had open last (Excalidraw's "refresh, same
// drawing") instead of minting a fresh one on every visit.
const LAST_DOCUMENT_KEY = 'ofk:last-document';

export function rememberLastDocument(id: string): void {
  try { localStorage.setItem(LAST_DOCUMENT_KEY, id); } catch { /* private mode: every visit is new */ }
}

export function lastDocumentId(): string | null {
  try { return localStorage.getItem(LAST_DOCUMENT_KEY); } catch { return null; }
}

/** A deleted document must not be where `/` lands next. */
export function forgetLastDocument(id: string): void {
  try { if (localStorage.getItem(LAST_DOCUMENT_KEY) === id) localStorage.removeItem(LAST_DOCUMENT_KEY); } catch { /* private mode */ }
}

/** What a new diagram opened from home starts with; router state, read once by the editor. */
export type V2StartIntent =
  | { readonly start: 'assistant' | 'code' | 'agent' }
  | { readonly template: string }
  /** A file's text from home's Import: OpenFlow DSL, or Mermaid / Structurizr / D2 to convert first. */
  | { readonly source: string }
  /** `/map/github/<owner>/<repo>`: a new document that is the repo's map. `ref` absent = default branch. */
  | { readonly repoMap: { readonly owner: string; readonly repo: string; readonly ref?: string } };

export function isV2StartIntent(value: unknown): value is V2StartIntent {
  if (typeof value !== 'object' || value === null) return false;
  const { start, template, source, repoMap } = value as { start?: unknown; template?: unknown; source?: unknown; repoMap?: { owner?: unknown; repo?: unknown; ref?: unknown } | null };
  return start === 'assistant' || start === 'code' || start === 'agent' || typeof template === 'string' || typeof source === 'string'
    || (typeof repoMap === 'object' && repoMap !== null && isRepoMapAddress(repoMap));
}
