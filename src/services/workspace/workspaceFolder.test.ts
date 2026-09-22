import { describe, expect, it } from 'vitest';
import { compileWorkspace } from '../../dsl/compile';
import { placedElementId } from '../../dsl/model/model';
import { applyDocumentCommand } from '../../opencanvas/domain/commands/execute';
import { createEmptyV2Document } from '../../opencanvas/presentation/v2/v2Document';
import { buildWorkspacePagesCommand } from '../../opencanvas/application/dsl/architectureCommands';
import {
  applySnapsToWorkspace, folderFromHandle, parseSnap,
  readWorkspace, serializeSnap, snapOfPage, writeWorkspace, type WorkspaceFolder,
} from './workspaceFolder';

const WORKSPACE = `architecture
model {
  system Shop {
    container Web
    container API
  }
}
views { view container of Shop }
`;

let mintCounter = 0;

async function generated() {
  const workspace = await compileWorkspace(WORKSPACE);
  const empty = createEmptyV2Document('doc-ws', 'Shop');
  const command = buildWorkspacePagesCommand(empty, workspace, { mintId: (prefix) => `ws-${prefix}-${mintCounter++}` })!;
  return { workspace, document: applyDocumentCommand(empty, command).document };
}

describe('workspace snaps', () => {
  it('reads and writes the snap format, rejecting garbage', () => {
    const snap = { version: 1 as const, viewId: 'view:container:shop', positions: { 'shop.web': { x: 12, y: 34 } } };
    expect(parseSnap(serializeSnap(snap))).toEqual(snap);
    expect(parseSnap('not json')).toBeNull();
    expect(parseSnap('{"version":2}')).toBeNull();
    expect(parseSnap(JSON.stringify({ version: 1, viewId: 'v', positions: { a: { x: 1 } } }))).toEqual(
      { version: 1, viewId: 'v', positions: {} },
    );
  });

  it('overrides compiled positions for named elements only', async () => {
    const { workspace } = await generated();
    const snapped = applySnapsToWorkspace(workspace, {
      'view:container:shop': { version: 1, viewId: 'view:container:shop', positions: { 'shop.web': { x: 40, y: 40 } } },
    });
    const container = snapped.views.find((view) => view.viewId === 'view:container:shop')!;
    const web = container.result.nodes.find((node) => node.id === 'shop.web')!;
    const api = container.result.nodes.find((node) => node.id === 'shop.api')!;
    expect(web.transform.translation).toEqual({ x: 40, y: 40 });
    expect(api.transform.translation).not.toEqual({ x: 40, y: 40 });
  });
});

/** In-memory folder that behaves like the File System Access handle we wrap. */
function fakeFolder(files: Record<string, string>): WorkspaceFolder & { files: Record<string, string> } {
  const store = { ...files };
  return {
    name: 'shop-architecture',
    files: store,
    async readText(path) { return store[path] ?? null; },
    async readBinary() { return null; },
    async writeText(path, contents) { store[path] = contents; },
    async list(prefix) { return Object.keys(store).filter((path) => path.startsWith(prefix)).map((path) => path.slice(prefix.length)); },
  };
}

describe('workspace folder', () => {
  it('reads the DSL, snaps and ADRs, then writes them back', async () => {
    const { document } = await generated();
    const page = document.pages.find((candidate) => candidate.name === 'container of Shop')!;
    const snap = snapOfPage(page)!;
    const folder = fakeFolder({
      'architecture.ofk': WORKSPACE,
      'views/view-container-shop.snap': serializeSnap(snap),
      'adr/0001-use-postgres.md': '# Postgres\n\nWe chose Postgres.',
      'notes.txt': 'ignored',
    });
    const contents = await readWorkspace(folder);
    expect(contents.dsl).toBe(WORKSPACE);
    expect(Object.keys(contents.snaps)).toEqual(['view:container:shop']);
    expect(contents.adrs.map((adr) => adr.path)).toEqual(['adr/0001-use-postgres.md']);

    await writeWorkspace(folder, { dsl: WORKSPACE, document });
    expect(folder.files['architecture.ofk']).toBe(WORKSPACE);
    expect(Object.keys(folder.files).some((path) => path.startsWith('views/') && path.endsWith('.snap'))).toBe(true);
    const roundTrip = await readWorkspace(folder);
    expect(roundTrip.snaps['view:container:shop']?.positions).toEqual(snap.positions);
  });

  it('drops non-model nodes from a snap and returns null for plain pages', async () => {
    const { document } = await generated();
    const page = document.pages.find((candidate) => candidate.name === 'container of Shop')!;
    expect(snapOfPage({ ...page, nodes: page.nodes.filter((node) => !placedElementId(node)) })).toMatchObject({ positions: {} });
    expect(snapOfPage({ ...page, metadata: { view: { id: 'x' } }, nodes: [] })).toBeNull();
  });

  it('wraps a directory handle for nested paths', async () => {
    const tree = treeDir('root');
    const folder = folderFromHandle(dirHandle(tree) as never);
    await folder.writeText('views/x.snap', '{}');
    await folder.writeText('architecture.ofk', 'dsl');
    expect(await folder.readText('views/x.snap')).toBe('{}');
    expect(await folder.readText('architecture.ofk')).toBe('dsl');
    expect(await folder.list('views/')).toEqual(['x.snap']);
    expect(await folder.readText('missing.txt')).toBeNull();
  });
});

interface FakeFile { readonly kind: 'file'; name: string; text: string }
interface FakeDir { readonly kind: 'dir'; name: string; children: Map<string, FakeFile | FakeDir> }

function treeDir(name: string): FakeDir {
  return { kind: 'dir', name, children: new Map() };
}

function dirHandle(node: FakeDir): unknown {
  return {
    name: node.name,
    async getFileHandle(name: string, options?: { create?: boolean }): Promise<unknown> {
      let entry = node.children.get(name);
      if ((!entry || entry.kind !== 'file') && options?.create) {
        entry = { kind: 'file', name, text: '' };
        node.children.set(name, entry);
      }
      if (!entry || entry.kind !== 'file') throw new Error(`no file ${name}`);
      const file = entry;
      return {
        async getFile() { return { text: async () => file.text } as File; },
        async createWritable() {
          return { async write(data: string | Uint8Array) { file.text = String(data); }, async close() { /* done */ } };
        },
      };
    },
    async getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<unknown> {
      let entry = node.children.get(name);
      if ((!entry || entry.kind !== 'dir') && options?.create) {
        entry = treeDir(name);
        node.children.set(name, entry);
      }
      if (!entry || entry.kind !== 'dir') throw new Error(`no dir ${name}`);
      return dirHandle(entry);
    },
    async *values() {
      for (const child of node.children.values()) yield { kind: child.kind, name: child.name };
    },
  };
}
