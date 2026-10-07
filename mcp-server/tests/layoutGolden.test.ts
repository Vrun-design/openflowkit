import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { loadFileCapabilities } from '../src/lib/fileCapabilities.js';

// One layout everywhere: the file host (MCP file mode, CLI `build`) lays out with the
// same ELK as the editor. e2e/layout-golden.spec.ts holds the browser to this same file.
describe('headless layout', () => {
  it('matches the golden positions the editor produces', async () => {
    const golden = JSON.parse(await readFile(new URL('../../e2e/fixtures/layout-golden.json', import.meta.url), 'utf8')) as {
      dsl: string; positions: Record<string, { x: number; y: number }>;
    };
    const result = await (await loadFileCapabilities()).compile(golden.dsl) as {
      groups: { content: { label?: string }; transform: { translation: { x: number; y: number } } }[];
      nodes: { content: { label?: string }; transform: { translation: { x: number; y: number } } }[];
    };
    const positions = Object.fromEntries([...result.groups, ...result.nodes].map((node) => [node.content.label, node.transform.translation]));
    expect(positions).toEqual(golden.positions);
  });
});
