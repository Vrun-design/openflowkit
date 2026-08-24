import { describe, expect, it } from 'vitest';
import {
    normalizeMarkerTangents,
    readPathEndTangent,
    readPathStartTangent,
} from './curvePathMarkerTangents';

describe('curvePathMarkerTangents', () => {
    // Real d3 `curveBasis` output for the repo's duplicated-endpoint anchoring.
    const ANCHORED_BASIS_PATH =
        'M0,0L0,0C0,0,0,0,0,0C0,0,0,0,6.667,10C13.333,20,26.667,40,46.667,73.333'
        + 'C66.667,106.667,93.333,153.333,120,180C146.667,206.667,173.333,213.333,186.667,216.667'
        + 'C200,220,200,220,200,220C200,220,200,220,200,220L200,220';

    it('reports a zero end tangent for the anchored path (the marker bug)', () => {
        expect(readPathEndTangent(ANCHORED_BASIS_PATH)).toEqual({ x: 0, y: 0 });
    });

    it('gives the anchored path a non-zero end tangent along the incoming chord', () => {
        const tangent = readPathEndTangent(normalizeMarkerTangents(ANCHORED_BASIS_PATH));
        expect(tangent).not.toBeNull();
        expect(Math.hypot(tangent!.x, tangent!.y)).toBeGreaterThan(0);
        // Incoming chord 186.667,216.667 -> 200,220 points down-right at ~14deg.
        const angle = (Math.atan2(tangent!.y, tangent!.x) * 180) / Math.PI;
        expect(angle).toBeGreaterThan(5);
        expect(angle).toBeLessThan(25);
    });

    it('gives the anchored path a non-zero start tangent', () => {
        const tangent = readPathStartTangent(normalizeMarkerTangents(ANCHORED_BASIS_PATH));
        expect(tangent).not.toBeNull();
        expect(Math.hypot(tangent!.x, tangent!.y)).toBeGreaterThan(0);
        // Outgoing chord 0,0 -> 6.667,10 points down-right at ~56deg.
        const angle = (Math.atan2(tangent!.y, tangent!.x) * 180) / Math.PI;
        expect(angle).toBeGreaterThan(45);
        expect(angle).toBeLessThan(70);
    });

    it('keeps the first and last point exactly where they were', () => {
        const normalized = normalizeMarkerTangents(ANCHORED_BASIS_PATH);
        expect(normalized.startsWith('M0,0')).toBe(true);
        expect(normalized.endsWith('200,220')).toBe(true);
    });

    it('drops the zero-length head and tail commands', () => {
        const normalized = normalizeMarkerTangents(ANCHORED_BASIS_PATH);
        expect(normalized).not.toContain('C0,0,0,0,0,0');
        expect(normalized).not.toContain('C200,220,200,220,200,220');
    });

    it('repairs a cubic whose second control point sits on the endpoint', () => {
        // Real d3 `curveCatmullRom` tail: c2 === endpoint, so the tangent collapses.
        const path = 'M0,0C0,0,24.863,35.508,40,60C143.499,217.802,200,220,200,220';
        expect(readPathEndTangent(path)).toEqual({ x: 0, y: 0 });

        const tangent = readPathEndTangent(normalizeMarkerTangents(path));
        expect(Math.hypot(tangent!.x, tangent!.y)).toBeGreaterThan(0);
        // Limiting tangent follows c1 -> endpoint: 143.499,217.802 -> 200,220.
        const angle = (Math.atan2(tangent!.y, tangent!.x) * 180) / Math.PI;
        expect(angle).toBeCloseTo(2.226, 1);
    });

    it('leaves an already well-formed path untouched', () => {
        const path = 'M0,0C13.333,19.444,26.667,38.889,40,60C66.667,102.222,93.333,186.667,120,200';
        expect(normalizeMarkerTangents(path)).toBe(path);
    });

    it('returns the input unchanged when it is not a simple M/L/C path', () => {
        expect(normalizeMarkerTangents('M0,0A10,10 0 0 1 20,20')).toBe('M0,0A10,10 0 0 1 20,20');
        expect(normalizeMarkerTangents('')).toBe('');
        expect(normalizeMarkerTangents('M0,0')).toBe('M0,0');
    });
});
