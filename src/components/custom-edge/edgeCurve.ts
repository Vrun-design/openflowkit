import {
    curveBasis,
    curveBumpX,
    curveBumpY,
    curveCardinal,
    curveCatmullRom,
    curveLinear,
    curveMonotoneX,
    curveMonotoneY,
    curveNatural,
    curveStep,
    curveStepAfter,
    curveStepBefore,
    line as d3Line,
    type CurveFactory,
} from 'd3-shape';
import { normalizeMarkerTangents } from './curvePathMarkerTangents';

export type EdgeCurve =
    | 'basis'
    | 'linear'
    | 'step'
    | 'stepBefore'
    | 'stepAfter'
    | 'smoothstep'
    | 'monotoneX'
    | 'monotoneY'
    | 'natural'
    | 'cardinal'
    | 'catmullRom'
    | 'bumpX'
    | 'bumpY';

const CURVE_FACTORIES: Record<Exclude<EdgeCurve, 'smoothstep'>, CurveFactory> = {
    basis: curveBasis,
    linear: curveLinear,
    step: curveStep,
    stepBefore: curveStepBefore,
    stepAfter: curveStepAfter,
    monotoneX: curveMonotoneX,
    monotoneY: curveMonotoneY,
    natural: curveNatural,
    cardinal: curveCardinal,
    catmullRom: curveCatmullRom.alpha(0.5),
    bumpX: curveBumpX,
    bumpY: curveBumpY,
};

export function isSmoothCurve(curve: EdgeCurve): boolean {
    return curve === 'basis'
        || curve === 'monotoneX'
        || curve === 'monotoneY'
        || curve === 'natural'
        || curve === 'cardinal'
        || curve === 'catmullRom'
        || curve === 'bumpX'
        || curve === 'bumpY';
}

export function isOrthogonalStepCurve(curve: EdgeCurve): boolean {
    return curve === 'step' || curve === 'stepBefore' || curve === 'stepAfter' || curve === 'smoothstep';
}

const DEFAULT_LINE_GENERATOR = d3Line<{ x: number; y: number }>()
    .x((p) => p.x)
    .y((p) => p.y);

interface Point {
    x: number;
    y: number;
}

function dedupeConsecutive(points: Point[]): Point[] {
    if (points.length <= 1) return points;
    const out: Point[] = [points[0]];
    for (let i = 1; i < points.length; i += 1) {
        const prev = out[out.length - 1];
        const cur = points[i];
        if (Math.abs(cur.x - prev.x) > 0.5 || Math.abs(cur.y - prev.y) > 0.5) {
            out.push(cur);
        }
    }
    return out;
}

/**
 * Build an SVG path through `points` using the given curve interpolator.
 * For smooth curves we anchor the endpoints by duplicating them so the resulting
 * spline passes through the actual source/target (B-spline / curveBasis otherwise
 * floats the endpoints inward).
 *
 * The result is run through `normalizeMarkerTangents` because that anchoring — and
 * d3's own endpoint handling for cardinal/catmullRom — leaves degenerate commands at
 * both ends, which collapses the tangent `orient="auto"` arrow markers rely on.
 */
export function buildCurvedPath(points: Point[], curve: EdgeCurve): string | null {
    if (curve === 'smoothstep') return null; // handled elsewhere via getSmoothStepPath
    const cleaned = dedupeConsecutive(points);
    if (cleaned.length < 2) return null;

    const factory = CURVE_FACTORIES[curve] ?? curveBasis;
    const anchored = isSmoothCurve(curve)
        ? [cleaned[0], cleaned[0], ...cleaned, cleaned[cleaned.length - 1], cleaned[cleaned.length - 1]]
        : cleaned;

    const generator = DEFAULT_LINE_GENERATOR.curve(factory);
    const path = generator(anchored);
    return path === null ? null : normalizeMarkerTangents(path);
}

const VALID_CURVES = new Set<EdgeCurve>([
    'basis', 'linear', 'step', 'stepBefore', 'stepAfter', 'smoothstep',
    'monotoneX', 'monotoneY', 'natural', 'cardinal', 'catmullRom',
    'bumpX', 'bumpY',
]);

export function coerceEdgeCurve(value: unknown, fallback: EdgeCurve = 'basis'): EdgeCurve {
    if (typeof value !== 'string') return fallback;
    const trimmed = value.trim() as EdgeCurve;
    return VALID_CURVES.has(trimmed) ? trimmed : fallback;
}

/** Map legacy `variant` enum to the new `curve` taxonomy. */
export function curveFromLegacyVariant(variant: 'bezier' | 'smoothstep' | 'step' | 'straight'): EdgeCurve {
    switch (variant) {
        case 'bezier': return 'basis';
        case 'smoothstep': return 'smoothstep';
        case 'step': return 'step';
        case 'straight': return 'linear';
    }
}
