// One eval case through the real MCP tools: validate, then draw in a fresh
// file-mode document. Valid means the draw succeeded with no error diagnostic
// and at least one node; warnings and Mermaid losses are counted, not failed.
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

export interface CaseScore {
  readonly valid: boolean;
  /** Diagnostics an agent would act on: errors, or the tool's refusal message. */
  readonly problems: readonly string[];
  readonly warnings: number;
  readonly mermaidLosses: number;
  readonly nodes: number;
}

async function call(client: Client, name: string, args: Record<string, unknown>): Promise<{ error?: string; value?: Record<string, unknown> }> {
  const result = await client.callTool({ name, arguments: args });
  const text = ((result.content ?? []) as { text?: string }[])[0]?.text ?? '';
  return result.isError ? { error: text } : { value: JSON.parse(text) as Record<string, unknown> };
}

type Diagnostic = { code: string; severity: string; line: number; message: string };

export async function scoreCase(client: Client, text: string): Promise<CaseScore> {
  const lint = await call(client, 'validate_openflow_dsl', { dsl: text });
  const report = lint.value ?? {};
  const diagnostics = (report.diagnostics ?? []) as Diagnostic[];
  const losses = ((report.mermaid as { losses?: unknown[] } | undefined)?.losses ?? []).length;
  const errors = diagnostics.filter(({ severity }) => severity === 'error').map(({ line, message }) => `line ${line}: ${message}`);
  const warnings = diagnostics.filter(({ severity }) => severity === 'warning').length;
  if (lint.error || errors.length) return { valid: false, problems: lint.error ? [lint.error] : errors, warnings, mermaidLosses: losses, nodes: 0 };

  const created = await call(client, 'openflow_create', { name: 'eval' });
  const documentId = (created.value as { id: string }).id;
  const drawn = await call(client, 'create_diagram', { documentId, dsl: text });
  if (drawn.error) return { valid: false, problems: [drawn.error], warnings, mermaidLosses: losses, nodes: 0 };
  const output = (drawn.value!.output ?? {}) as { nodes?: number };
  const nodes = output.nodes ?? 0;
  return { valid: nodes > 0, problems: nodes > 0 ? [] : ['The diagram compiled to no nodes.'], warnings, mermaidLosses: losses, nodes };
}
