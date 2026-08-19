import { describe, expect, it } from 'vitest';
import { projectNodeContentLayoutToReactFlow } from './nodeContentLayout';

describe('React Flow node content layout projection', () => {
  it('ignores optional layout while rollout is disabled', () => {
    const result = projectNodeContentLayoutToReactFlow(
      { contentLayout: { iconPlacement: 'right' } },
      false
    );
    expect(result.layout.iconPlacement).toBe('top');
    expect(result.containerStyle.flexDirection).toBe('column');
  });

  it('projects right placement and label alignment without renderer business rules', () => {
    const result = projectNodeContentLayoutToReactFlow(
      {
        contentLayout: {
          version: 1,
          horizontal: 'end',
          vertical: 'center',
          iconPlacement: 'right',
          labelAlignment: 'start',
          padding: { top: 8, right: 12, bottom: 8, left: 12 },
          gap: 6,
          iconScale: 1.25,
          freeIconPosition: { x: 0.5, y: 0.5 },
        },
      },
      true
    );
    expect(result.containerStyle.flexDirection).toBe('row-reverse');
    expect(result.containerStyle.padding).toBe('8px 12px 8px 12px');
    expect(result.textStyle.textAlign).toBe('left');
  });
});
