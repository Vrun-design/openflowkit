import { describe, expect, it } from 'vitest';
import { measurePortableText } from '../opencanvas/domain/text/measurement';
import { compile } from './compile';
import { measureNodeSize, wrapPolicyFor, type NodeMeasureRequest } from './sizing';
import { SHAPE_WORDS } from './vocabulary';

const LONG = 'Validate the incoming payment request against fraud rules and limits';
const request = (label: string, subLabel?: string, word = 'rect'): NodeMeasureRequest =>
  ({ kind: 'process', label, ...(subLabel ? { subLabel } : {}), hasIcon: false, spec: SHAPE_WORDS[word]! });

/** What the renderer draws: label 14/600 and sub-label 11/400 wrapped at `width - 2 * 16`, 16px padding all round. */
function drawn({ width }: { width: number }, label: string, subLabel = '') {
  const wrap = (text: string, fontSize: number, fontWeight: 400 | 600) =>
    measurePortableText(text, { fontSize, fontWeight, maxWidth: width - 32, maxLines: 4, overflow: 'wrap' });
  const name = wrap(label, 14, 600);
  const sub = subLabel ? wrap(subLabel, 11, 400) : null;
  return { width: Math.max(name.width, sub?.width ?? 0), height: 32 + name.height + (sub ? 4 + sub.height : 0), lines: name.lines.length };
}

describe('node sizing', () => {
  it('keeps nodes whose text fits on one line at the sizes they had', () => {
    expect(measureNodeSize(request('Process payment'))).toEqual({ width: 154, height: 52 });
    expect(measureNodeSize(request('A'))).toEqual({ width: 120, height: 52 });
    expect(wrapPolicyFor(request('Process payment'), { width: 154, height: 52 })).toBeNull();
  });

  it('wraps a label wider than the shape can be, inside the box', () => {
    const size = measureNodeSize(request(LONG));
    expect(size.width).toBeLessThanOrEqual(320);
    const text = drawn(size, LONG);
    expect(text.lines).toBe(2);
    expect(text.width).toBeLessThanOrEqual(size.width - 32);
    expect(text.height).toBeLessThanOrEqual(size.height);
    expect(wrapPolicyFor(request(LONG), size)).toMatchObject({ overflow: 'wrap', maxLines: 4 });
  });

  it('wraps a description with its name in the final inner width, for every shape', () => {
    const desc = 'Allows customers to view their accounts, make payments, and manage everything from anywhere';
    const wrapped: string[] = [];
    for (const [word, spec] of Object.entries(SHAPE_WORDS)) {
      if (spec.kind !== 'process' || spec.shape === 'actor' || spec.maxSize.width < 200) continue;
      const size = measureNodeSize(request(LONG, desc, word));
      if (!wrapPolicyFor(request(LONG, desc, word), size)) continue;
      wrapped.push(word);
      const text = drawn(size, LONG, desc);
      expect(text.width, word).toBeLessThanOrEqual(size.width - 32 + 1e-9);
      if (text.height <= spec.maxSize.height) expect(text.height, word).toBeLessThanOrEqual(size.height);
    }
    expect(wrapped).toEqual(expect.arrayContaining(['rect', 'rounded', 'component', 'queue']));
  });

  it('gives a wrapped node the full wrap width, so the canvas font has slack', () => {
    expect(measureNodeSize(request(LONG)).width).toBe(320);
  });

  it('keeps shapes whose label area is inset on one line, as before', () => {
    for (const word of ['choice', 'diamond', 'circle']) {
      const spec = SHAPE_WORDS[word]!;
      const size = measureNodeSize(request('CheckPaymentStatus', undefined, word));
      expect(wrapPolicyFor(request('CheckPaymentStatus', undefined, word), size), word).toBeNull();
      expect(size.width, word).toBeLessThanOrEqual(spec.maxSize.width);
    }
    expect(measureNodeSize(request('CheckPaymentStatus', undefined, 'choice'))).toEqual({ width: 96, height: 64 });
  });

  it('sizes an actor for the lines it draws, 10px from its sides', () => {
    const label = 'Customer service representative on duty';
    const size = measureNodeSize(request(label, undefined, 'person'));
    expect(wrapPolicyFor(request(label, undefined, 'person'), size)).toMatchObject({ overflow: 'wrap' });
    const lines = measurePortableText(label, { fontSize: 14, fontWeight: 600, maxWidth: size.width - 20, maxLines: 4, overflow: 'wrap' });
    expect(lines.lines.length).toBeGreaterThan(1);
    expect(20 + lines.height).toBeLessThanOrEqual(size.height);
  });

  it('caps a long description at the policy line count, so the box is no taller than the text drawn', () => {
    const desc = 'word '.repeat(80).trim();
    const size = measureNodeSize(request('Name', desc));
    const inner = size.width - 32;
    const sub = measurePortableText(desc, { fontSize: 11, fontWeight: 400, maxWidth: inner, maxLines: 4, overflow: 'wrap' });
    expect(sub.lines).toHaveLength(4);
    expect(sub.displayText).toMatch(/…$/);
    expect(size.height).toBe(Math.ceil(32 + 14 * 1.2 + 4 + 4 * 11 * 1.2));
  });

  it('rounds the box up so a line that just fits stays on one line', () => {
    const size = measureNodeSize(request('Customer database record view'));
    const exact = measurePortableText('Customer database record view', { fontSize: 14, fontWeight: 600 }).width;
    expect(size.width).toBeGreaterThanOrEqual(exact + 32);
    expect(Number.isInteger(size.width) && Number.isInteger(size.height)).toBe(true);
  });
});

describe('wrapping through the families', () => {
  const sized = (nodes: Awaited<ReturnType<typeof compile>>['nodes'], label: string) => nodes.find((node) => node.content.label === label)!;

  it('flowchart: a long label carries the wrap policy and fits; a short one carries none', async () => {
    const { nodes } = await compile(`flowchart right\n${LONG} -> B`);
    const long = sized(nodes, LONG);
    expect(long.content.sizingPolicy).toMatchObject({ overflow: 'wrap' });
    expect(drawn(long.size, LONG).height).toBeLessThanOrEqual(long.size.height);
    expect(sized(nodes, 'B').content.sizingPolicy).toBeUndefined();
  });

  it('state: a long description wraps inside the state box', async () => {
    const desc = 'Waits for the payment provider to confirm the charge before the order is released to the warehouse';
    const { nodes } = await compile(`state\nIdle [desc: "${desc}"]\nIdle -> Done`);
    const idle = sized(nodes, 'Idle');
    const text = drawn(idle.size, 'Idle', desc);
    expect(idle.content.sizingPolicy).toMatchObject({ overflow: 'wrap' });
    expect(text.width).toBeLessThanOrEqual(idle.size.width - 32 + 1e-9);
    expect(text.height).toBeLessThanOrEqual(idle.size.height);
  });
});
