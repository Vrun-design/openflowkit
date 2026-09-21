import { describe, expect, it } from 'vitest';
import {
  canonicalColorWord, canonicalShapeWord, dslShapeWord, sortAttributes, attributeSlot,
} from './vocabulary';

describe('vocabulary', () => {
  it('folds shape aliases onto canonical renderable shapes', () => {
    expect(canonicalShapeWord('box')).toBe('rect');
    expect(canonicalShapeWord('database')).toBe('cylinder');
    expect(canonicalShapeWord('actor')).toBe('person');
    expect(canonicalShapeWord('oval')).toBe('ellipse');
    expect(canonicalShapeWord('subroutine')).toBe('component');
    expect(canonicalShapeWord('octahedron')).toBeUndefined();
  });

  it('maps the grammar palette onto theme keys', () => {
    expect(canonicalColorWord('green')).toBe('green');
    expect(canonicalColorWord('purple')).toBe('violet');
    expect(canonicalColorWord('grey')).toBe('gray');
    expect(canonicalColorWord('chartreuse')).toBeUndefined();
  });

  it('reverses a scene presentation to the DSL word (canvas edits win)', () => {
    expect(dslShapeWord('process', 'diamond')).toBe('diamond');
    expect(dslShapeWord('process', undefined)).toBe('rounded');
    expect(dslShapeWord('process', 'rounded', 'component')).toBe('component');
    expect(dslShapeWord('process', 'rectangle', 'component')).toBe('rect');
    expect(dslShapeWord('architecture', undefined)).toBeUndefined();
  });

  it('orders attributes canonically and slottedly', () => {
    expect(attributeSlot({ value: 'aws/lambda' })).toBe('icon');
    expect(attributeSlot({ value: 'blue' })).toBe('color');
    expect(sortAttributes([
      { key: 'tech', value: 'Go' }, { value: 'shadow' }, { value: 'cylinder' },
      { value: 'blue' }, { key: 'label', value: 'DB' }, { value: 'aws/lambda' },
    ])).toEqual([
      { value: 'cylinder' }, { value: 'blue' }, { value: 'shadow' }, { value: 'aws/lambda' },
      { key: 'label', value: 'DB' }, { key: 'tech', value: 'Go' },
    ]);
  });
});
