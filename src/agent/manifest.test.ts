import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { findAgentAction } from './actions';
import { CAPABILITY_MANIFEST, manifestCoverage, unlistedActions } from './manifest';

describe('capability manifest', () => {
  it('lists every registered action with a real equivalence test', () => {
    expect(unlistedActions()).toEqual([]);
    for (const row of CAPABILITY_MANIFEST) {
      if (row.status === 'gap') {
        expect(row.action, row.operation).toBeNull();
        expect(row.closes, row.operation).toMatch(/^V2-/);
        continue;
      }
      expect(findAgentAction(row.action!), `${row.operation}: action ${row.action} must exist`).not.toBeNull();
      expect(fs.existsSync(row.equivalenceTest!), `${row.operation}: ${row.equivalenceTest} must exist`).toBe(true);
      expect(fs.readFileSync(row.equivalenceTest!, 'utf8')).toContain(row.action!);
    }
    expect(new Set(CAPABILITY_MANIFEST.map(({ operation }) => operation)).size).toBe(CAPABILITY_MANIFEST.length);
  });

  it('reports coverage', () => {
    const { shipped, total } = manifestCoverage();
    expect(shipped).toBeGreaterThan(0);
    expect(shipped).toBeLessThanOrEqual(total);
  });
});
