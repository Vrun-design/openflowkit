import { createAgentDocument, createFileCapabilities, findAgentOp, grammarSection } from '../../src/lib/agent.js';
import { loadGrammar } from '../../src/lib/fileCapabilities.js';

/** Compiles DSL through the shared op registry, exactly like a live call. */
export async function compileTemplate(dsl: string): Promise<{
  nodes: number; groups: number; connectors: number; diagnostics: { severity: string; code: string }[];
}> {
  const document = createAgentDocument('Template test', 'template-doc');
  const capabilities = createFileCapabilities({ grammar: grammarSection(await loadGrammar()) });
  const op = findAgentOp('create_diagram');
  if (!op) throw new Error('create_diagram is missing from the agent bundle');
  const outcome = await op.run({ dsl }, { document, pageId: document.pages[0]!.id, capabilities });
  if (!outcome.command || outcome.command.kind !== 'set-page') throw new Error('expected a page command');
  const output = outcome.output as { nodes: number; connectors: number; diagnostics?: { severity: string }[] };
  const groups = outcome.command.after.nodes.filter((node) => node.kind === 'frame' || node.kind === 'group').length - 1;
  return { nodes: output.nodes - groups, groups, connectors: output.connectors, diagnostics: outcome.output.diagnostics ?? [] };
}
