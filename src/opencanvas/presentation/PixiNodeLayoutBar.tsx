import React from 'react';
import type {
  ContentAlignment,
  IconPlacement,
  NodeContentLayoutV1,
} from '../domain/node-layout/types';

interface PixiNodeLayoutBarProps {
  readonly nodeId: string;
  readonly layout: NodeContentLayoutV1;
  readonly onChange: (layout: NodeContentLayoutV1, label: string) => void;
}

const ALIGNMENTS: readonly ContentAlignment[] = ['start', 'center', 'end'];
const PLACEMENTS: readonly IconPlacement[] = ['top', 'right', 'bottom', 'left', 'free'];

function boundedIconScale(value: string): number {
  return Math.min(4, Math.max(0.1, Number(value)));
}

export function PixiNodeLayoutBar(props: PixiNodeLayoutBarProps): React.JSX.Element {
  function changeAlignment(horizontal: ContentAlignment, vertical: ContentAlignment): void {
    props.onChange({ ...props.layout, horizontal, vertical }, 'Align node content');
  }

  function changeUniformPadding(value: string): void {
    const padding = Number(value);
    props.onChange(
      {
        ...props.layout,
        padding: { top: padding, right: padding, bottom: padding, left: padding },
      },
      'Set content padding'
    );
  }

  function changePadding(side: keyof NodeContentLayoutV1['padding'], value: string): void {
    props.onChange({
      ...props.layout,
      padding: { ...props.layout.padding, [side]: Number(value) },
    }, `Set ${side} content padding`);
  }

  function changeFreePosition(axis: 'x' | 'y', value: string): void {
    props.onChange(
      {
        ...props.layout,
        freeIconPosition: { ...props.layout.freeIconPosition, [axis]: Number(value) },
      },
      'Move node icon'
    );
  }

  return (
    <div
      className="pixi-spike__node-layout-bar"
      aria-label={`Content layout for ${props.nodeId}`}
      onPointerDown={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
    >
      <span>Content</span>
      <div className="pixi-spike__alignment-grid" aria-label="Content alignment">
        {ALIGNMENTS.flatMap((vertical) =>
          ALIGNMENTS.map((horizontal) => (
            <button
              key={`${horizontal}-${vertical}`}
              type="button"
              aria-label={`Align ${vertical} ${horizontal}`}
              aria-pressed={
                props.layout.horizontal === horizontal && props.layout.vertical === vertical
              }
              onClick={() => changeAlignment(horizontal, vertical)}
            >
              <span aria-hidden="true" />
            </button>
          ))
        )}
      </div>
      <div className="pixi-spike__placement-group" aria-label="Icon placement">
        {PLACEMENTS.map((placement) => (
          <button
            key={placement}
            type="button"
            aria-pressed={props.layout.iconPlacement === placement}
            onClick={() =>
              props.onChange({ ...props.layout, iconPlacement: placement }, 'Place node icon')
            }
          >
            {placement}
          </button>
        ))}
      </div>
      <label>
        Gap
        <input
          type="number"
          min="0"
          max="32"
          step="1"
          value={props.layout.gap}
          onChange={(event) =>
            props.onChange({ ...props.layout, gap: Number(event.target.value) }, 'Set content gap')
          }
        />
      </label>
      {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
        <label key={side}>
          {side} inset
          <input
            aria-label={`${side} content padding`}
            type="number" min="0" max="256" step="1"
            value={props.layout.padding[side]}
            onChange={(event) => changePadding(side, event.target.value)}
          />
        </label>
      ))}
      <label>
        Inset
        <input
          aria-label="Content padding"
          type="number"
          min="0"
          max="48"
          step="1"
          value={props.layout.padding.top}
          onChange={(event) => changeUniformPadding(event.target.value)}
        />
      </label>
      <label>
        Scale
        <input
          aria-label="Icon scale"
          type="number"
          min="0.5"
          max="2"
          step="0.1"
          value={props.layout.iconScale}
          onChange={(event) =>
            props.onChange(
              { ...props.layout, iconScale: boundedIconScale(event.target.value) },
              'Scale node icon'
            )
          }
        />
      </label>
      {props.layout.iconPlacement === 'free' ? (
        <>
          <label>
            X
            <input
              aria-label="Free icon horizontal position"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={props.layout.freeIconPosition.x}
              onChange={(event) => changeFreePosition('x', event.target.value)}
            />
          </label>
          <label>
            Y
            <input
              aria-label="Free icon vertical position"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={props.layout.freeIconPosition.y}
              onChange={(event) => changeFreePosition('y', event.target.value)}
            />
          </label>
        </>
      ) : null}
    </div>
  );
}
