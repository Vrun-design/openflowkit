import type { CSSProperties } from 'react';
import { resolveNodeContentLayout } from '../../domain/node-layout/model';
import type { NodeContentLayoutV1 } from '../../domain/node-layout/types';

export interface ReactFlowNodeContentLayout {
  readonly layout: NodeContentLayoutV1;
  readonly containerStyle: CSSProperties;
  readonly iconStyle: CSSProperties;
  readonly textStyle: CSSProperties;
}

function flexAlignment(value: NodeContentLayoutV1['horizontal']): CSSProperties['alignItems'] {
  if (value === 'start') return 'flex-start';
  if (value === 'end') return 'flex-end';
  return 'center';
}

export function projectNodeContentLayoutToReactFlow(
  content: { readonly contentLayout?: unknown },
  enabled: boolean
): ReactFlowNodeContentLayout {
  const layout = resolveNodeContentLayout(content, enabled);
  const isHorizontal = layout.iconPlacement === 'left' || layout.iconPlacement === 'right';
  const isFree = layout.iconPlacement === 'free';
  const mainAlignment = flexAlignment(isHorizontal ? layout.horizontal : layout.vertical);
  const crossAlignment = flexAlignment(isHorizontal ? layout.vertical : layout.horizontal);
  const direction =
    layout.iconPlacement === 'right'
      ? 'row-reverse'
      : layout.iconPlacement === 'left'
        ? 'row'
        : layout.iconPlacement === 'bottom'
          ? 'column-reverse'
          : 'column';
  return {
    layout,
    containerStyle: {
      padding: `${layout.padding.top}px ${layout.padding.right}px ${layout.padding.bottom}px ${layout.padding.left}px`,
      gap: `${layout.gap}px`,
      flexDirection: direction,
      justifyContent: mainAlignment,
      alignItems: crossAlignment,
    },
    iconStyle: isFree
      ? {
          position: 'absolute',
          left: `${layout.freeIconPosition.x * 100}%`,
          top: `${layout.freeIconPosition.y * 100}%`,
          transform: `translate(-50%, -50%) scale(${layout.iconScale})`,
          transformOrigin: 'center',
        }
      : { transform: `scale(${layout.iconScale})`, transformOrigin: 'center' },
    textStyle: {
      textAlign:
        layout.labelAlignment === 'start'
          ? 'left'
          : layout.labelAlignment === 'end'
            ? 'right'
            : 'center',
    },
  };
}
