import type { CSSProperties } from 'react';
import type { EdgeAnimationConfig } from '@/lib/types';
import { getDashPatternPeriod } from './dashPattern';

/**
 * Distance the `flow-edge-dash` keyframes travel per cycle. Must equal the dash
 * pattern's period or the loop snaps back by the remainder every cycle, so it is
 * published per edge instead of being baked into the keyframes.
 */
export const DASH_PERIOD_CSS_VAR = '--flow-edge-dash-period';

/**
 * Publish the dash period of `style`'s own pattern so the loop travels exactly that far
 * per cycle. Left unset when the pattern has no resolvable period, so the CSS default
 * for the element applies — never set to 0, which would satisfy `var()`'s fallback and
 * freeze the animation.
 */
export function withDashPeriodVar(style: CSSProperties): CSSProperties {
  const period = getDashPatternPeriod(style.strokeDasharray);
  return period === null ? style : ({ ...style, [DASH_PERIOD_CSS_VAR]: period } as CSSProperties);
}

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
  const overlayStyle: CSSProperties = withDashPeriodVar({
    stroke: baseStyle.stroke,
    strokeWidth: Math.max(Number(baseStyle.strokeWidth ?? 2), 2),
    strokeDasharray,
  });

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
