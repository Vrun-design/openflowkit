import { describe, expect, it } from 'vitest';
import type { SceneNode } from '../document/types';
import { nodeStyleFont, resolveNodeStyle } from './nodeStyle';

function node(overrides: Partial<SceneNode>): SceneNode {
  return {
    id: 'n', kind: 'process', parentId: null, layerId: 'default', zIndex: 0,
    transform: { translation: { x: 0, y: 0 }, rotationRadians: 0, scale: { x: 1, y: 1 } },
    size: { width: 160, height: 72 }, content: { shape: 'rounded', label: 'A' }, appearance: {},
    ports: [], metadata: {}, extensions: {}, ...overrides,
  };
}

describe('resolveNodeStyle', () => {
  it('falls back to the palette for shapes with no appearance keys', () => {
    const style = resolveNodeStyle(node({ content: { shape: 'rounded', color: 'blue' } }));
    expect(style.fill).toBe('#eff6ff');
    expect(style.stroke).toBe('#60a5fa');
    expect(style.cornerRadius).toBe(12);
    expect(style.fontSize).toBe(14);
    expect(style.fontWeight).toBe(600);
    expect(style.textPadding).toBe(16);
  });

  it('prefers flat appearance keys and clamps them', () => {
    const style = resolveNodeStyle(node({ appearance: {
      fill: '#FF0000', stroke: 'transparent', strokeWidth: 99, cornerRadius: -4, fontSize: 200,
      fontFamily: 'mono', fontWeight: 700, fontStyle: 'italic', textDecoration: 'underline',
      textAlign: 'end', textVerticalAlign: 'bottom', lineHeight: 3, letterSpacing: 0.1, textPadding: 4,
      opacity: 0.5, shadow: true,
    } }));
    expect(style).toMatchObject({
      fill: '#ff0000', stroke: 'transparent', strokeWidth: 24, cornerRadius: 0, fontSize: 96,
      fontFamily: 'mono', fontWeight: 700, fontStyle: 'italic', textDecoration: 'underline',
      textAlign: 'end', textVerticalAlign: 'bottom', lineHeight: 2, letterSpacing: 0.1, textPadding: 4,
      opacity: 0.5, shadow: true,
    });
  });

  it('ignores malformed values', () => {
    const style = resolveNodeStyle(node({ appearance: { fill: 'red', fontFamily: 'wingdings', fontWeight: 'x' } }));
    expect(style.fill).toBe('#ffffff');
    expect(style.fontFamily).toBe('sans');
    expect(style.fontWeight).toBe(600);
  });

  it('reads legacy text-node content keys', () => {
    const style = resolveNodeStyle(node({ kind: 'text', content: {
      label: 'T', fontSize: 'large', fontFamily: 'inter', fontWeight: '700', fontStyle: 'italic',
      customColor: '#123456', backgroundColor: '#fefefe',
    } }));
    expect(style).toMatchObject({
      fill: '#fefefe', stroke: 'transparent', strokeWidth: 0, fontSize: 18, fontFamily: 'sans',
      fontWeight: 700, fontStyle: 'italic', textColor: '#123456', textPadding: 8,
    });
  });

  it('text node defaults: no fill, no stroke, 16px medium', () => {
    const style = resolveNodeStyle(node({ kind: 'text', content: { label: 'T' } }));
    expect(style).toMatchObject({ fill: 'transparent', strokeWidth: 0, fontSize: 16, fontWeight: 500 });
  });

  it('builds a CSS font shorthand scaled by zoom', () => {
    const style = resolveNodeStyle(node({ appearance: { fontSize: 20, fontFamily: 'serif', fontStyle: 'italic' } }));
    expect(nodeStyleFont(style, 2)).toBe('italic 600 40px/1.2 Georgia, "Iowan Old Style", "Times New Roman", serif');
  });
});
