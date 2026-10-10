import { describe, expect, it } from 'vitest';
import { AGENT_OPS, findAgentOp, opInputShape } from './index';

// MCP tools and CLI help advertise these fields; a `.refine` once hid all of add_shape's.
describe('opInputShape', () => {
  it('sees through a cross-field rule to the fields', () => {
    expect(Object.keys(opInputShape(findAgentOp('add_shape')!))).toEqual(expect.arrayContaining(['kind', 'label', 'x', 'y']));
  });

  it('lists each add_shape kind once', () => {
    const kinds = (opInputShape(findAgentOp('add_shape')!).kind as unknown as { _def: { innerType: { options: { options?: string[] }[] } } })
      ._def.innerType.options[0]!.options!;
    expect(kinds).toContain('ellipse');
    expect(kinds).toEqual([...new Set(kinds)]);
  });

  it('gives every op with input its fields', () => {
    const empty = AGENT_OPS.filter((op) => Object.keys(opInputShape(op)).length === 0).map((op) => op.name);
    expect(empty).toEqual(AGENT_OPS.filter((op) => Object.keys((op.schema as { shape?: object }).shape ?? { refined: true }).length === 0).map((op) => op.name));
  });
});
