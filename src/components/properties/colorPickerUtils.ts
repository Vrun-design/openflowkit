export const DEFAULT_CUSTOM_COLOR = '#4f46e5';

export function normalizeHex(value: string): string | null {
    const normalized = value.trim().replace('#', '');
    if (/^[\da-fA-F]{3}$/.test(normalized)) {
        return `#${normalized.split('').map((char) => char + char).join('')}`.toLowerCase();
    }
    if (/^[\da-fA-F]{6}$/.test(normalized)) {
        return `#${normalized}`.toLowerCase();
    }
    return null;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const normalized = normalizeHex(hex);
    if (!normalized) {
        return null;
    }

    const value = normalized.slice(1);
    return {
        r: Number.parseInt(value.slice(0, 2), 16),
        g: Number.parseInt(value.slice(2, 4), 16),
        b: Number.parseInt(value.slice(4, 6), 16),
    };
}

export function rgbToHex(r: number, g: number, b: number): string {
    return `#${[r, g, b].map((channel) => Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, '0')).join('')}`;
}

export function hexToHsl(hex: string): { h: number; s: number; l: number } {
    const rgb = hexToRgb(hex) || { r: 79, g: 70, b: 229 };
    const r = rgb.r / 255;
    const g = rgb.g / 255;
    const b = rgb.b / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    let h = 0;
    const l = (max + min) / 2;
    const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

    if (delta !== 0) {
        switch (max) {
            case r:
                h = 60 * (((g - b) / delta) % 6);
                break;
            case g:
                h = 60 * ((b - r) / delta + 2);
                break;
            default:
                h = 60 * ((r - g) / delta + 4);
                break;
        }
    }

    return {
        h: Math.round(h < 0 ? h + 360 : h),
        s: Math.round(s * 100),
        l: Math.round(l * 100),
    };
}

export function hslToHex(h: number, s: number, l: number): string {
    const saturation = s / 100;
    const lightness = l / 100;
    const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
    const segment = h / 60;
    const x = chroma * (1 - Math.abs((segment % 2) - 1));
    const m = lightness - chroma / 2;
    let r = 0;
    let g = 0;
    let b = 0;

    if (segment >= 0 && segment < 1) {
        r = chroma;
        g = x;
    } else if (segment < 2) {
        r = x;
        g = chroma;
    } else if (segment < 3) {
        g = chroma;
        b = x;
    } else if (segment < 4) {
        g = x;
        b = chroma;
    } else if (segment < 5) {
        r = x;
        b = chroma;
    } else {
        r = chroma;
        b = x;
    }

    return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}
