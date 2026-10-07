import { describe, expect, it } from 'vitest';
import { compile } from '../compile';
import { format, serialize } from '../serialize';

describe('state family', () => {
  it('renders [*] as small dot nodes, split by side', async () => {
    const result = await compile('state\n[*] -> Idle\nIdle -> Running : go\nRunning -> [*]');
    const dots = result.nodes.filter((node) => (node.metadata.dsl as { statePseudo?: string }).statePseudo);
    expect(dots).toHaveLength(2);
    expect(dots.map((node) => node.size)).toEqual([{ width: 24, height: 24 }, { width: 24, height: 24 }]);
    expect(dots.every((node) => node.content.label === '')).toBe(true);
    expect(dots.map((node) => (node.metadata.dsl as { statePseudo?: string }).statePseudo).sort()).toEqual(['end', 'start']);
    const text = serialize(result);
    expect(text).toContain('[*] -> Idle');
    expect(text).toContain('Running -> [*]');
    expect(await format(text)).toBe(text);
  });

  it('keeps state composites as blocks with the state keyword', async () => {
    const result = await compile('state\nstate Processing {\nQueued -> Working\n}\nIdle -> Processing');
    const group = result.groups.find((node) => node.content.label === 'Processing')!;
    expect(group.parentId).toBe(result.frame.id);
    expect(serialize(result)).toContain('state Processing {');
  });

  it('keeps the line breaks of a note, in the sticky and in the text it writes back', async () => {
    const text = '%% ofk 1\nstate\n\nIdle\nnote Idle : "waits for a job\\nretries twice"\n';
    const result = await compile(text);
    expect(result.diagnostics.filter((item) => item.severity !== 'info')).toEqual([]);
    const sticky = result.nodes.find((node) => node.kind === 'sticky')!;
    expect(sticky.content.label).toBe('waits for a job\nretries twice');
    expect(serialize(result)).toBe(text);
    expect(await format(text)).toBe(text);
  });

  it('puts a note on a composite state: a sticky beside its box, written back as a note', async () => {
    const text = '%% ofk 1\nstate\n\nstate Moving {\n  Walking\n}\nnote Moving : whole box\n';
    const result = await compile(text);
    expect(result.diagnostics.filter((item) => item.severity !== 'info')).toEqual([]);
    const moving = result.groups.find((group) => group.id === 'moving')!;
    const sticky = result.nodes.find((node) => node.kind === 'sticky')!;
    expect(sticky.content.label).toBe('whole box');
    // To the right of the composite, not inside it.
    expect(sticky.transform.translation.x).toBeGreaterThanOrEqual(moving.transform.translation.x + moving.size.width);
    expect(serialize(result)).toBe(text);
  });

  it('draws fork, join and choice as control nodes', async () => {
    const result = await compile('state\nA -> F [fork]\nF -> B\nB -> M [join]\nM -> C [choice]');
    const fork = result.nodes.find((node) => node.id === 'f')!;
    const choice = result.nodes.find((node) => node.id === 'c')!;
    expect(fork.size).toEqual({ width: 150, height: 12 });
    expect(fork.appearance.fill).toBe('#475569');
    expect(choice.size.width).toBeGreaterThan(60);
    const text = serialize(result);
    expect(text).toContain('[fork, gray, bold]');
    expect(await format(text)).toBe(text);
  });

  it('accepts the shape role words flowchart uses', async () => {
    const result = await compile('state\nA [ellipse] -> B [diamond]\nB --> C [rounded] : ok');
    expect(result.nodes.find((node) => node.id === 'a')?.content.shape).toBe('ellipse');
    expect(result.nodes.find((node) => node.id === 'b')?.content.shape).toBe('diamond');
    expect(result.nodes.find((node) => node.id === 'c')?.content.shape).toBe('rounded');
  });

  it('drops malformed lines and warns about unclosed composites', async () => {
    const result = await compile('state\n-> Missing\nstate Broken {\nA -> B');
    const codes = result.diagnostics.map((item) => item.code);
    expect(codes).toContain('W101');
    expect(codes).toContain('W103');
    expect(result.nodes.some((node) => node.id === 'missing')).toBe(false);
  });
});
