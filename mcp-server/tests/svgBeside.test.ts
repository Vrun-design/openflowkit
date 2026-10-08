import { describe, expect, it } from 'vitest';
import { svgBeside } from '../src/lib/svgBeside.js';

describe('svgBeside', () => {
  it.each([
    ['a/flow.openflow.json', 'a/flow.svg'],
    ['a/flow.json', 'a/flow.svg'],
    ['architecture.ofk', 'architecture.svg'],
    ['A/Flow.OpenFlow.JSON', 'A/Flow.svg'],
    ['notes.txt', 'notes.txt.svg'],
    ['noext', 'noext.svg'],
  ])('%s -> %s', (file, svg) => {
    expect(svgBeside(file)).toBe(svg);
  });
});
