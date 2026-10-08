// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  MARKER, buildComment, hasMarker, code, hunksOnly, isRegularFile, isSameRepo, parseNameStatus, pathMatcher, summarizeDrift, svgBeside, truncateDiff,
} from './prDiagrams.lib.mjs';

describe('pathMatcher', () => {
  it('matches extensions, case-insensitively', () => {
    const m = pathMatcher('.openflow.json,.ofk');
    expect(m('a/b.openflow.json')).toBe(true);
    expect(m('architecture.OFK')).toBe(true);
    expect(m('package.json')).toBe(false);
  });
  it('matches globs', () => {
    const m = pathMatcher('docs/**/*.ofk, *.mmd');
    expect(m('docs/a/b/c.ofk')).toBe(true);
    expect(m('docs/c.ofk')).toBe(true);
    expect(m('src/c.ofk')).toBe(false);
    expect(m('x.mmd')).toBe(true);
    expect(m('d/x.mmd')).toBe(false);
  });
});

describe('parseNameStatus', () => {
  it('covers added, modified, deleted and renamed', () => {
    const raw = ['A', 'new.ofk', 'M', 'm.ofk', 'D', 'gone.ofk', 'R087', 'old.ofk', 'moved.ofk', ''].join('\0');
    expect(parseNameStatus(raw)).toEqual([
      { status: 'added', path: 'new.ofk' },
      { status: 'modified', path: 'm.ofk' },
      { status: 'deleted', path: 'gone.ofk' },
      { status: 'renamed', oldPath: 'old.ofk', path: 'moved.ofk' },
    ]);
    expect(parseNameStatus('')).toEqual([]);
  });
});

describe('svgBeside (mirror of mcp-server/src/lib/svgBeside.ts)', () => {
  it.each([
    ['a/flow.openflow.json', 'a/flow.svg'],
    ['a/flow.json', 'a/flow.svg'],
    ['architecture.ofk', 'architecture.svg'],
    ['A/Flow.OpenFlow.JSON', 'A/Flow.svg'],
    ['notes.txt', 'notes.txt.svg'],
  ])('%s -> %s', (file, svg) => expect(svgBeside(file)).toBe(svg));
});

describe('escaping', () => {
  it('wraps untrusted text so markdown and @mentions stay inert', () => {
    expect(code('a`b')).toBe('`` a`b ``');
    expect(code('line1\nline2 @bob')).toBe('` line1 line2 @bob `');
  });
  it('escapes paths, drift names and error lines in the comment', () => {
    const body = buildComment({ entries: [{ path: 'x`@evil.ofk', status: 'added', errors: ['after: <b>@team</b> failed'], drift: { gone: 1, new: 0, changed: 0, items: ['gone: @all (a)'] } }] });
    expect(body).toContain('`` x`@evil.ofk ``');
    expect(body).toContain('> ` after: <b>@team</b> failed `');
    expect(body).toContain('- ` gone: @all (a) `');
  });
  it('only a regular file counts as a committed svg', () => {
    expect(isRegularFile('100644 blob abc\ta.svg')).toBe(true);
    expect(isRegularFile('120000 blob abc\ta.svg')).toBe(false);
    expect(isRegularFile('040000 tree abc\ta.svg')).toBe(false);
    expect(isRegularFile('160000 commit abc\ta.svg')).toBe(false);
  });
});

describe('markers and repos', () => {
  it('detects the marker', () => {
    expect(hasMarker(`hi\n${MARKER}`)).toBe(true);
    expect(hasMarker('nope')).toBe(false);
    expect(hasMarker(undefined)).toBe(false);
  });
  it('tells a fork from the same repo', () => {
    const ev = (head) => ({ pull_request: { head: { repo: { full_name: head } }, base: { repo: { full_name: 'o/r' } } } });
    expect(isSameRepo(ev('o/r'))).toBe(true);
    expect(isSameRepo(ev('fork/r'))).toBe(false);
    expect(isSameRepo({ pull_request: { head: { repo: null }, base: { repo: { full_name: 'o/r' } } } })).toBe(false);
  });
});

describe('diff helpers', () => {
  it('truncates with a note', () => {
    const text = Array.from({ length: 5 }, (_, i) => `l${i}`).join('\n');
    expect(truncateDiff(text, 10)).toBe(text);
    expect(truncateDiff(text, 2)).toBe('l0\nl1\n... 3 more line(s) not shown');
  });
  it('drops the git header', () => {
    expect(hunksOnly('diff --git a b\nindex 1..2\n--- a\n+++ b\n@@ -1 +1 @@\n-x\n+y\n')).toBe('@@ -1 +1 @@\n-x\n+y\n');
    expect(hunksOnly('')).toBe('');
  });
});

describe('summarizeDrift', () => {
  it('maps undrawn to gone and missing to new', () => {
    const s = summarizeDrift({ undrawn: [{ id: 'a', name: 'A' }], missing: [{ id: 'b', name: 'B' }, { id: 'c', name: 'C' }], changed: [{ id: 'd', field: 'tech', model: 'x', repo: 'y' }] });
    expect([s.gone, s.new, s.changed]).toEqual([1, 2, 1]);
    expect(s.items[0]).toBe('gone: A (a)');
  });
});

describe('buildComment', () => {
  const base = { path: 'a.openflow.json', status: 'modified', before: { nodes: 2, connectors: 1 }, after: { nodes: 3, connectors: 2 }, diff: '@@ -1 +1 @@\n-x\n+y' };
  it('has the marker, counts, a diff block, drift, stale list and artifact link', () => {
    const body = buildComment({
      entries: [{ ...base, drift: { gone: 1, new: 0, changed: 0, items: ['gone: A (a)'] } }],
      stale: [{ svg: 'a.svg', refreshed: false }], artifactUrl: 'https://x/run/1',
    });
    expect(body.startsWith(MARKER)).toBe(true);
    expect(body).toContain('2 nodes, 1 connectors -> 3 nodes, 2 connectors');
    expect(body).toContain('```diff\n@@ -1 +1 @@');
    expect(body).toContain('Drift: 1 gone, 0 new, 0 changed');
    expect(body).toContain('` a.svg ` differs from a fresh render');
    expect(body).toContain('(https://x/run/1)');
  });
  it('reports errors as a line and a refreshed svg as pushed', () => {
    const body = buildComment({ entries: [{ path: 'b.ofk', status: 'added', errors: ['after: render failed: bad'] }], stale: [{ svg: 'b.svg', refreshed: true }] });
    expect(body).toContain('> ` after: render failed: bad `');
    expect(body).toContain('was refreshed and pushed');
    expect(body).not.toContain('No change to the diagram source');
  });
  it('caps the body under the GitHub limit', () => {
    const body = buildComment({ entries: [{ ...base, diff: 'x'.repeat(100000) }] });
    expect(body.length).toBeLessThan(65536);
    expect(body).toContain('comment truncated');
  });
});
