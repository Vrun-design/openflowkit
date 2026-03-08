import type { CSSProperties } from 'react';

export function getHandlePointerEvents(visualQualityV2Enabled: boolean, selected: boolean): 'none' | 'all' {
  return 'all';
}

export function getV2HandleVisibilityClass(
  selected: boolean,
  options: { includeConnectingState?: boolean; includeScale?: boolean } = {}
): string {
  const includeConnectingState = options.includeConnectingState ?? true;
  const includeScale = options.includeScale ?? true;

  // Keep anchors visible but secondary to resize controls while selected.
  const selectedVisibility = includeScale ? 'opacity-65 scale-100' : 'opacity-65';
  const connectingClass = includeConnectingState ? ' [.is-connecting_&]:opacity-100' : '';
  const hitAreaClass = selected ? '' : ' flow-handle-hitarea';
  return `${selected ? selectedVisibility : 'opacity-30'} group-hover:opacity-100${connectingClass}${hitAreaClass}`.trim();
}

export function getConnectorHandleStyle(
  position: 'top' | 'right' | 'bottom' | 'left',
  _selected: boolean,
  pointerEvents: 'none' | 'all',
  extra?: CSSProperties
): CSSProperties {
  const baseByPosition: Record<'top' | 'right' | 'bottom' | 'left', CSSProperties> = {
    top: {
      left: '50%',
      top: 0,
      transform: 'translate(-50%, -50%)',
    },
    right: {
      top: '50%',
      left: '100%',
      transform: 'translate(-50%, -50%)',
    },
    bottom: {
      left: '50%',
      top: '100%',
      transform: 'translate(-50%, -50%)',
    },
    left: {
      top: '50%',
      left: 0,
      transform: 'translate(-50%, -50%)',
    },
  };

  return {
    ...baseByPosition[position],
    ...(extra ?? {}),
    backgroundColor: 'var(--brand-primary)',
    zIndex: 100,
    pointerEvents,
  };
}
