import { zodToJsonSchema } from 'zod-to-json-schema';
import { AGENT_ACTIONS } from './actions';
import { runAgentActionInStore } from './runInStore';

// WebMCP (navigator.modelContext) is an early-preview browser API; typed here
// to the subset we use so unsupported browsers become a no-op.
interface ModelContextTool {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: unknown;
  readonly execute: (input: unknown) => Promise<{ content: { type: 'text'; text: string }[] }>;
}
interface ModelContext {
  registerTool?: (tool: ModelContextTool) => void;
  unregisterTool?: (name: string) => void;
}

function modelContext(): ModelContext | null {
  const candidate = (globalThis.navigator as Navigator & { modelContext?: ModelContext } | undefined)?.modelContext;
  return candidate?.registerTool ? candidate : null;
}

export function isWebMcpAvailable(): boolean {
  return modelContext() !== null;
}

/** Expose every agent action as a WebMCP tool. Returns the unregister function. */
export function registerAgentActionsWithBrowser(): () => void {
  const context = modelContext();
  if (!context) return () => {};
  for (const action of AGENT_ACTIONS) {
    context.registerTool!({
      name: action.name,
      description: action.description,
      inputSchema: zodToJsonSchema(action.schema),
      execute: async (input) => ({
        content: [{ type: 'text', text: JSON.stringify(runAgentActionInStore(action.name, input)) }],
      }),
    });
  }
  return () => {
    for (const action of AGENT_ACTIONS) context.unregisterTool?.(action.name);
  };
}
