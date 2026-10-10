import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { shippedGrammar } from './useV2AgentHost';

it('serves the language, not the design notes: §0 is gone, §1 onward stays', () => {
  const grammar = readFileSync(join(process.cwd(), 'src/dsl/grammar.md'), 'utf8');
  const served = shippedGrammar(grammar);
  expect(served).not.toMatch(/^## 0\./m);
  expect(served).not.toContain('§0 prior art');
  expect(served).toMatch(/^## 1\. /m);
  expect(served.length).toBeGreaterThan(grammar.length / 2);
});
