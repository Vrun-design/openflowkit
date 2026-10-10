// The tools a remote (HTTP, no login, stores nothing) server may expose: pure functions of their input.
// No file system, no bridge, no document store. Keep this list short on purpose.
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { DSL_FAMILIES, grammarSection } from '../lib/agent.js';
import { loadGrammar } from '../lib/fileCapabilities.js';
import { stableForPicture } from '../cliCommands.js';
import { DEFAULT_DEADLINE_MS, renderCheck, withDeadline, type LayoutPortLike } from './render.js';
import { exportSvg } from '../lib/svgBeside.js';
import { openUrl } from '../lib/openLink.js';
import { toolError } from '../lib/errors.js';

export const VIEWER_URI = 'ui://openflowkit/viewer.html';
// MCP Apps: `_meta.ui.resourceUri` (the flat "ui/resourceUri" key is deprecated).
// ponytail: no `openai/outputTemplate` — neither the MCP Apps spec nor the Apps SDK docs ask for it; add it if ChatGPT fails to render.
const VIEWER_META = { ui: { resourceUri: VIEWER_URI } };

export const MAX_SOURCE_BYTES = 100 * 1024;

export interface RemoteToolOptions {
  readonly appOrigin: string;
  /** Per-render deadline; default 15 s. */
  readonly deadlineMs?: number;
  /** The layout engine for the first view; default the headless ELK. Tests inject a slow one. */
  readonly layout?: LayoutPortLike;
}

export function registerRemoteTools(server: McpServer, { appOrigin, deadlineMs = DEFAULT_DEADLINE_MS, layout }: RemoteToolOptions): void {
  server.registerTool('render_diagram', {
    title: 'Draw a diagram',
    description:
      'Draw a diagram from OpenFlowKit DSL or Mermaid and show it inline. Pass `source` (flowchart, architecture, sequence, ' +
      'state, ER and more; call get_syntax first if you are unsure of the DSL). Returns the picture plus the canonical DSL ' +
      '(edit it and call again to revise) and a link that opens it in the editor. Invalid source returns diagnostics with line numbers: fix and retry.',
    inputSchema: {
      source: z.string().min(1).max(MAX_SOURCE_BYTES).describe('OpenFlowKit DSL or Mermaid, at most 100 KB.'),
      title: z.string().max(200).optional().describe('Diagram title.'),
      theme: z.enum(['light', 'dark']).optional().describe('Picture theme; default light.'),
    },
    _meta: VIEWER_META,
  }, async ({ source, title, theme }): Promise<CallToolResult> => {
    try {
      if (Buffer.byteLength(source, 'utf8') > MAX_SOURCE_BYTES) return toolError('source is over 100 KB');
      const name = title?.trim() || 'Diagram';
      const checked = await withDeadline(deadlineMs, (signal) => renderCheck(source, name, { signal, ...(layout ? { elk: layout } : {}) }));
      if (checked.refused) return toolError(checked.refused);
      const diagnostics = checked.issues.map(({ severity, line, message }) => ({ severity, line, message }));
      const converted = checked.lint.converted;
      const drawn = checked.document?.pages[0]?.nodes.filter((node) => (node as { kind: string }).kind !== 'frame').length ?? 0;
      if (!checked.document || drawn === 0 || diagnostics.some(({ severity }) => severity === 'error')) {
        const lines = diagnostics.map((d) => `line ${d.line}: ${d.severity}: ${d.message}`);
        return {
          isError: true,
          content: [{ type: 'text', text: `${drawn === 0 && !lines.length ? 'Nothing was drawn' : 'The diagram has errors'}; fix the source and call again.\n${lines.join('\n')}` }],
          structuredContent: { title: name, diagnostics },
        };
      }
      const dsl = converted?.dsl ?? source;
      const losses = (converted?.losses ?? []).map((loss) => `line ${loss.line}: not converted: ${loss.message}`);
      const still = stableForPicture(checked.document, source);
      const svg = await exportSvg(still, still.pages[0]!.id, theme ?? 'light');
      const link = openUrl(dsl, appOrigin);
      if (!link) losses.push('too large to open by link; download the file instead');
      const page = still.pages[0]!;
      const nodes = drawn; // the frame is the canvas, not a shape
      const connectors = page.connectors.length;
      const warnings = diagnostics.length + losses.length;
      // structuredContent never reaches the model, so what it needs to revise the diagram goes in the text: the DSL, never the SVG.
      const notes = [...diagnostics.map((d) => `line ${d.line}: ${d.severity}: ${d.message}`), ...losses];
      const text = [`${name}: ${nodes} nodes, ${connectors} connectors, ${warnings} warnings`, ...notes, '```', dsl.trimEnd(), '```'].join('\n');
      return {
        content: [{ type: 'text', text }],
        structuredContent: { title: name, svg, dsl, openUrl: link, nodes, connectors, diagnostics, losses },
      };
    } catch (error) {
      return toolError(error instanceof Error ? error.message : String(error));
    }
  });

  server.registerTool('get_syntax', {
    title: 'Read the DSL grammar',
    description: 'The OpenFlowKit DSL grammar, so you can write source for render_diagram. Pass a family (flowchart, architecture, sequence, state, erd, class, gitgraph, mindmap, chart, wireframe) for just that section.',
    inputSchema: {
      family: z.preprocess((value) => typeof value === 'string' ? value.trim().toLowerCase() : value, z.enum(DSL_FAMILIES))
        .optional().describe('One family’s section; omit for the full reference.'),
    },
  }, async ({ family }): Promise<CallToolResult> => ({
    content: [{ type: 'text', text: grammarSection(await loadGrammar(), family) }],
  }));
}
