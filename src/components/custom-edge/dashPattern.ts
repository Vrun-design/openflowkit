/**
 * A `stroke-dashoffset` animation only loops seamlessly when the distance it travels
 * per cycle equals the dash pattern's period. Travel a different distance and every
 * cycle boundary snaps the pattern back by the remainder — obvious on an irregular
 * pattern such as dash-dot, where the eye tracks individual dots.
 */

// CSS requires a digit after the decimal point, so `8.` is an invalid declaration the
// browser drops. Accepting it here would publish a period for a pattern that never
// paints — the exact silent mismatch this module exists to prevent.
const NUMBER_WITH_OPTIONAL_PX = /^(-?(?:\d+(?:\.\d+)?|\.\d+))(?:px)?$/;

/**
 * Distance a `stroke-dashoffset` animation must travel for one seamless loop of
 * `dashArray`, or `null` when that cannot be determined — no pattern, a zero-length
 * pattern, or units that need the path length (`%`) or a font context (`em`).
 *
 * Per SVG, a list with an odd number of entries is repeated to yield an even count,
 * so its period is twice the sum.
 */
export function getDashPatternPeriod(dashArray: string | number | undefined | null): number | null {
    if (dashArray === undefined || dashArray === null) return null;

    const entries = String(dashArray)
        .trim()
        .split(/[\s,]+/)
        .filter((entry) => entry.length > 0);
    if (entries.length === 0) return null;

    let sum = 0;
    for (const entry of entries) {
        const match = NUMBER_WITH_OPTIONAL_PX.exec(entry);
        if (!match) return null;

        const value = Number(match[1]);
        if (!Number.isFinite(value) || value < 0) return null;
        sum += value;
    }

    if (sum <= 0) return null;
    return entries.length % 2 === 0 ? sum : sum * 2;
}
