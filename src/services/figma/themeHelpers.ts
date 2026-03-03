import { NODE_EXPORT_COLORS, SECTION_COLOR_PALETTE } from '@/theme';

export function getNodeTheme(color: string = 'slate') {
    return NODE_EXPORT_COLORS[color] || NODE_EXPORT_COLORS.slate;
}

export function getSectionTheme(color: string = 'blue') {
    const theme = SECTION_COLOR_PALETTE[color] || SECTION_COLOR_PALETTE.blue;
    return {
        bg: theme.bg,
        border: theme.border,
        title: theme.title,
        badgeBg: theme.badgeBgHex || '#e2e8f0',
        badgeText: theme.badgeTextHex || '#334155',
    };
}

export function escapeXml(value: string): string {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
