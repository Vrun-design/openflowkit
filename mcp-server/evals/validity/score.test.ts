import { describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServerWithDeps } from '../../src/server.js';
import { scoreCase } from './score.js';

async function client(): Promise<Client> {
  const { server } = createServerWithDeps({ log: () => undefined });
  const instance = new Client({ name: 'validity-score', version: '0.0.0' });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(b), instance.connect(a)]);
  return instance;
}

describe('validity scoring', () => {
  it('scores DSL, fenced Mermaid, a broken draw and an unconvertible family', async () => {
    const target = await client();
    expect(await scoreCase(target, 'flowchart\n  A -> B')).toMatchObject({ valid: true, nodes: 2, problems: [] });
    expect(await scoreCase(target, '```mermaid\nflowchart LR\n  A[x] --> B\n```')).toMatchObject({ valid: true, mermaidLosses: 0 });
    expect(await scoreCase(target, 'gantt\n  title Plan')).toMatchObject({ valid: false, problems: [expect.stringMatching(/cannot be converted/)] });
    expect(await scoreCase(target, 'flowchart')).toMatchObject({ valid: false, problems: ['The diagram compiled to no nodes.'] });
  });
});
