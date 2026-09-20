import { describe, expect, it } from 'vitest';
import { getDashPatternPeriod } from './dashPattern';

describe('getDashPatternPeriod', () => {
    it('sums an even-length pattern', () => {
        expect(getDashPatternPeriod('8 8')).toBe(16);
        expect(getDashPatternPeriod('8 4')).toBe(12);
        expect(getDashPatternPeriod('2 4')).toBe(6);
        expect(getDashPatternPeriod('8 4 2 4')).toBe(18);
    });

    it('doubles an odd-length pattern, as SVG repeats the list to make it even', () => {
        expect(getDashPatternPeriod('6')).toBe(12);
        expect(getDashPatternPeriod('8 4 2')).toBe(28);
    });

    it('accepts a bare number as a one-entry list', () => {
        expect(getDashPatternPeriod(6)).toBe(12);
    });

    it('accepts comma separators, extra whitespace and px units', () => {
        expect(getDashPatternPeriod('8, 4')).toBe(12);
        expect(getDashPatternPeriod('  8   4  ')).toBe(12);
        expect(getDashPatternPeriod('8px 4px')).toBe(12);
    });

    it('supports fractional values', () => {
        expect(getDashPatternPeriod('1.5 2.5')).toBe(4);
    });

    it('returns null when there is no resolvable dash pattern', () => {
        expect(getDashPatternPeriod(undefined)).toBeNull();
        expect(getDashPatternPeriod('')).toBeNull();
        expect(getDashPatternPeriod('   ')).toBeNull();
        expect(getDashPatternPeriod('none')).toBeNull();
        expect(getDashPatternPeriod('0 0')).toBeNull();
        expect(getDashPatternPeriod(0)).toBeNull();
    });

    it('returns null for units it cannot resolve without the path length', () => {
        expect(getDashPatternPeriod('10%')).toBeNull();
        expect(getDashPatternPeriod('8 10%')).toBeNull();
        expect(getDashPatternPeriod('2em')).toBeNull();
    });

    it('returns null for invalid patterns rather than guessing', () => {
        expect(getDashPatternPeriod('8 -4')).toBeNull();
        expect(getDashPatternPeriod('8 abc')).toBeNull();
        expect(getDashPatternPeriod('NaN')).toBeNull();
    });

    it('rejects numbers CSS itself rejects, so a dropped declaration cannot get a period', () => {
        // `8.` is not a valid CSS number, so the browser drops the whole declaration and
        // paints something else. Publishing a period for it would reintroduce the snap.
        expect(getDashPatternPeriod('8.')).toBeNull();
        expect(getDashPatternPeriod('8. 4')).toBeNull();
    });
});
