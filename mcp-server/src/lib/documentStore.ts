import { readFile, writeFile } from 'node:fs/promises';
import {
  createAgentDocument,
  parseAgentDocument,
  type SceneDocumentV1,
} from './agent.js';

/**
 * Documents an agent is editing, keyed by id, for the life of the server
 * process. Persistence is explicit: `open` reads a canonical JSON file and
 * `save` writes one, so nothing is lost silently when the process ends.
 */
export class DocumentStore {
  private readonly documents = new Map<string, SceneDocumentV1>();

  create(name: string): SceneDocumentV1 {
    return this.track(createAgentDocument(name));
  }

  get(id: string): SceneDocumentV1 {
    const document = this.documents.get(id);
    if (!document) throw new RangeError(`Document "${id}" is not open. Use openflow_create or openflow_open first.`);
    return document;
  }

  set(document: SceneDocumentV1): void {
    this.documents.set(document.id, document);
  }

  list(): readonly SceneDocumentV1[] {
    return [...this.documents.values()];
  }

  /** The document opened or created last: what a call without a documentId means. */
  latest(): SceneDocumentV1 | undefined {
    return this.list().at(-1);
  }

  async open(path: string): Promise<SceneDocumentV1> {
    return this.track(parseAgentDocument(JSON.parse(await readFile(path, 'utf8'))));
  }

  /** Re-inserting moves a re-opened document to the end, so `latest` sees it. */
  private track(document: SceneDocumentV1): SceneDocumentV1 {
    this.documents.delete(document.id);
    this.documents.set(document.id, document);
    return document;
  }

  async save(id: string, path: string): Promise<void> {
    await writeFile(path, JSON.stringify(this.get(id), null, 2) + '\n', 'utf8');
  }
}
