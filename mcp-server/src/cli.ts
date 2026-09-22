#!/usr/bin/env node
// The `openflowkit` CLI: discover a repo, check drift in CI, or build the
// self-contained static site. Node stdlib + the agent bundle only — the browser
// ELK worker is not available here, so views use the deterministic layout port.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileWorkspace, deterministicLayout, exportCanonicalSvg, type SvgExportDocument } from './lib/agent.js';
import {
  discoverySummary, discoveryToDsl, driftReport, modelFromNode, runArchitectureDiscovery,
  type ArchFlowData, type ArchFlowStepData, type ArchModelData, type ArchitectureDiscovery,
  type DriftReportResult,
} from './lib/architectureDiscovery.js';

export interface CliIo {
  out(message: string): void;
  err(message: string): void;
}

const USAGE = `openflowkit — local-first architecture tools

Usage:
  openflowkit discover <dir> [--out architecture.ofk]
  openflowkit drift <dir> [--model architecture.ofk] [--json]
  openflowkit build <dir> [--out dist]

Commands:
  discover  scan a repository and print or write a proposed C4 DSL workspace
  drift     compare a repository against its model (exit 1 when drift is found)
  build     compile architecture.ofk into a self-contained static site

Options:
  --out <path>    discover: write the DSL here (default: stdout); build: output dir (default: dist)
  --model <path>  drift: model file (default: <dir>/architecture.ofk)
  --json          drift: machine-readable report
  --name <name>   discover: system name (default: directory name)
  --max-files <n> discover/drift: cap on files scanned (default: 2000)
  --help          this text`;

interface ParsedArgs {
  positionals: string[];
  flags: Map<string, string>;
  error?: string;
}

function parseArgs(args: readonly string[], valued: ReadonlySet<string>): ParsedArgs {
  const positionals: string[] = [];
  const flags = new Map<string, string>();
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]!;
    if (!arg.startsWith('--')) { positionals.push(arg); continue; }
    const equals = arg.indexOf('=');
    const name = equals === -1 ? arg.slice(2) : arg.slice(2, equals);
    const inline = equals === -1 ? undefined : arg.slice(equals + 1);
    if (valued.has(name)) {
      const value = inline ?? args[++index];
      if (value === undefined) return { positionals, flags, error: `--${name} needs a value` };
      flags.set(name, value);
      continue;
    }
    if (inline !== undefined) return { positionals, flags, error: `--${name} takes no value` };
    flags.set(name, 'true');
  }
  return { positionals, flags };
}

function maxFilesOf(flags: Map<string, string>): number | undefined {
  const raw = flags.get('max-files');
  if (raw === undefined) return undefined;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

/* ----------------------------------------------------------------- drift */

function formatDrift(
  modelPath: string,
  discovery: ArchitectureDiscovery,
  report: DriftReportResult,
): string {
  const lines: string[] = [];
  lines.push(`Architecture drift — ${modelPath}`);
  lines.push(`${discovery.units.length} units, ${discovery.relations.length} relations, ${discovery.evidenceCount} evidence lines in the repo`);
  const section = (title: string, entries: string[]) => {
    if (entries.length === 0) return;
    lines.push('', `${title} (${entries.length})`);
    lines.push(...entries);
  };
  section('Missing — in the repo, not in the model', report.missing.map((finding) => {
    const evidence = finding.evidence[0];
    const where = evidence ? ` — ${evidence.file}:${evidence.line}: ${evidence.text}` : '';
    return `  • ${finding.name} (${finding.id})${where}`;
  }));
  section('Undrawn — in the model, no repo evidence', report.undrawn.map((finding) => `  • ${finding.name} (${finding.id})`));
  section('Changed — name matches, details differ', report.changed.map((change) =>
    `  • ${change.id}: ${change.field} "${change.model}" → "${change.repo}"`));
  const total = report.missing.length + report.undrawn.length + report.changed.length;
  lines.push('', total === 0 ? 'No drift.' : `${total} finding(s).`);
  return lines.join('\n');
}

async function runDrift(args: readonly string[], io: CliIo): Promise<number> {
  const parsed = parseArgs(args, new Set(['model', 'max-files']));
  if (parsed.error) { io.err(`openflowkit drift: ${parsed.error}\n\n${USAGE}`); return 2; }
  const dir = parsed.positionals[0];
  if (!dir) { io.err(`openflowkit drift: missing <dir>\n\n${USAGE}`); return 2; }
  const modelPath = parsed.flags.get('model') ?? path.join(dir, 'architecture.ofk');
  try {
    const maxFiles = maxFilesOf(parsed.flags);
    const discovery = await runArchitectureDiscovery(dir, maxFiles ? { maxFiles } : {});
    const source = await readFile(modelPath, 'utf8');
    const model = await firstModel(source);
    if (!model) {
      io.err(`openflowkit drift: no C4 model in ${modelPath}`);
      return 2;
    }
    const report = driftReport(model, discovery);
    const drift = report.missing.length + report.undrawn.length + report.changed.length > 0;
    if (parsed.flags.has('json')) {
      io.out(JSON.stringify({ model: modelPath, units: discovery.units.length, checked: model.elements.length, drift, ...report }, null, 2));
    } else {
      io.out(formatDrift(modelPath, discovery, report));
    }
    return drift ? 1 : 0;
  } catch (error) {
    io.err(`openflowkit drift: ${error instanceof Error ? error.message : String(error)}`);
    return 2;
  }
}

/* -------------------------------------------------------------- discover */

async function runDiscover(args: readonly string[], io: CliIo): Promise<number> {
  const parsed = parseArgs(args, new Set(['out', 'name', 'max-files']));
  if (parsed.error) { io.err(`openflowkit discover: ${parsed.error}\n\n${USAGE}`); return 2; }
  const dir = parsed.positionals[0];
  if (!dir) { io.err(`openflowkit discover: missing <dir>\n\n${USAGE}`); return 2; }
  try {
    const maxFiles = maxFilesOf(parsed.flags);
    const discovery = await runArchitectureDiscovery(dir, maxFiles ? { maxFiles } : {});
    const dsl = discoveryToDsl(discovery, parsed.flags.get('name') ?? path.basename(path.resolve(dir)));
    const out = parsed.flags.get('out');
    if (out) {
      // `--out` is a path, not a promise that the folder exists.
      await mkdir(path.dirname(path.resolve(out)), { recursive: true });
      await writeFile(out, dsl, 'utf8');
      io.out(`wrote ${out} — ${discovery.units.length} units, ${discovery.relations.length} relations, ${discovery.evidenceCount} evidence lines`);
      io.err(discoverySummary(discovery));
    } else {
      io.out(dsl);
    }
    return 0;
  } catch (error) {
    io.err(`openflowkit discover: ${error instanceof Error ? error.message : String(error)}`);
    return 2;
  }
}

/* ----------------------------------------------------------------- build */

interface SiteConnector {
  id: string;
  from: string;
  to: string;
}

interface SiteView {
  slug: string;
  viewId: string;
  name: string;
  svgLight: string;
  svgDark: string;
  nodes: string[];
  connectors: SiteConnector[];
}

interface SiteFlowStep {
  kind: string;
  from?: string;
  to?: string;
  label?: string;
  depth: number;
  branch?: string;
}

interface SiteFlow {
  name: string;
  steps: SiteFlowStep[];
}

function slugifyViewId(viewId: string, used: Set<string>): string {
  const base = viewId.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'view';
  let slug = base;
  let suffix = 2;
  while (used.has(slug)) slug = `${base}-${suffix++}`;
  used.add(slug);
  return slug;
}

function flattenFlowSteps(flow: ArchFlowData): SiteFlowStep[] {
  const out: SiteFlowStep[] = [];
  const walk = (steps: readonly ArchFlowStepData[], depth: number, branch?: string): void => {
    for (const step of steps) {
      out.push({
        kind: step.kind,
        ...(step.from ? { from: step.from } : {}),
        ...(step.to ? { to: step.to } : {}),
        ...(step.label ? { label: step.label } : {}),
        ...(branch ? { branch } : {}),
        depth,
      });
      for (const lane of step.branches ?? []) walk(lane.steps, depth + 1, lane.label);
    }
  };
  walk(flow.steps, 0);
  return out;
}

const EMPTY_SVG = (label: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 120" width="320" height="120" data-theme="light"><rect width="320" height="120" fill="#ffffff"/><text x="160" y="64" text-anchor="middle" font-family="system-ui,sans-serif" font-size="13" fill="#64748b">${label}</text></svg>`;

function renderIndexHtml(name: string, model: ArchModelData, views: readonly SiteView[], flows: readonly SiteFlow[]): string {
  const viewOf: Record<string, string> = {};
  for (const view of model.views) {
    if (!view.of) continue;
    const slug = views.find((candidate) => candidate.viewId === view.id)?.slug;
    if (slug) viewOf[view.of] = slug;
  }
  const ofByView = new Map(model.views.map((view) => [view.id, view.of ?? null]));
  const data = {
    name,
    views: views.map(({ slug, viewId, name: viewName }) => ({ slug, viewId, name: viewName, of: ofByView.get(viewId) ?? null })),
    viewOf,
    parents: Object.fromEntries(model.elements.map((element) => [element.id, element.parent])),
    elements: Object.fromEntries(model.elements.map((element) => [element.id, element.name])),
    pages: Object.fromEntries(views.map((view) => [view.slug, { nodes: view.nodes, connectors: view.connectors }])),
    flows: flows.map((flow) => ({ name: flow.name, steps: flow.steps })),
  };
  const sections = views.map((view) => `<section class="view" id="view-${view.slug}" data-view="${view.slug}">
        <div class="light">${view.svgLight}</div>
        <div class="dark">${view.svgDark}</div>
      </section>`).join('\n      ');
  const navItems = views.map((view) => `<button type="button" data-view="${view.slug}">${escapeHtml(view.name)}</button>`).join('\n        ');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(name)} — OpenFlowKit</title>
<style>
:root{color-scheme:light dark;--bg:#f8fafc;--panel:#fff;--ink:#0f172a;--muted:#64748b;--line:#e2e8f0;--accent:#2563eb}
@media (prefers-color-scheme:dark){:root{--bg:#020617;--panel:#0f172a;--ink:#e2e8f0;--muted:#94a3b8;--line:#1e293b;--accent:#60a5fa}}
*{box-sizing:border-box}
body{margin:0;height:100vh;display:flex;flex-direction:column;font:14px/1.5 system-ui,sans-serif;background:var(--bg);color:var(--ink)}
header{display:flex;align-items:center;gap:16px;padding:10px 16px;border-bottom:1px solid var(--line);background:var(--panel)}
h1{font-size:15px;margin:0;white-space:nowrap}
nav.breadcrumb{display:flex;align-items:center;gap:2px;color:var(--muted);overflow:auto}
nav.breadcrumb button{border:0;background:none;color:var(--accent);cursor:pointer;font:inherit;padding:2px 4px}
nav.breadcrumb button:hover{text-decoration:underline}
.shell{flex:1;display:flex;min-height:0}
nav.views{width:220px;flex:none;overflow:auto;border-right:1px solid var(--line);background:var(--panel);padding:8px}
nav.views button{display:block;width:100%;text-align:left;border:0;border-radius:6px;background:none;color:var(--ink);font:inherit;padding:7px 10px;cursor:pointer}
nav.views button:hover{background:var(--bg)}
nav.views button[aria-current="true"]{background:var(--accent);color:#fff}
main{flex:1;overflow:auto;padding:20px}
.view{display:none}.view.active{display:block}
.view svg{max-width:100%;height:auto;border-radius:10px;box-shadow:0 1px 3px rgba(15,23,42,.12)}
.view .dark{display:none}
@media (prefers-color-scheme:dark){.view .light{display:none}.view .dark{display:block}}
[data-node-id],[data-connector-id]{transition:opacity .18s ease}
svg.ofk-dim [data-node-id]:not(.ofk-active),svg.ofk-dim [data-connector-id]:not(.ofk-active){opacity:.12}
svg:not(.ofk-dim) [data-node-id].ofk-active,svg:not(.ofk-dim) [data-connector-id].ofk-active{filter:drop-shadow(0 0 5px var(--accent))}
#stage [data-node-id]{cursor:pointer}
footer{display:flex;align-items:center;gap:10px;padding:8px 16px;border-top:1px solid var(--line);background:var(--panel)}
footer[hidden]{display:none}
footer button{border:1px solid var(--line);background:var(--bg);color:var(--ink);border-radius:6px;font:inherit;padding:4px 10px;cursor:pointer}
footer button:hover{border-color:var(--accent)}
#step-label{color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
</style>
</head>
<body>
<header>
  <h1>${escapeHtml(name)}</h1>
  <nav class="breadcrumb" id="breadcrumb" aria-label="Breadcrumb"></nav>
</header>
<div class="shell">
  <nav class="views" id="views" aria-label="Views">
        ${navItems}
  </nav>
  <main id="stage" aria-label="Diagrams">
      ${sections}
  </main>
</div>
<footer id="player" role="group" aria-label="Flow player" hidden>
  <button type="button" id="prev" aria-label="Previous flow step">←</button>
  <button type="button" id="play" aria-label="Play or pause the flow" aria-pressed="false">▶</button>
  <button type="button" id="next" aria-label="Next flow step">→</button>
  <span id="step-label" role="status" aria-live="polite"></span>
</footer>
<script>
(function () {
  var DATA = ${JSON.stringify(data).replace(/</g, '\\u003c')};
  var stage = document.getElementById('stage');
  var views = DATA.views;
  var current = views.length ? views[0].slug : null;

  function el(id) { return document.getElementById(id); }
  function cssEscape(value) { return window.CSS && CSS.escape ? CSS.escape(value) : String(value).replace(/"/g, '\\\\"'); }
  function svgOf(slug) { var section = el('view-' + slug); return section ? section.querySelector('svg') : null; }

  function show(slug) {
    if (!slug) return;
    current = slug;
    views.forEach(function (view) { el('view-' + view.slug).classList.toggle('active', view.slug === slug); });
    document.querySelectorAll('#views button').forEach(function (button) {
      button.setAttribute('aria-current', button.getAttribute('data-view') === slug ? 'true' : 'false');
    });
    renderBreadcrumb(slug);
  }

  function renderBreadcrumb(slug) {
    var crumb = el('breadcrumb');
    crumb.textContent = '';
    var view = views.filter(function (candidate) { return candidate.slug === slug; })[0];
    var chain = [{ label: DATA.name, slug: views.length ? views[0].slug : null }];
    if (view && view.of) {
      var ids = [];
      for (var id = view.of; id; id = DATA.parents[id] || null) ids.unshift(id);
      ids.forEach(function (elementId) {
        chain.push({ label: DATA.elements[elementId] || elementId, slug: DATA.viewOf[elementId] || null });
      });
    }
    chain.forEach(function (step, index) {
      if (index) crumb.appendChild(document.createTextNode(' / '));
      if (step.slug) {
        var button = document.createElement('button');
        button.type = 'button';
        button.textContent = step.label;
        button.addEventListener('click', function () { show(step.slug); });
        crumb.appendChild(button);
      } else {
        var span = document.createElement('span');
        span.textContent = step.label;
        crumb.appendChild(span);
      }
    });
  }

  stage.addEventListener('click', function (event) {
    var node = event.target.closest ? event.target.closest('[data-node-id]') : null;
    if (!node) return;
    var id = node.getAttribute('data-node-id');
    if (id && DATA.viewOf[id]) show(DATA.viewOf[id]);
  });

  var steps = [];
  (DATA.flows || []).forEach(function (flow) {
    flow.steps.forEach(function (step) { step.flow = flow.name; steps.push(step); });
  });
  var index = -1;
  var timer = null;

  function pageOf(slug) { return DATA.pages[slug] || { nodes: [], connectors: [] }; }
  function shownId(slug, id) {
    var nodes = pageOf(slug).nodes;
    if (nodes.indexOf(id) !== -1) return id;
    var ancestor = nodes.filter(function (node) { return id.indexOf(node + '.') === 0; })
      .sort(function (a, b) { return b.length - a.length; })[0];
    return ancestor || null;
  }
  function bestView(step) {
    var best = current;
    var bestScore = -1;
    views.forEach(function (view) {
      var score = (shownId(view.slug, step.from) ? 1 : 0) + (shownId(view.slug, step.to) ? 1 : 0);
      if (score > bestScore) { bestScore = score; best = view.slug; }
    });
    return best;
  }
  function connectorFor(slug, from, to) {
    var shownFrom = shownId(slug, from);
    var shownTo = shownId(slug, to);
    if (!shownFrom || !shownTo) return null;
    return pageOf(slug).connectors.filter(function (connector) {
      return (connector.from === shownFrom && connector.to === shownTo)
        || (connector.from === shownTo && connector.to === shownFrom);
    })[0] || null;
  }
  function setCaption(step) {
    var label = el('step-label');
    if (!step) { label.textContent = ''; return; }
    var parts = ['Flow: ' + step.flow, 'step ' + (index + 1) + '/' + steps.length];
    if (step.label) parts.push(step.label);
    label.textContent = parts.join(' · ');
  }
  function activate(step) {
    views.forEach(function (view) { var svg = svgOf(view.slug); if (svg) svg.classList.remove('ofk-dim'); });
    document.querySelectorAll('.ofk-active').forEach(function (node) { node.classList.remove('ofk-active'); });
    if (!step || !step.from || !step.to) { setCaption(step); return; }
    var slug = bestView(step);
    if (slug !== current) show(slug);
    var svg = svgOf(slug);
    if (!svg) { setCaption(step); return; }
    var connector = connectorFor(slug, step.from, step.to);
    var selectors = [];
    if (connector) selectors.push('[data-connector-id="' + cssEscape(connector.id) + '"]');
    [step.from, step.to].forEach(function (id) {
      var shown = shownId(slug, id);
      if (shown) selectors.push('[data-node-id="' + cssEscape(shown) + '"]');
    });
    if (selectors.length === 0) { setCaption(step); return; }
    svg.classList.add('ofk-dim');
    selectors.forEach(function (selector) {
      svg.querySelectorAll(selector).forEach(function (node) { node.classList.add('ofk-active'); });
    });
    setCaption(step);
  }
  function goto(delta) {
    if (steps.length === 0) return;
    index = Math.max(0, Math.min(steps.length - 1, index + delta));
    activate(steps[index]);
  }
  function togglePlay() {
    var button = el('play');
    if (timer) {
      clearInterval(timer);
      timer = null;
      button.textContent = '▶';
      button.setAttribute('aria-pressed', 'false');
      return;
    }
    if (index >= steps.length - 1) index = -1;
    button.textContent = '⏸';
    button.setAttribute('aria-pressed', 'true');
    timer = setInterval(function () { goto(1); }, 1400);
    goto(1);
  }

  if (steps.length > 0) {
    el('player').hidden = false;
    el('prev').addEventListener('click', function () { goto(-1); });
    el('next').addEventListener('click', function () { goto(1); });
    el('play').addEventListener('click', togglePlay);
  }
  document.addEventListener('keydown', function (event) {
    if (event.target && event.target.tagName === 'BUTTON' && event.key === ' ') return;
    if (event.key === 'ArrowRight') { goto(1); event.preventDefault(); }
    else if (event.key === 'ArrowLeft') { goto(-1); event.preventDefault(); }
    else if (event.key === ' ' && steps.length > 0) { togglePlay(); event.preventDefault(); }
  });

  if (current) show(current);
})();
</script>
</body>
</html>
`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]!);
}

async function firstModel(source: string): Promise<ArchModelData | null> {
  const workspace = await compileWorkspace(source, { layout: deterministicLayout });
  for (const view of workspace.views) {
    const model = modelFromNode(view.result.frame);
    if (model) return model;
  }
  return null;
}

async function runBuild(args: readonly string[], io: CliIo): Promise<number> {
  const parsed = parseArgs(args, new Set(['out']));
  if (parsed.error) { io.err(`openflowkit build: ${parsed.error}\n\n${USAGE}`); return 2; }
  const dir = parsed.positionals[0];
  if (!dir) { io.err(`openflowkit build: missing <dir>\n\n${USAGE}`); return 2; }
  const outDir = parsed.flags.get('out') ?? 'dist';
  try {
    const source = await readFile(path.join(dir, 'architecture.ofk'), 'utf8');
    const workspace = await compileWorkspace(source, { layout: deterministicLayout });
    if (workspace.views.length === 0) {
      io.err('openflowkit build: architecture.ofk compiled to no views');
      return 2;
    }
    const model = await firstModel(source) ?? { elements: [], relations: [], views: [], flows: [] };
    const name = model.name ?? path.basename(path.resolve(dir));

    const used = new Set<string>();
    const views: SiteView[] = [];
    for (const view of workspace.views) {
      const slug = slugifyViewId(view.viewId || 'primary', used);
      const pageId = `page:${slug}`;
      const document: SvgExportDocument = {
        id: `openflowkit-build:${slug}`,
        pages: [{
          id: pageId,
          layers: [{ id: 'default', visible: true }],
          nodes: [view.result.frame, ...view.result.groups, ...view.result.nodes],
          connectors: view.result.connectors,
        }],
      };
      const render = (theme: 'light' | 'dark'): string => {
        try {
          return exportCanonicalSvg(document, { pageId, theme, padding: 32 });
        } catch {
          return EMPTY_SVG(escapeHtml(`${view.name} — empty view`));
        }
      };
      views.push({
        slug,
        viewId: view.viewId,
        name: view.name || slug,
        svgLight: render('light'),
        svgDark: render('dark'),
        nodes: [...view.result.groups, ...view.result.nodes].map((node) => node.id),
        connectors: view.result.connectors.flatMap((connector) => {
          const from = connector.source?.nodeId;
          const to = connector.target?.nodeId;
          return typeof from === 'string' && typeof to === 'string' ? [{ id: connector.id, from, to }] : [];
        }),
      });
    }
    const flows: SiteFlow[] = model.flows.map((flow) => ({ name: flow.name, steps: flattenFlowSteps(flow) }));

    await mkdir(path.join(outDir, 'views'), { recursive: true });
    for (const view of views) {
      await writeFile(path.join(outDir, 'views', `${view.slug}.svg`), view.svgLight, 'utf8');
      await writeFile(path.join(outDir, 'views', `${view.slug}.dark.svg`), view.svgDark, 'utf8');
    }
    await writeFile(path.join(outDir, 'model.json'), `${JSON.stringify({
      name: model.name ?? null, elements: model.elements, relations: model.relations, views: model.views,
    }, null, 2)}\n`, 'utf8');
    await writeFile(path.join(outDir, 'flows.json'), `${JSON.stringify({ flows }, null, 2)}\n`, 'utf8');
    await writeFile(path.join(outDir, 'index.html'), renderIndexHtml(name, model, views, flows), 'utf8');
    io.out(`built ${outDir} — ${views.length} view(s), ${flows.reduce((total, flow) => total + flow.steps.length, 0)} flow step(s)`);
    return 0;
  } catch (error) {
    io.err(`openflowkit build: ${error instanceof Error ? error.message : String(error)}`);
    return 2;
  }
}

/* ------------------------------------------------------------------ main */

export async function main(argv: readonly string[], io: CliIo): Promise<number> {
  const [command, ...rest] = argv;
  if (!command || command === '--help' || command === '-h' || command === 'help') {
    io.err(USAGE);
    return 2;
  }
  if (command === 'drift') return runDrift(rest, io);
  if (command === 'discover') return runDiscover(rest, io);
  if (command === 'build') return runBuild(rest, io);
  io.err(`openflowkit: unknown command "${command}"\n\n${USAGE}`);
  return 2;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invokedPath && invokedPath === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2), {
    out: (message) => process.stdout.write(`${message}\n`),
    err: (message) => process.stderr.write(`${message}\n`),
  }).then(
    (code) => { process.exitCode = code; },
    (error: unknown) => {
      process.stderr.write(`openflowkit: ${error instanceof Error ? error.message : String(error)}\n`);
      process.exitCode = 2;
    },
  );
}
