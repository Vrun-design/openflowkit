import { describe, expect, it } from 'vitest';
import {
    buildCurvedPath,
    coerceEdgeCurve,
    curveFromLegacyVariant,
    isOrthogonalStepCurve,
    isSmoothCurve,
} from './edgeCurve';
import { readPathEndTangent, readPathStartTangent } from './curvePathMarkerTangents';

describe('edgeCurve', () => {
    it('classifies smooth and orthogonal curves correctly', () => {
        expect(isSmoothCurve('basis')).toBe(true);
        expect(isSmoothCurve('catmullRom')).toBe(true);
        expect(isSmoothCurve('linear')).toBe(false);
        expect(isSmoothCurve('step')).toBe(false);
        expect(isOrthogonalStepCurve('step')).toBe(true);
        expect(isOrthogonalStepCurve('smoothstep')).toBe(true);
        expect(isOrthogonalStepCurve('basis')).toBe(false);
    });

    it('builds a path that begins with a move-to', () => {
        const path = buildCurvedPath(
            [
                { x: 0, y: 0 },
                { x: 50, y: 25 },
                { x: 100, y: 0 },
            ],
            'basis'
        );
        expect(path).not.toBeNull();
        expect(path!.startsWith('M')).toBe(true);
    });

    it('returns null for fewer than two distinct points', () => {
        expect(buildCurvedPath([{ x: 5, y: 5 }], 'basis')).toBeNull();
        expect(buildCurvedPath([{ x: 5, y: 5 }, { x: 5, y: 5 }], 'basis')).toBeNull();
    });

    it('returns null for smoothstep (handled elsewhere)', () => {
        expect(buildCurvedPath([{ x: 0, y: 0 }, { x: 10, y: 10 }], 'smoothstep')).toBeNull();
    });

    it('coerces unknown curve strings to fallback', () => {
        expect(coerceEdgeCurve('nope')).toBe('basis');
        expect(coerceEdgeCurve('linear')).toBe('linear');
        expect(coerceEdgeCurve(undefined, 'step')).toBe('step');
    });

    it('maps legacy variants to curves', () => {
        expect(curveFromLegacyVariant('bezier')).toBe('basis');
        expect(curveFromLegacyVariant('smoothstep')).toBe('smoothstep');
        expect(curveFromLegacyVariant('step')).toBe('step');
        expect(curveFromLegacyVariant('straight')).toBe('linear');
    });

    it('leaves every curve with a readable tangent for orient="auto" markers', () => {
        const points = [
            { x: 0, y: 0 },
            { x: 40, y: 60 },
            { x: 120, y: 200 },
            { x: 200, y: 220 },
        ];
        const curves = [
            'basis', 'linear', 'step', 'stepBefore', 'stepAfter',
            'monotoneX', 'monotoneY', 'natural', 'cardinal', 'catmullRom',
            'bumpX', 'bumpY',
        ] as const;

        for (const curve of curves) {
            const path = buildCurvedPath(points, curve);
            expect(path, curve).not.toBeNull();

            const end = readPathEndTangent(path!);
            expect(end, curve).not.toBeNull();
            expect(Math.hypot(end!.x, end!.y), `${curve} end tangent`).toBeGreaterThan(0);

            const start = readPathStartTangent(path!);
            expect(start, curve).not.toBeNull();
            expect(Math.hypot(start!.x, start!.y), `${curve} start tangent`).toBeGreaterThan(0);
        }
    });

    it('keeps the exact source and target endpoints for smooth curves', () => {
        const path = buildCurvedPath(
            [
                { x: 12, y: 34 },
                { x: 90, y: 10 },
                { x: 178, y: 96 },
            ],
            'basis'
        );
        expect(path!.startsWith('M12,34')).toBe(true);
        expect(path!.endsWith('178,96')).toBe(true);
    });

    it('produces a linear path that traces every waypoint exactly', () => {
        const path = buildCurvedPath(
            [
                { x: 0, y: 0 },
                { x: 100, y: 0 },
                { x: 100, y: 100 },
            ],
            'linear'
        );
        // L100,0L100,100 — straight lines should preserve corners verbatim
        expect(path).toContain('100,0');
        expect(path).toContain('100,100');
    });
});
