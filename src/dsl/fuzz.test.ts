import { describe, expect, it } from 'vitest';
import { DSL_FAMILIES } from './ast';
import { compile } from './compile';
import { parse } from './parse';
import { serialize } from './serialize';

// Grammar §2.1: parsing never throws. Seeded so a failure reproduces.
function rng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

const ALPHABET = 'ab AB\n\t"\'[]{}:=,;->-<|.*#/@()~`0123456789é中\u{1F600}';
const FRAGMENTS = [
  '->', '-->', '<->', '<-', '--', '->>', '--|>', '..|>', '||--o{', '}o..|{', '[', ']', '{', '}', ':', '=', ',', ';', '//',
  'group', 'participant', 'loop', 'alt', 'else', 'note', 'commit', 'branch', 'merge', 'state', 'class', '[*]', 'central:',
  '- ', 'model', 'system', 'container', 'view', 'flow', 'step', 'include', 'title:', 'direction', 'appearance:', '%% ofk 2', '\n',
];

function randomText(random: () => number): string {
  const length = Math.floor(random() * 40);
  let out = '';
  for (let index = 0; index < length; index += 1) {
    if (random() < 0.5) out += FRAGMENTS[Math.floor(random() * FRAGMENTS.length)];
    else out += ALPHABET[Math.floor(random() * ALPHABET.length)];
    if (random() < 0.3) out += ' ';
  }
  return out;
}

describe('dsl fuzz', () => {
  it('never throws on random input, for every family', async () => {
    const random = rng(1337);
    for (let round = 0; round < 60; round += 1) {
      for (const family of DSL_FAMILIES) {
        const text = `${family}\n${randomText(random)}`;
        expect(() => parse(text)).not.toThrow();
        const compiled = await compile(text);
        expect(Number.isFinite(compiled.frame.size.width)).toBe(true);
        expect(() => serialize(compiled)).not.toThrow();
      }
    }
  });

  it('survives control characters, unterminated quotes and deep nesting', async () => {
    const nasty = ['\u0000\u0001\u0002', '"never closed', '{'.repeat(200), '}'.repeat(200), 'a -> '.repeat(500), '[[[[[', ']]]]]', '\r\n\r\n', ' '.repeat(10_000)];
    for (const text of nasty) {
      expect(() => parse(text)).not.toThrow();
      const compiled = await compile(text);
      expect(() => serialize(compiled)).not.toThrow();
    }
  });
});
