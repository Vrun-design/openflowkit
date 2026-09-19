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
    const document = createAgentDocument(name);
    this.documents.set(document.id, document);
    return document;
  }

  get(id: string): SceneDocumentV1 {
    const document = this.documents.get(id);
    if (!document) throw new RangeError(`Document "${id}" is not open. Use diagram_create or diagram_open first.`);
    return document;
  }

  set(document: SceneDocumentV1): void {
    this.documents.set(document.id, document);
  }

  list(): readonly SceneDocumentV1[] {
    return [...this.documents.values()];
  }

  async open(path: string): Promise<SceneDocumentV1> {
    const document = parseAgentDocument(JSON.parse(await readFile(path, 'utf8')));
    this.documents.set(document.id, document);
    return document;
  }

  async save(id: string, path: string): Promise<void> {
    await writeFile(path, JSON.stringify(this.get(id), null, 2) + '\n', 'utf8');
  }
}
