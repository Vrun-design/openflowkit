import type { CSSProperties } from 'react';
import type { EdgeAnimationConfig } from '@/lib/types';
import { getDashPatternPeriod } from './dashPattern';

/**
 * Distance the `flow-edge-dash` keyframes travel per cycle. Must equal the dash
 * pattern's period or the loop snaps back by the remainder every cycle, so it is
 * published per edge instead of being baked into the keyframes.
 */
export const DASH_PERIOD_CSS_VAR = '--flow-edge-dash-period';

interface ResolveAnimatedEdgePresentationParams {
  animatedExportEnabled: boolean;
  selected: boolean;
  hovered: boolean;
  edgeAnimated: boolean;
  animationConfig?: EdgeAnimationConfig;
  baseStyle: CSSProperties;
}

export interface AnimatedEdgePresentation {
  shouldRenderOverlay: boolean;
  overlayStyle: CSSProperties;
}

export function resolveAnimatedEdgePresentation({
  animatedExportEnabled,
  selected,
  hovered,
  edgeAnimated,
  animationConfig,
  baseStyle,
}: ResolveAnimatedEdgePresentationParams): AnimatedEdgePresentation {
  const strokeDasharray = animationConfig?.dashArray
    ?? (typeof baseStyle.strokeDasharray === 'string' && baseStyle.strokeDasharray.length > 0
      ? baseStyle.strokeDasharray
      : '8 8');
  const dashPeriod = getDashPatternPeriod(strokeDasharray);

  const overlayStyle: CSSProperties = {
    stroke: baseStyle.stroke,
    strokeWidth: Math.max(Number(baseStyle.strokeWidth ?? 2), 2),
    strokeDasharray,
    // Unresolvable patterns leave the var unset so the keyframes fall back.
    ...(dashPeriod === null ? {} : { [DASH_PERIOD_CSS_VAR]: dashPeriod }),
  } as CSSProperties;

  if (!animatedExportEnabled) {
    return {
      shouldRenderOverlay: selected || hovered,
      overlayStyle,
    };
  }

  const shouldRenderOverlay = edgeAnimated
    && animationConfig?.enabled === true
    && animationConfig.state === 'active';

  return {
    shouldRenderOverlay,
    overlayStyle: {
      ...overlayStyle,
      animationDuration: `${animationConfig?.durationMs ?? 600}ms`,
    },
  };
}
