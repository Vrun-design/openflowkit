// Pure helpers for pr-diagrams.mjs: no I/O, so each one is a unit test.

export const MARKER = '<!-- openflowkit-pr-diagrams -->';
export const DIFF_LINE_CAP = 300;
// GitHub rejects comments over 65536 characters.
const BODY_CAP = 60000;

/** `.openflow.json,.ofk` -> matcher. A token starting with `.` is an extension; anything else is a glob (`**`, `*`). */
export function pathMatcher(spec) {
  const tokens = String(spec || '').split(',').map((token) => token.trim()).filter(Boolean);
  const tests = tokens.map((token) => {
    if (token.startsWith('.')) { const ext = token.toLowerCase(); return (file) => file.toLowerCase().endsWith(ext); }
    const source = token.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*\/?/g, '\u0000').replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]').replace(/\u0000/g, '(?:.*/)?');
    const regex = new RegExp(`^${source}$`);
    return (file) => regex.test(file);
  });
  return (file) => tests.some((test) => test(file));
}

/** Parses `git diff --name-status -z -M` into `{ status, path, oldPath? }`; status is added | modified | deleted | renamed. */
export function parseNameStatus(raw) {
  const parts = raw.split('\0');
  const out = [];
  for (let i = 0; i < parts.length && parts[i]; ) {
    const code = parts[i][0];
    if (code === 'R' || code === 'C') { out.push({ status: 'renamed', oldPath: parts[i + 1], path: parts[i + 2] }); i += 3; continue; }
    const status = { A: 'added', D: 'deleted' }[code] ?? 'modified';
    out.push({ status, path: parts[i + 1] }); i += 2;
  }
  return out;
}

/** Mirrors mcp-server/src/lib/svgBeside.ts `svgBeside`: keep the two rules identical. */
export function svgBeside(file) {
  const suffix = /\.(openflow\.json|ofk|json)$/i;
  return suffix.test(file) ? file.replace(suffix, '.svg') : `${file}.svg`;
}

/** Same-repo PR: the head repo is the base repo, so the token can push to it. */
export function isSameRepo(event) {
  const pr = event.pull_request;
  return Boolean(pr?.head?.repo && pr.base?.repo && pr.head.repo.full_name === pr.base.repo.full_name);
}

export function hasMarker(body) { return typeof body === 'string' && body.includes(MARKER); }

/** Keeps the first `cap` lines of a diff, noting how many were dropped. */
export function truncateDiff(text, cap = DIFF_LINE_CAP) {
  const lines = text.replace(/\n$/, '').split('\n');
  if (lines.length <= cap) return lines.join('\n');
  return `${lines.slice(0, cap).join('\n')}\n... ${lines.length - cap} more line(s) not shown`;
}

/** Drops the `diff --git`/`index`/`---`/`+++` header from a unified diff, keeping hunks. */
export function hunksOnly(unified) {
  const lines = unified.split('\n');
  const first = lines.findIndex((line) => line.startsWith('@@'));
  return first === -1 ? '' : lines.slice(first).join('\n');
}

/** drift --json -> `{ gone, new, changed, items }`: undrawn = model entry gone from the repo, missing = new in the repo. */
export function summarizeDrift(report) {
  const gone = report.undrawn ?? [], added = report.missing ?? [], changed = report.changed ?? [];
  const items = [
    ...gone.map((f) => `gone: ${f.name} (${f.id})`),
    ...added.map((f) => `new: ${f.name} (${f.id})`),
    ...changed.map((c) => `changed: ${c.id} ${c.field} "${c.model}" -> "${c.repo}"`),
  ];
  return { gone: gone.length, new: added.length, changed: changed.length, items };
}

/** Inline code that can hold anything: one line, a fence longer than any backtick run inside. Stops markdown, HTML and @mentions in untrusted text. */
export function code(text) {
  const flat = String(text).replace(/\s*\n\s*/g, ' ').trim();
  const fence = '`'.repeat(Math.max(0, ...[...flat.matchAll(/`+/g)].map((m) => m[0].length)) + 1);
  return `${fence} ${flat} ${fence}`;
}

/** A `git ls-tree` line is a regular file (mode 100644), not a symlink, submodule or directory. */
export function isRegularFile(lsTreeLine) { return /^100644 blob /.test(lsTreeLine); }

const statusLabel = { added: 'added', modified: 'modified', deleted: 'deleted', renamed: 'renamed' };
const counts = (c) => (c ? `${c.nodes} nodes, ${c.connectors} connectors` : null);

/**
 * The one comment. `entries`: { path, oldPath?, status, before?, after?, diff?, drift?, error? }.
 * `stale`: [{ path, svg, refreshed }]. `artifactUrl`: the run page, or null.
 */
export function buildComment({ entries, stale = [], artifactUrl = null, refreshedNote = null }) {
  const out = [MARKER, '## Diagram changes', ''];
  for (const e of entries) {
    out.push(`### ${code(e.path)} (${statusLabel[e.status]}${e.oldPath ? ` from ${code(e.oldPath)}` : ''})`);
    const before = counts(e.before), after = counts(e.after);
    if (before && after) out.push(`${before} -> ${after}`);
    else if (after) out.push(after);
    else if (before) out.push(`was ${before}`);
    for (const line of [...(e.errors ?? []), ...(e.notes ?? [])]) out.push(`> ${code(line)}`);
    if (e.diff) out.push('', '```diff', e.diff.replace(/```/g, "'''"), '```');
    else if (!(e.errors ?? []).length && !(e.notes ?? []).length) out.push('', 'No change to the diagram source.');
    if (e.drift) {
      out.push('');
      if (e.drift.items.length === 0) out.push('Drift: none.');
      else out.push(`Drift: ${e.drift.gone} gone, ${e.drift.new} new, ${e.drift.changed} changed`, ...e.drift.items.slice(0, 20).map((i) => `- ${code(i)}`), ...(e.drift.items.length > 20 ? [`- ... ${e.drift.items.length - 20} more`] : []));
    }
    out.push('');
  }
  if (stale.length) {
    out.push('### Stale SVGs', '');
    for (const s of stale) out.push(`- ${code(s.svg)} ${s.refreshed ? 'was refreshed and pushed to this branch' : 'differs from a fresh render of its diagram; regenerate it'}`);
    out.push('');
  }
  if (refreshedNote) out.push(refreshedNote, '');
  // ponytail: images are artifacts, not inline: GitHub renders no SVG from CI without hosting — upgrade by committing them to a branch or using an image host.
  if (artifactUrl) out.push(`Before/after SVGs: [workflow run artifacts](${artifactUrl}) (artifact \`diagram-svgs\`).`, '');
  const body = out.join('\n');
  return body.length <= BODY_CAP ? body : `${body.slice(0, BODY_CAP)}\n\n... comment truncated`;
}
