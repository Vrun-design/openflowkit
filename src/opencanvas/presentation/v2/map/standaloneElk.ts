// ELK in this thread for the standalone viewer. vite.map-viewer.config.ts aliases services/elk-layout/runtime to this
// file: a saved HTML page has no worker file to load, so the bundled engine ships inside the page.
import ELK from 'elkjs/lib/elk.bundled.js';
import type { ElkLayoutEngine } from '../../../../services/dsl/elkLayoutPort';

let elk: ElkLayoutEngine | null = null;

export async function getElkInstance(): Promise<ElkLayoutEngine> {
  elk ??= new ELK() as unknown as ElkLayoutEngine;
  return elk;
}
