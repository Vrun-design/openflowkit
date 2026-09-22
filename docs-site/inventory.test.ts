// The truth gate for docs-site/inventory.json: a `shipped` feature must point
// at a real file, and every shortcut row, agent op and shipped family must be
// claimed by some feature. A new shortcut or op without an inventory row fails
// here, which is what keeps the docs rebuild honest (phase 9.1).
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import inventory from './inventory.json';
import { AGENT_OPS } from '../src/agent/ops';
import { DSL_FAMILIES } from '../src/dsl/ast';
import { RESERVED_FAMILIES } from '../src/dsl/document';
import { shortcutGroups } from '../src/opencanvas/presentation/v2/v2Shortcuts';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const STATUSES = ['shipped', 'partial', 'absent'] as const;

interface Feature {
  readonly id: string;
  readonly name: string;
  readonly status: (typeof STATUSES)[number];
  readonly evidence: string;
  readonly notes: string;
  readonly shortcuts?: readonly string[];
  readonly ops?: readonly string[];
  readonly families?: readonly string[];
}

const features = inventory.features as readonly Feature[];
const claimed = (key: 'shortcuts' | 'ops' | 'families'): Set<string> =>
  new Set(features.flatMap((feature) => feature[key] ?? []));

describe('feature inventory', () => {
  it('uses ids and statuses the page gate can rely on', () => {
    const ids = features.map(({ id }) => id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const feature of features) {
      expect(STATUSES).toContain(feature.status);
      expect(feature.notes.length).toBeGreaterThan(0);
    }
  });

  it('points every shipped feature at a file that exists', () => {
    for (const feature of features.filter(({ status }) => status === 'shipped')) {
      const path = feature.evidence.replace(/:\d+$/, '');
      expect(path.startsWith('src/') || path.startsWith('mcp-server/') || path.startsWith('scripts/') || path.startsWith('package.json'), `${feature.id} evidence must be repo-relative`).toBe(true);
      expect(existsSync(resolve(REPO_ROOT, path)), `${feature.id}: ${path} does not exist`).toBe(true);
    }
  });

  it('covers every row of v2Shortcuts.ts', () => {
    const shortcuts = claimed('shortcuts');
    const missing = shortcutGroups().flatMap(({ rows }) => rows.map(({ label }) => label)).filter((label) => !shortcuts.has(label));
    expect(missing).toEqual([]);
  });

  it('covers every op in the agent registry', () => {
    const ops = claimed('ops');
    const missing = AGENT_OPS.map(({ name }) => name).filter((name) => !ops.has(name));
    expect(missing).toEqual([]);
  });

  it('covers every family the compiler actually implements, and names every reserved one', () => {
    const families = claimed('families');
    const implemented = DSL_FAMILIES.filter((family) => !(RESERVED_FAMILIES as readonly string[]).includes(family));
    const missing = [...implemented, ...RESERVED_FAMILIES].filter((family) => !families.has(family));
    expect(missing).toEqual([]);
  });
});
