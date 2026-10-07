// The same ELK the editor's worker runs, in process, for Node hosts (MCP file
// mode, the CLI). Only the agent bundle entry (index.ts) imports this: the
// editor reaches host.ts too, and must not ship the 1.4 MB engine in its entry.
// elkjs stays external in vite.agent.config.ts, so the MCP package resolves its own.
import ELK from 'elkjs/lib/elk.bundled.js';
import type { LayoutPort } from '../dsl/layout';
import { createElkLayoutPort } from '../services/dsl/elkLayoutPort';

/**
 * ELK time grows with connections far faster than with shapes (measured 2026-10-07:
 * a 500-shape chain 2 s; 2 links a shape, 200 links 1 s, 400 links 5 s, 500 links 13 s,
 * 2000 links over 7 min). Past these, the stdio server or the CLI would just hang.
 */
export const HEADLESS_LAYOUT_LIMITS = { nodes: 1000, edges: 400 } as const;

let elk: InstanceType<typeof ELK> | null = null;
const elkPort = createElkLayoutPort(async () => (elk ??= new ELK()));

// ponytail: a size cap, not a clock; ELK in worker_threads with a timeout if agents need bigger graphs.
export const headlessElkLayout: LayoutPort = {
  run(graph, signal) {
    const { nodes, edges } = HEADLESS_LAYOUT_LIMITS;
    if (graph.nodes.length > nodes || graph.edges.length > edges) {
      return Promise.reject(new RangeError(`This diagram has ${graph.nodes.length} shapes and ${graph.edges.length} connections; layout outside the app stops at ${nodes} shapes or ${edges} connections. Split it into smaller diagrams, or open it in the app.`));
    }
    return elkPort.run(graph, signal);
  },
};
