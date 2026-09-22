import { archViewIdOfPage, placedElementId } from '../../dsl/model/model';
import type { SceneDocumentV1, SceneNode, ScenePage } from '../../opencanvas/domain/document/types';

/**
 * Git-native workspace (phase 5.7): a folder with `architecture.ofk` (the DSL),
 * `views/*.snap` (manual layout overrides) and `adr/*.md`. The File System
 * Access API is behind `WorkspaceFolder` so the merge logic stays testable.
 */

export interface WorkspaceFolder {
  readonly name: string;
  readText(path: string): Promise<string | null>;
  readBinary(path: string): Promise<Uint8Array | null>;
  writeText(path: string, contents: string): Promise<void>;
  list(prefix: string): Promise<readonly string[]>;
}

export interface WorkspaceSnap {
  readonly version: 1;
  readonly viewId: string;
  /** Element id → parent-relative position. Node ids without model elements are ignored. */
  readonly positions: Readonly<Record<string, { x: number; y: number }>>;
}

export interface WorkspaceContents {
  readonly dsl: string | null;
  readonly snaps: Readonly<Record<string, WorkspaceSnap>>;
  readonly adrs: readonly { path: string; text: string }[];
}

export const WORKSPACE_DSL_FILE = 'architecture.ofk';
const VIEWS_DIR = 'views/';
const ADR_DIR = 'adr/';

export function isWorkspacePickerSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

interface DirectoryHandle {
  name: string;
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileHandle>;
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<DirectoryHandle>;
  values(): AsyncIterable<{ kind: string; name: string }>;
}
interface FileHandle {
  getFile(): Promise<File>;
  createWritable(): Promise<{ write(data: string | Uint8Array): Promise<void>; close(): Promise<void> }>;
}

/** Wraps a picked directory handle; nested dirs are created on first write. */
export function folderFromHandle(handle: DirectoryHandle): WorkspaceFolder {
  const dir = async (path: string, create: boolean): Promise<DirectoryHandle | null> => {
    let current: DirectoryHandle = handle;
    for (const part of path.split('/').filter(Boolean)) {
      try {
        current = await current.getDirectoryHandle(part, { create });
      } catch {
        return null;
      }
    }
    return current;
  };
  const file = async (path: string, create: boolean): Promise<FileHandle | null> => {
    const parts = path.split('/').filter(Boolean);
    const name = parts.at(-1);
    if (!name) return null;
    const parent = await dir(parts.slice(0, -1).join('/'), create);
    if (!parent) return null;
    try {
      return await parent.getFileHandle(name, { create });
    } catch {
      return null;
    }
  };
  return {
    name: handle.name,
    async readText(path) {
      const handleFile = await file(path, false);
      if (!handleFile) return null;
      return handleFile.getFile().then((value) => value.text());
    },
    async readBinary(path) {
      const handleFile = await file(path, false);
      if (!handleFile) return null;
      return handleFile.getFile().then(async (value) => new Uint8Array(await value.arrayBuffer()));
    },
    async writeText(path, contents) {
      const handleFile = await file(path, true);
      if (!handleFile) throw new Error(`Cannot write ${path}`);
      const writable = await handleFile.createWritable();
      await writable.write(contents);
      await writable.close();
    },
    async list(prefix) {
      const parent = await dir(prefix, false);
      if (!parent) return [];
      const out: string[] = [];
      for await (const entry of parent.values()) {
        if (entry.kind === 'file') out.push(entry.name);
      }
      return out.sort();
    },
  };
}

/** Prompts for a folder; null when the user cancels or the API is missing. */
export async function pickWorkspaceFolder(): Promise<WorkspaceFolder | null> {
  if (!isWorkspacePickerSupported()) return null;
  try {
    const handle = await (window as unknown as {
      showDirectoryPicker(options?: { mode?: string }): Promise<DirectoryHandle>;
    }).showDirectoryPicker({ mode: 'readwrite' });
    return folderFromHandle(handle);
  } catch {
    return null;
  }
}

export async function readWorkspace(folder: WorkspaceFolder): Promise<WorkspaceContents> {
  const dsl = await folder.readText(WORKSPACE_DSL_FILE);
  const snaps: Record<string, WorkspaceSnap> = {};
  for (const name of await folder.list(VIEWS_DIR)) {
    if (!name.endsWith('.snap')) continue;
    const text = await folder.readText(`${VIEWS_DIR}${name}`);
    const parsed = parseSnap(text);
    if (parsed) snaps[parsed.viewId] = parsed;
  }
  const adrs: { path: string; text: string }[] = [];
  for (const name of await folder.list(ADR_DIR)) {
    if (!name.endsWith('.md')) continue;
    const text = await folder.readText(`${ADR_DIR}${name}`);
    if (text !== null) adrs.push({ path: `${ADR_DIR}${name}`, text });
  }
  return { dsl, snaps, adrs };
}

export function parseSnap(text: string | null): WorkspaceSnap | null {
  if (!text) return null;
  try {
    const value = JSON.parse(text) as Partial<WorkspaceSnap>;
    if (value.version !== 1 || typeof value.viewId !== 'string' || !value.positions) return null;
    const positions: Record<string, { x: number; y: number }> = {};
    for (const [id, point] of Object.entries(value.positions)) {
      if (point && typeof point.x === 'number' && typeof point.y === 'number') positions[id] = { x: point.x, y: point.y };
    }
    return { version: 1, viewId: value.viewId, positions };
  } catch {
    return null;
  }
}

export function serializeSnap(snap: WorkspaceSnap): string {
  return `${JSON.stringify(snap, null, 2)}\n`;
}

/** Positions off a page, keyed by model element id (client-only nodes are skipped). */
export function snapOfPage(page: ScenePage): WorkspaceSnap | null {
  const viewId = archViewIdOfPage(page);
  if (!viewId) return null;
  const positions: Record<string, { x: number; y: number }> = {};
  for (const node of page.nodes) {
    const elementId = placedElementId(node);
    if (!elementId) continue;
    positions[elementId] = { x: node.transform.translation.x, y: node.transform.translation.y };
  }
  return { version: 1, viewId, positions };
}

/** Applies snaps to a compiled workspace before it becomes a command. */
export function applySnapsToWorkspace<T extends { views: readonly { viewId: string; result: { nodes: readonly SceneNode[] } }[] }>(workspace: T, snaps: Readonly<Record<string, WorkspaceSnap>>): T {
  if (Object.keys(snaps).length === 0) return workspace;
  return {
    ...workspace,
    views: workspace.views.map((view) => {
      const snap = snaps[view.viewId];
      if (!snap) return view;
      return {
        ...view,
        result: {
          ...view.result,
          nodes: view.result.nodes.map((node) => {
            const elementId = placedElementId(node);
            const point = elementId ? snap.positions[elementId] : undefined;
            if (!point) return node;
            return { ...node, transform: { ...node.transform, translation: { x: point.x, y: point.y } } };
          }),
        },
      };
    }),
  };
}

/** Writes the workspace back: DSL, one snap per model view, ADRs untouched. */
export async function writeWorkspace(
  folder: WorkspaceFolder,
  options: { readonly dsl: string; readonly document: SceneDocumentV1 },
): Promise<void> {
  await folder.writeText(WORKSPACE_DSL_FILE, options.dsl);
  for (const page of options.document.pages) {
    const snap = snapOfPage(page);
    if (!snap) continue;
    const name = snap.viewId.replace(/[^A-Za-z0-9._-]+/g, '-');
    await folder.writeText(`${VIEWS_DIR}${name}.snap`, serializeSnap(snap));
  }
}
