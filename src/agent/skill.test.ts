// The agent skill (skills/openflowkit/SKILL.md) and public/llms.txt cannot
// drift from what ships: every example compiles clean, every tool it names
// exists, its vocabulary is the grammar's, and llms.txt carries the same body.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { llmsText } from '../../scripts/sync-llms.mjs';
import { headlessElkLayout } from './headlessLayout';
import { createFileCapabilities } from './host';
import { lintDsl } from './lint';
import { AGENT_OPS } from './ops';
import type { IconMatch } from './ops/types';

const skill = readFileSync('skills/openflowkit/SKILL.md', 'utf8');
const grammar = readFileSync('src/dsl/grammar.md', 'utf8');
const blocks = (language: string) => [...skill.matchAll(new RegExp('```' + language + '\\n([\\s\\S]*?)```', 'g'))].map((match) => match[1]!);
const prose = skill.replace(/```[\s\S]*?```/g, '');

describe('agent skill', () => {
  it('is a skill: name, a description, at most 120 lines', () => {
    expect(skill).toMatch(/^---\nname: openflowkit\ndescription: .{40,}\n---\n/);
    expect(skill.split('\n').length).toBeLessThanOrEqual(120);
  });

  it('every DSL example compiles without a warning, icons resolved', async () => {
    const icons = JSON.parse(readFileSync('mcp-server/data/icons.json', 'utf8')) as IconMatch[];
    const host = createFileCapabilities({ grammar, icons, layout: headlessElkLayout });
    expect(blocks('dsl').length).toBeGreaterThanOrEqual(3);
    for (const source of blocks('dsl')) {
      const compiled = await host.compile(source);
      expect(compiled.diagnostics.filter(({ severity }) => severity !== 'info'), source).toEqual([]);
      expect(compiled.nodes.length, source).toBeGreaterThan(1);
    }
  });

  it('every Mermaid example converts with nothing lost', () => {
    for (const source of blocks('mermaid')) {
      expect(lintDsl(source)).toMatchObject({ ok: true, converted: { from: 'mermaid', losses: [] } });
    }
  });

  it('names only tools the MCP server has', () => {
    const discovery = readFileSync('mcp-server/src/tools/discovery.ts', 'utf8');
    const staticTools = [...discovery.slice(discovery.indexOf('STATIC_TOOLS')).split(']')[0]!.matchAll(/'([a-z_]+)'/g)].map((match) => match[1]);
    const tools = new Set([...staticTools, ...AGENT_OPS.map(({ name }) => name)]);
    const named = [...prose.matchAll(/`([a-z]+(?:_[a-z]+)+)`/g)].map((match) => match[1]!);
    expect(named.length).toBeGreaterThan(5);
    expect(named.filter((name) => !tools.has(name))).toEqual([]);
  });

  it('lists the grammar’s shapes and colours, word for word', () => {
    const words = (text: string) => [...text.matchAll(/`([a-z]+)`/g)].map((match) => match[1]);
    const shapes = /\*\*shape\*\* \(nodes\): ([\s\S]*?)\. Aliases/.exec(grammar)![1]!;
    const colours = /\*\*colour\*\*: ([^\n]*?) or/.exec(grammar)![1]!;
    expect(skill).toContain(`- Shapes: \`${words(shapes).join(' ')}\``);
    expect(skill).toContain(`- Colours: ${colours.trim()} or`);
  });

  it('public/llms.txt is the same text (npm run skill:sync)', () => {
    expect(readFileSync('public/llms.txt', 'utf8')).toBe(llmsText(skill));
  });
});
