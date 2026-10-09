import { describe, expect, it } from 'vitest';
import { measurePortableText } from './measurement';

describe('portable text measurement', () => {
  it('is deterministic and distinguishes narrow, wide, CJK, and emoji glyphs', () => {
    const style = { fontSize: 10 };
    expect(measurePortableText('iii', style).width).toBeLessThan(measurePortableText('WWW', style).width);
    expect(measurePortableText('漢字', style).width).toBe(20);
    expect(measurePortableText('😀', style).width).toBe(10);
    expect(measurePortableText('repeat', style)).toEqual(measurePortableText('repeat', style));
  });

  it('wraps and ellipsizes within width and line limits', () => {
    const wrapped = measurePortableText('alpha beta gamma delta', {
      fontSize: 10, maxWidth: 42, maxLines: 2, overflow: 'wrap',
    });
    expect(wrapped.lines).toHaveLength(2);
    expect(wrapped.displayText).toMatch(/…$/);
    expect(wrapped.width).toBeLessThanOrEqual(42);
    const ellipsis = measurePortableText('long content', {
      fontSize: 10, maxWidth: 30, overflow: 'ellipsis',
    });
    expect(ellipsis.displayText).toMatch(/…$/);
  });

  it('keeps a line that fits the limit, even when the space after it would not', () => {
    const text = 'Validate the incoming payment request against fraud rules and limits';
    const style = { fontSize: 14, fontWeight: 600 as const, overflow: 'wrap' as const };
    const roomy = measurePortableText(text, { ...style, maxWidth: 288 });
    expect(roomy.lines).toEqual(['Validate the incoming payment request', 'against fraud rules and limits']);
    const snug = measurePortableText(text, { ...style, maxWidth: Math.ceil(roomy.width) });
    expect(snug.lines).toEqual(roomy.lines);
  });
});
