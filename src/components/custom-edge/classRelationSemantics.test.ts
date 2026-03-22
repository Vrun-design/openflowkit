import { describe, expect, it } from 'vitest';
import {
  CLASS_MARKER_ARROW_FILLED,
  CLASS_MARKER_ARROW_OPEN,
  CLASS_MARKER_DIAMOND_FILLED,
  CLASS_MARKER_DIAMOND_OPEN,
  CLASS_MARKER_TRIANGLE_OPEN,
  ER_MARKER_BAR,
  ER_MARKER_CROW,
  resolveClassRelationVisualSpec,
  resolveRelationVisualSpec,
  toMarkerUrl,
} from './classRelationSemantics';

describe('resolveClassRelationVisualSpec', () => {
  it('returns null when rollout is disabled', () => {
    expect(resolveClassRelationVisualSpec(false, { classRelation: '--|>' }, undefined)).toBeNull();
  });

  it('maps generalization and aggregation/composition markers', () => {
    expect(resolveClassRelationVisualSpec(true, { classRelation: '--|>' }, undefined)).toEqual({
      markerEndId: CLASS_MARKER_TRIANGLE_OPEN,
      dashed: false,
    });

    expect(resolveClassRelationVisualSpec(true, { classRelation: '<|--' }, undefined)).toEqual({
      markerStartId: CLASS_MARKER_TRIANGLE_OPEN,
      dashed: false,
    });

    expect(resolveClassRelationVisualSpec(true, { classRelation: '*--' }, undefined)).toEqual({
      markerStartId: CLASS_MARKER_DIAMOND_FILLED,
      dashed: false,
    });

    expect(resolveClassRelationVisualSpec(true, { classRelation: '--o' }, undefined)).toEqual({
      markerEndId: CLASS_MARKER_DIAMOND_OPEN,
      dashed: false,
    });
  });

  it('maps dependency and association styles', () => {
    expect(resolveClassRelationVisualSpec(true, { classRelation: '..>' }, undefined)).toEqual({
      markerEndId: CLASS_MARKER_ARROW_OPEN,
      dashed: true,
    });

    expect(resolveClassRelationVisualSpec(true, { classRelation: '..' }, undefined)).toEqual({
      dashed: true,
    });

    expect(resolveClassRelationVisualSpec(true, { classRelation: '<-->' }, undefined)).toEqual({
      markerStartId: CLASS_MARKER_ARROW_FILLED,
      markerEndId: CLASS_MARKER_ARROW_FILLED,
      dashed: false,
    });
  });

  it('falls back to relation token from label when edge data is absent', () => {
    expect(resolveClassRelationVisualSpec(true, undefined, '<--')).toEqual({
      markerStartId: CLASS_MARKER_ARROW_FILLED,
      dashed: false,
    });

    expect(resolveClassRelationVisualSpec(true, undefined, 'owns')).toBeNull();
  });
});

describe('toMarkerUrl', () => {
  it('converts marker ids to url() form', () => {
    expect(toMarkerUrl('marker-id')).toBe('url(#marker-id)');
    expect(toMarkerUrl(undefined)).toBeUndefined();
  });
});

describe('resolveRelationVisualSpec (ER)', () => {
  it('maps ER cardinality markers and dotted connectors', () => {
    expect(resolveRelationVisualSpec(true, { erRelation: '||--o{' }, undefined)).toEqual({
      markerStartId: ER_MARKER_BAR,
      markerEndId: ER_MARKER_CROW,
      dashed: false,
    });

    expect(resolveRelationVisualSpec(true, { erRelation: '}o..||' }, undefined)).toEqual({
      markerStartId: ER_MARKER_CROW,
      markerEndId: ER_MARKER_BAR,
      dashed: true,
    });
  });

  it('returns null for malformed ER relation tokens', () => {
    const malformedErRelation = '||--x{' as unknown as '||--o{';
    expect(resolveRelationVisualSpec(true, { erRelation: malformedErRelation }, undefined)).toBeNull();
  });
});
