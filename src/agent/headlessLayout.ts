// The same ELK the editor's worker runs, in process, for Node hosts (MCP file
// mode, the CLI). Only the agent bundle entry (index.ts) imports this: the
// editor reaches host.ts too, and must not ship the 1.4 MB engine in its entry.
// elkjs stays external in vite.agent.config.ts, so the MCP package resolves its own.
import ELK from 'elkjs/lib/elk.bundled.js';
import { createElkLayoutPort } from '../services/dsl/elkLayoutPort';

let elk: InstanceType<typeof ELK> | null = null;
// ponytail: blocks the stdio server while it lays out (~2 s at 500 nodes); move to worker_threads if agents send bigger graphs.
export const headlessElkLayout = createElkLayoutPort(async () => (elk ??= new ELK()));
