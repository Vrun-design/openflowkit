import { mixHex } from '../lib/colorUtils';
import {
  DEFAULT_DIAGRAM_PALETTE, type DiagramPaletteName,
} from '../opencanvas/domain/nodes/nodePalette';
import { resolveNodeVisualStyle, resolveSharedColorKey } from './resolvers';
import type { NodeColorKey, NodeColorMode, SectionColors } from './types';

export const SECTION_COLOR_PALETTE: Record<string, SectionColors> = {
  slate: {
    bg: 'rgba(241,245,249,0.52)',
    border: '#cbd5e1',
    title: '#334155',
    badge: 'bg-slate-100 text-slate-600',
    badgeBgHex: '#e2e8f0',
    badgeTextHex: '#334155',
  },
  blue: {
    bg: 'rgba(219,234,254,0.48)',
    border: '#93c5fd',
    title: '#1d4ed8',
    badge: 'bg-blue-100 text-blue-700',
    badgeBgHex: '#bfdbfe',
    badgeTextHex: '#1e40af',
  },
  emerald: {
    bg: 'rgba(209,250,229,0.48)',
    border: '#6ee7b7',
    title: '#047857',
    badge: 'bg-emerald-100 text-emerald-700',
    badgeBgHex: '#a7f3d0',
    badgeTextHex: '#065f46',
  },
  amber: {
    bg: 'rgba(254,243,199,0.48)',
    border: '#fcd34d',
    title: '#b45309',
    badge: 'bg-amber-100 text-amber-700',
    badgeBgHex: '#fde68a',
    badgeTextHex: '#92400e',
  },
  violet: {
    bg: 'rgba(237,233,254,0.48)',
    border: '#a78bfa',
    title: '#6d28d9',
    badge: 'bg-violet-100 text-violet-700',
    badgeBgHex: '#c4b5fd',
    badgeTextHex: '#5b21b6',
  },
  red: {
    bg: 'rgba(254,226,226,0.48)',
    border: '#fca5a5',
    title: '#b91c1c',
    badge: 'bg-red-100 text-red-700',
    badgeBgHex: '#fecaca',
    badgeTextHex: '#991b1b',
  },
  pink: {
    bg: 'rgba(252,231,243,0.48)',
    border: '#f9a8d4',
    title: '#be185d',
    badge: 'bg-pink-100 text-pink-700',
    badgeBgHex: '#fbcfe8',
    badgeTextHex: '#9d174d',
  },
};

export function resolveSectionVisualStyle(
  colorKey?: string,
  colorMode: NodeColorMode = 'subtle',
  customColor?: string,
  fallback: NodeColorKey = 'blue',
  palette: DiagramPaletteName = DEFAULT_DIAGRAM_PALETTE
): {
  bg: string;
  border: string;
  title: string;
  badgeBg: string;
  badgeText: string;
} {
  const resolvedColorKey = resolveSharedColorKey(colorKey, fallback);
  if (colorMode === 'filled') {
    const resolved = resolveNodeVisualStyle(resolvedColorKey, 'filled', customColor, palette);
    return {
      bg: mixHex(resolved.bg, '#ffffff', 0.14),
      border: resolved.border,
      title: resolved.text,
      badgeBg: mixHex(resolved.iconBg, '#ffffff', 0.08),
      badgeText: resolved.iconColor,
    };
  }

  if (resolvedColorKey !== 'custom' && palette === 'pastel') {
    const sectionTheme = SECTION_COLOR_PALETTE[resolvedColorKey];
    if (sectionTheme) {
      return {
        bg: sectionTheme.bg,
        border: sectionTheme.border,
        title: sectionTheme.title,
        badgeBg: sectionTheme.badgeBgHex || mixHex(sectionTheme.border, '#ffffff', 0.56),
        badgeText: sectionTheme.badgeTextHex || sectionTheme.title,
      };
    }
  }

  const resolved = resolveNodeVisualStyle(resolvedColorKey, 'subtle', customColor, palette);
  return {
    bg: mixHex(resolved.bg, '#ffffff', 0.16),
    border: mixHex(resolved.border, '#ffffff', 0.1),
    title: mixHex(resolved.text, '#0f172a', 0.14),
    badgeBg: mixHex(resolved.iconBg, '#ffffff', 0.16),
    badgeText: mixHex(resolved.iconColor, '#0f172a', 0.08),
  };
}
