// Generates the two pages that mirror code instead of prose: the keyboard
// reference (src/opencanvas/presentation/v2/v2Shortcuts.ts) and the MCP
// chapter (src/agent/manifest.ts + src/agent/ops + the tool registrations in
// mcp-server/src). Run by predev/prebuild, so a new shortcut, op or tool
// without a docs row breaks the build instead of shipping an undocumented one.
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CAPABILITY_MANIFEST, type CapabilityRow } from '../../src/agent/manifest';
import { AGENT_OPS } from '../../src/agent/ops';
import { shortcutGroups } from '../../src/opencanvas/presentation/v2/v2Shortcuts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..');
const OUT_DIR = resolve(HERE, '..', 'src', 'content', 'docs');
const MCP_SRC = resolve(REPO_ROOT, 'mcp-server', 'src');

const GENERATED = (sources: string): string => `:::note[Generated]
This page is generated from ${sources} by \`npm run generate:refs\`. Edit the source, not this page.
:::

`;

function frontmatter(title: string, description: string): string {
  return `---\ntitle: ${title}\ndescription: ${description}\n---\n\n`;
}

// --- zod → readable type, for the op argument tables -------------------------

interface ZodLike {
  readonly _def?: { readonly typeName?: string } & Record<string, unknown>;
  readonly shape?: Record<string, ZodLike>;
}

function shapeOf(schema: ZodLike): Record<string, ZodLike> {
  let current: ZodLike | undefined = schema;
  while (current) {
    if (current.shape) return current.shape;
    const inner = current._def?.schema ?? current._def?.innerType;
    current = typeof inner === 'object' ? (inner as ZodLike) : undefined;
  }
  return {};
}

function typeOf(schema: ZodLike): string {
  const def = schema?._def;
  if (!def) return 'unknown';
  switch (def.typeName) {
    case 'ZodString': return 'string';
    case 'ZodNumber': return 'number';
    case 'ZodBoolean': return 'boolean';
    case 'ZodLiteral': return JSON.stringify(def.value);
    case 'ZodEnum': return (def.values as string[]).map((value) => `\`${value}\``).join(' \\| ');
    case 'ZodOptional': return `${typeOf(def.innerType as ZodLike)} *(optional)*`;
    case 'ZodDefault': return `${typeOf(def.innerType as ZodLike)} *(default \`${JSON.stringify((def.defaultValue as () => unknown)())}\`)*`;
    case 'ZodArray': return `${typeOf(def.type as ZodLike)}[]`;
    case 'ZodNullable': return `${typeOf(def.innerType as ZodLike)} or null`;
    case 'ZodUnion': return (def.options as ZodLike[]).map(typeOf).join(' \\| ');
    case 'ZodObject': return `object: ${Object.entries(shapeOf(schema))
      .map(([key, value]) => `${key} (${typeOf(value)})`).join(', ')}`;
    case 'ZodRecord': return `map of ${typeOf(def.valueType as ZodLike)}`;
    case 'ZodAny': return 'any';
    default: return (def.typeName ?? 'value').replace(/^Zod/, '').toLowerCase();
  }
}

function argumentRows(schema: ZodLike): string {
  const shape = shapeOf(schema);
  const rows = Object.entries(shape);
  if (rows.length === 0) return '| — | — |\n';
  return rows.map(([name, value]) => `| \`${name}\` | ${typeOf(value)} |`).join('\n') + '\n';
}

// --- the pages ---------------------------------------------------------------

function keyboardPage(): string {
  const groups = shortcutGroups('⌘');
  const sections = groups.map(({ title, rows }) =>
    `## ${title}\n\n| Action | Keys |\n| --- | --- |\n${rows.map(({ label, keys }) =>
      `| ${label} | ${keys === '' ? '—' : `\`${keys}\``} |`).join('\n')}\n`,
  ).join('\n');
  return frontmatter(
    'Keyboard shortcuts',
    'Every keyboard shortcut in the editor, generated from the shortcut map the app itself renders.',
  )
    + GENERATED('`src/opencanvas/presentation/v2/v2Shortcuts.ts`')
    + `Keys are shown with \`⌘\`; on Windows and Linux read the same rows as \`Ctrl\`. The app\nrenders this list itself, from the same data, so it cannot drift from what the keys do.\n\n`
    + sections;
}

async function sourceToolNames(): Promise<readonly string[]> {
  const names = new Set<string>();
  for (const file of await readdir(MCP_SRC, { recursive: true })) {
    if (!/\.ts$/.test(file)) continue;
    const text = await readFile(resolve(MCP_SRC, file), 'utf8');
    for (const match of text.matchAll(/registerTool\(\s*'([a-z_]+)'/g)) names.add(match[1]!);
  }
  return [...names].sort();
}

async function sourceResourceNames(): Promise<readonly string[]> {
  const names = new Set<string>();
  const text = await readFile(resolve(MCP_SRC, 'resources', 'index.ts'), 'utf8');
  for (const match of text.matchAll(/registerResource\(\s*'([^']+)'/g)) names.add(match[1]!);
  return [...names].sort();
}

function opSections(): string {
  const rows = new Map(CAPABILITY_MANIFEST.map((row) => [row.action, row]));
  const surfaces: Record<string, string> = {
    toolbar: 'the toolbar',
    'context-bar': 'the context bar',
    keyboard: 'a keyboard action',
    'document-bar': 'the document bar',
    canvas: 'a canvas gesture',
    'code-panel': 'the code panel',
    agent: '',
  };
  return AGENT_OPS.map((op) => {
    const row: CapabilityRow = rows.get(op.name)!;
    const args = shapeOf(op.schema as unknown as ZodLike);
    const argumentTable = argumentRows(op.schema as unknown as ZodLike);
    // `documentId` is added to every op tool by the MCP server; document it once.
    const where = row.mutates ? 'changes the document (one undo step in live mode)' : 'read-only';
    const mirrors = row.surface === 'agent'
      ? 'an agent-only lookup'
      : `mirrors **${row.operation}** in ${surfaces[row.surface] ?? row.surface}`;
    return `### \`${op.name}\`\n\n${op.title} — ${mirrors}; ${where}.\n\n`
      + (Object.keys(args).length > 0
        ? `| Argument | Type |\n| --- | --- |\n${argumentTable}`
        : 'Takes no arguments.\n');
  }).join('\n');
}

async function mcpPage(): Promise<string> {
  const tools = await sourceToolNames();
  const resources = await sourceResourceNames();
  return frontmatter(
    'MCP Server',
    'Drive the live editor or edit .openflow.json files from any MCP client — the full tool surface, generated from the manifest.',
  )
    + GENERATED('`src/agent/manifest.ts`, `src/agent/ops/` and the tool registrations under `mcp-server/src`')
    + `OpenFlowKit ships a local MCP server: a stdio process that gives Claude Desktop, Claude\nCode, Cursor, Windsurf and anything else that speaks MCP a set of diagram tools. It runs on\nyour machine, needs no API key of its own, and returns deterministic results — your MCP\nclient's model does the thinking.\n\n## Run it\n\n\`\`\`bash\nnpx -y @vrun-design/openflowkit-mcp\n\`\`\`\n\nPoint your client at that command. In Claude Desktop's \`claude_desktop_config.json\`:\n\n\`\`\`json\n{\n  "mcpServers": {\n    "openflowkit": { "command": "npx", "args": ["-y", "@vrun-design/openflowkit-mcp"] }\n  }\n}\n\`\`\`\n\nNode 18 or newer is required.\n\n`
    + `## Two modes\n\n`
    + `- **Live** — open the app, click **Connect agent**, and every op runs against the document\nyou see. The bridge listens on \`127.0.0.1:43119\` by default (change it in Settings), checks\nthe request origin, and can be gated with a shared token. Edits land as one undo step per\ncall; \`screenshot\` returns a real PNG; \`fit_view\` moves your view.\n`
    + `- **File** — \`openflow_open\` a \`.openflow.json\` path and the same ops run headlessly on\nthat document, with \`openflow_save\` writing it back. There is no canvas here, so PNG/GIF/\nMP4/WebM export and \`screenshot\` ask you to connect the live editor; SVG, animated SVG and\nJSON export work.\n\n`
    + `If no editor is paired, pass \`documentId\` (from \`openflow_open\`) to target a file-mode\ndocument; without it, tools use the paired editor or the first open document.\n\n`
    + `## Document and server tools\n\n`
    + `| Tool | What it does |\n| --- | --- |\n`
    + tools.map((name) => {
      const descriptions: Record<string, string> = {
        validate_openflow_dsl: 'Parse DSL with the real parser and return its diagnostics',
        analyze_codebase: 'Scan a repository and suggest architecture elements',
        discover_architecture: 'Derive an architecture model from a repository',
        drift_report: 'Compare a model against the repository; matches by name and tech only',
        explain_element: 'What the model says about one element, plus linked ADR markdown',
        list_starter_templates: 'List the starter DSL templates',
        get_starter_template: 'One starter template, by name',
        list_diagram_node_types: 'Family names, shape words and edge styles',
        openflow_create: 'Create an empty file-mode document',
        openflow_open: 'Load a .openflow.json from disk into file mode',
        openflow_save: 'Write a document back to disk',
        whoami: 'Which mode the server is in, and which documents it holds',
        server_info: 'Server name, version and capabilities',
      };
      return `| \`${name}\` | ${descriptions[name] ?? 'See the tool description in your client'} |`;
    }).join('\n') + '\n\n'
    + `## Resources and prompts\n\n`
    + `The server also exposes MCP resources: ${resources.map((name) => `\`${name}\``).join(', ')} — the\ngrammar, the icon catalogs and the starter templates. Three prompts steer a client toward\nthe right tools: \`flowchart_from_description\`, \`convert_mermaid_to_openflow\` and\n\`architecture_from_codebase\`.\n\n`
    + `## The operations\n\n`
    + `One MCP tool per operation; every mutating op has an inverse, and the live editor applies it\nas a single undo step. The manifest names the human operation each one mirrors.\n\n`
    + opSections()
    + `\n## What it does not do\n\n`
    + `- **No cloud, no telemetry.** The server is stdio and local; there is no hosted service.\n`
    + `- **No account or key.** Your MCP client's model is the only AI involved.\n`
    + `- **No raster in file mode.** PNG, GIF, MP4 and WebM need the live editor's canvas.\n`
    + `- **No collaboration.** One editor pairs with the bridge at a time.\n`;
}

async function main(): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true });
  const pages: readonly (readonly [string, string])[] = [
    ['keyboard-shortcuts.md', keyboardPage()],
    ['mcp-server.md', await mcpPage()],
  ];
  for (const [name, content] of pages) {
    const path = resolve(OUT_DIR, name);
    await writeFile(path, content, 'utf8');
    console.log(`[references] wrote ${relative(REPO_ROOT, path)} (${content.length} bytes)`);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
