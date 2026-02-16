import tinycolor from 'tinycolor2';
import { BrandConfig } from '@/store';

export const applyBrandTheme = (config: BrandConfig) => {
    const root = document.documentElement;

    // 1. Colors - Primary Palette Generation
    const primary = tinycolor(config.colors.primary);

    // Generate a full palette (50-900)
    const palette = {
        50: primary.clone().lighten(52).toHexString(),
        100: primary.clone().lighten(37).toHexString(),
        200: primary.clone().lighten(26).toHexString(),
        300: primary.clone().lighten(12).toHexString(),
        400: primary.clone().lighten(6).toHexString(),
        500: primary.toHexString(), // Base
        600: primary.clone().darken(6).toHexString(),
        700: primary.clone().darken(12).toHexString(),
        800: primary.clone().darken(18).toHexString(),
        900: primary.clone().darken(24).toHexString(),
    };

    // Set CSS Variables for Colors
    root.style.setProperty('--brand-primary', config.colors.primary);
    root.style.setProperty('--brand-secondary', config.colors.secondary);
    root.style.setProperty('--brand-surface', config.colors.surface);
    root.style.setProperty('--brand-background', config.colors.background);
    root.style.setProperty('--brand-text', config.colors.text);

    // Set Palette Variables
    Object.entries(palette).forEach(([key, value]) => {
        root.style.setProperty(`--brand-primary-${key}`, value);
    });

    // 2. Shape
    root.style.setProperty('--brand-radius', `${config.shape.radius}px`);
    root.style.setProperty('--brand-border-width', `${config.shape.borderWidth}px`);

    // 3. Fonts
    loadGoogleFont(config.typography.fontFamily);
    root.style.setProperty('--brand-font-family', `"${config.typography.fontFamily}", sans-serif`);

    // 4. UI Effects
    if (config.ui.glassmorphism) {
        root.style.setProperty('--brand-glass-blur', '12px');
        root.style.setProperty('--brand-glass-opacity', '0.7');
        root.style.setProperty('--brand-glass-bg', 'rgba(255, 255, 255, 0.7)');
    } else {
        root.style.setProperty('--brand-glass-blur', '0px');
        root.style.setProperty('--brand-glass-opacity', '1');
        root.style.setProperty('--brand-glass-bg', 'rgba(255, 255, 255, 1)');
    }

    // Update Meta Title
    document.title = config.appName || 'FlowMind';
};

const loadGoogleFont = (fontFamily: string) => {
    if (!fontFamily) return;

    const linkId = 'brand-font-link';
    let link = document.getElementById(linkId) as HTMLLinkElement;

    if (!link) {
        link = document.createElement('link');
        link.id = linkId;
        link.rel = 'stylesheet';
        document.head.appendChild(link);
    }

    const safeFont = fontFamily.replace(/\s+/g, '+');
    link.href = `https://fonts.googleapis.com/css2?family=${safeFont}:wght@400;500;600;700&display=swap`;
};
