export interface ThemeColors {
  bg: string;
  fill: string; // for SVG
  border: string;
  stroke: string; // for SVG
  iconBg: string;
  iconColor: string;
  handle: string;
  ring: string;
  text: string;
  subText: string;
  shadow: string; // for export
}

export type NodeColorMode = 'subtle' | 'filled';
export type NodeColorKey = (typeof NODE_COLOR_OPTIONS)[number] | 'custom';

export interface ContainerVisualStyle {
  bg: string;
  border: string;
  text: string;
  subText: string;
  accentBg: string;
  accentText: string;
  hoverBg: string;
  badgeBg: string;
  badgeText: string;
}

export interface EdgeVisualStyle {
  stroke: string;
  text: string;
  mutedText: string;
  pillBg: string;
  pillBorder: string;
  pillText: string;
  pillHoverBorder: string;
  pillHoverText: string;
  focusRing: string;
  metaBg: string;
  metaBorder: string;
  metaText: string;
  metaMutedText: string;
}

const DEFAULT_EDGE_COLOR = '#94a3b8';
const ANNOTATION_COLOR_ALIASES: Record<string, NodeColorKey> = {
  green: 'emerald',
  orange: 'amber',
  purple: 'violet',
};

const EDGE_CONDITION_COLOR_KEYS = {
  default: 'slate',
  yes: 'emerald',
  no: 'red',
  success: 'emerald',
  error: 'red',
  timeout: 'amber',
} as const;

export const NODE_COLOR_OPTIONS = [
  'white',
  'slate',
  'blue',
  'emerald',
  'amber',
  'red',
  'violet',
  'pink',
  'yellow',
] as const;

export const NODE_COLOR_LABELS: Record<(typeof NODE_COLOR_OPTIONS)[number] | 'custom', string> = {
  white: 'White',
  slate: 'Slate',
  blue: 'Blue',
  emerald: 'Green',
  amber: 'Orange',
  red: 'Red',
  violet: 'Violet',
  pink: 'Pink',
  yellow: 'Yellow',
  custom: 'Custom',
};

// Maps color names to Tailwind classes (for UI) AND hex values (for export)
// This serves as the Single Source of Truth for node styling.

export const NODE_COLOR_PALETTE: Record<string, ThemeColors> = {
  white: {
    bg: 'bg-white',
    fill: 'fill-white',
    border: 'border-slate-300',
    stroke: 'stroke-slate-300',
    iconBg: 'bg-slate-50',
    iconColor: 'text-slate-600',
    handle: 'bg-slate-400',
    ring: 'ring-slate-400',
    text: '#0f172a',
    subText: '#475569',
    shadow: 'rgba(15,23,42,0.06)',
  },
  slate: {
    bg: 'bg-white',
    fill: 'fill-white',
    border: 'border-slate-300',
    stroke: 'stroke-slate-300',
    iconBg: 'bg-slate-100',
    iconColor: 'text-slate-600',
    handle: 'bg-slate-400',
    ring: 'ring-slate-400',
    // Export values (hex) - must match tailwind classes above
    text: '#1e293b',
    subText: '#475569',
    shadow: 'rgba(0,0,0,0.08)',
  },
  blue: {
    bg: 'bg-white',
    fill: 'fill-white',
    border: 'border-blue-300',
    stroke: 'stroke-blue-300',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    handle: 'bg-blue-500',
    ring: 'ring-blue-400',
    text: '#1e293b',
    subText: '#475569',
    shadow: 'rgba(37,99,235,0.08)',
  },
  emerald: {
    bg: 'bg-white',
    fill: 'fill-white',
    border: 'border-emerald-300',
    stroke: 'stroke-emerald-300',
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    handle: 'bg-emerald-500',
    ring: 'ring-emerald-400',
    text: '#064e3b',
    subText: '#065f46',
    shadow: 'rgba(5,150,105,0.08)',
  },
  red: {
    bg: 'bg-white',
    fill: 'fill-white',
    border: 'border-red-300',
    stroke: 'stroke-red-300',
    iconBg: 'bg-red-50',
    iconColor: 'text-red-600',
    handle: 'bg-red-500',
    ring: 'ring-red-400',
    text: '#7f1d1d',
    subText: '#991b1b',
    shadow: 'rgba(220,38,38,0.08)',
  },
  amber: {
    bg: 'bg-white',
    fill: 'fill-white',
    border: 'border-amber-300',
    stroke: 'stroke-amber-300',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    handle: 'bg-amber-500',
    ring: 'ring-amber-400',
    text: '#78350f',
    subText: '#92400e',
    shadow: 'rgba(217,119,6,0.08)',
  },
  violet: {
    bg: 'bg-white',
    fill: 'fill-white',
    border: 'border-violet-300',
    stroke: 'stroke-violet-300',
    iconBg: 'bg-violet-50',
    iconColor: 'text-violet-600',
    handle: 'bg-violet-500',
    ring: 'ring-violet-400',
    text: '#5b21b6',
    subText: '#6d28d9',
    shadow: 'rgba(124,58,237,0.08)',
  },
  pink: {
    bg: 'bg-white',
    fill: 'fill-white',
    border: 'border-pink-300',
    stroke: 'stroke-pink-300',
    iconBg: 'bg-pink-50',
    iconColor: 'text-pink-600',
    handle: 'bg-pink-500',
    ring: 'ring-pink-400',
    text: '#831843',
    subText: '#9d174d',
    shadow: 'rgba(219,39,119,0.08)',
  },
  yellow: {
    bg: 'bg-yellow-100', // Keep yellow background for sticky notes
    fill: 'fill-yellow-100',
    border: 'border-yellow-300',
    stroke: 'stroke-yellow-300',
    iconBg: 'bg-yellow-200',
    iconColor: 'text-yellow-700',
    handle: 'bg-yellow-500',
    ring: 'ring-yellow-400',
    text: '#a16207',
    subText: '#b45309',
    shadow: 'rgba(250,204,21,0.08)',
  },
  cyan: {
    bg: 'bg-white',
    fill: 'fill-white',
    border: 'border-cyan-300',
    stroke: 'stroke-cyan-300',
    iconBg: 'bg-cyan-50',
    iconColor: 'text-cyan-600',
    handle: 'bg-cyan-500',
    ring: 'ring-cyan-400',
    text: '#0e7490',
    subText: '#155e75',
    shadow: 'rgba(6,182,212,0.08)',
  },
};

export const NODE_COLOR_PALETTE_V2: Record<string, ThemeColors> = {
  white: {
    ...NODE_COLOR_PALETTE.white,
    bg: 'bg-white',
    fill: 'fill-white',
    border: 'border-slate-300',
    stroke: 'stroke-slate-300',
    iconBg: 'bg-slate-50',
    ring: 'ring-slate-400',
  },
  slate: {
    ...NODE_COLOR_PALETTE.slate,
    bg: 'bg-slate-50',
    fill: 'fill-slate-50',
    border: 'border-slate-400',
    stroke: 'stroke-slate-400',
    iconBg: 'bg-slate-100',
    ring: 'ring-slate-500',
  },
  blue: {
    ...NODE_COLOR_PALETTE.blue,
    bg: 'bg-blue-50',
    fill: 'fill-blue-50',
    border: 'border-blue-400',
    stroke: 'stroke-blue-400',
    iconBg: 'bg-blue-100',
    ring: 'ring-blue-500',
  },
  emerald: {
    ...NODE_COLOR_PALETTE.emerald,
    bg: 'bg-emerald-50',
    fill: 'fill-emerald-50',
    border: 'border-emerald-400',
    stroke: 'stroke-emerald-400',
    iconBg: 'bg-emerald-100',
    ring: 'ring-emerald-500',
  },
  red: {
    ...NODE_COLOR_PALETTE.red,
    bg: 'bg-red-50',
    fill: 'fill-red-50',
    border: 'border-red-400',
    stroke: 'stroke-red-400',
    iconBg: 'bg-red-100',
    ring: 'ring-red-500',
  },
  amber: {
    ...NODE_COLOR_PALETTE.amber,
    bg: 'bg-amber-50',
    fill: 'fill-amber-50',
    border: 'border-amber-400',
    stroke: 'stroke-amber-400',
    iconBg: 'bg-amber-100',
    ring: 'ring-amber-500',
  },
  violet: {
    ...NODE_COLOR_PALETTE.violet,
    bg: 'bg-violet-50',
    fill: 'fill-violet-50',
    border: 'border-violet-400',
    stroke: 'stroke-violet-400',
    iconBg: 'bg-violet-100',
    ring: 'ring-violet-500',
  },
  pink: {
    ...NODE_COLOR_PALETTE.pink,
    bg: 'bg-pink-50',
    fill: 'fill-pink-50',
    border: 'border-pink-400',
    stroke: 'stroke-pink-400',
    iconBg: 'bg-pink-100',
    ring: 'ring-pink-500',
  },
  yellow: {
    ...NODE_COLOR_PALETTE.yellow,
    bg: 'bg-yellow-100',
    fill: 'fill-yellow-100',
    border: 'border-yellow-400',
    stroke: 'stroke-yellow-400',
    iconBg: 'bg-yellow-200',
    ring: 'ring-yellow-500',
  },
  cyan: {
    ...NODE_COLOR_PALETTE.cyan,
    bg: 'bg-cyan-50',
    fill: 'fill-cyan-50',
    border: 'border-cyan-400',
    stroke: 'stroke-cyan-400',
    iconBg: 'bg-cyan-100',
    ring: 'ring-cyan-500',
  },
};

export function getNodeColorPalette(visualQualityV2Enabled: boolean): Record<string, ThemeColors> {
  if (visualQualityV2Enabled) {
    return NODE_COLOR_PALETTE_V2;
  }
  return NODE_COLOR_PALETTE;
}

interface NodeExportColor {
  bg: string;
  border: string;
  iconBg: string;
  iconColor: string;
  text: string;
  subText: string;
}

// Hex values for Export Service (Figma/SVG)
// We map the Tailwind classes to hex values for tools that can't use CSS classes
export const NODE_EXPORT_COLORS: Record<string, NodeExportColor> = {
  white: {
    bg: '#ffffff',
    border: '#cbd5e1',
    iconBg: '#f8fafc',
    iconColor: '#475569',
    text: '#0f172a',
    subText: '#475569',
  },
  slate: {
    bg: '#f8fafc',
    border: '#94a3b8',
    iconBg: '#f1f5f9',
    iconColor: '#475569',
    text: '#1e293b',
    subText: '#475569',
  },
  blue: {
    bg: '#eff6ff',
    border: '#60a5fa',
    iconBg: '#dbeafe',
    iconColor: '#2563eb',
    text: '#1e293b',
    subText: '#475569',
  },
  emerald: {
    bg: '#ecfdf5',
    border: '#34d399',
    iconBg: '#d1fae5',
    iconColor: '#059669',
    text: '#064e3b',
    subText: '#065f46',
  },
  red: {
    bg: '#fef2f2',
    border: '#f87171',
    iconBg: '#fee2e2',
    iconColor: '#dc2626',
    text: '#7f1d1d',
    subText: '#991b1b',
  },
  amber: {
    bg: '#fffbeb',
    border: '#fbbf24',
    iconBg: '#fef3c7',
    iconColor: '#d97706',
    text: '#78350f',
    subText: '#92400e',
  },
  violet: {
    bg: '#f5f3ff',
    border: '#8b5cf6',
    iconBg: '#ede9fe',
    iconColor: '#7c3aed',
    text: '#5b21b6',
    subText: '#6d28d9',
  },
  pink: {
    bg: '#fdf2f8',
    border: '#f472b6',
    iconBg: '#fce7f3',
    iconColor: '#db2777',
    text: '#831843',
    subText: '#9d174d',
  },
  yellow: {
    bg: '#fef9c3',
    border: '#facc15',
    iconBg: '#fef08a',
    iconColor: '#a16207',
    text: '#a16207',
    subText: '#b45309',
  },
  cyan: {
    bg: '#ecfeff',
    border: '#22d3ee',
    iconBg: '#cffafe',
    iconColor: '#0891b2',
    text: '#0e7490',
    subText: '#155e75',
  },
};

import { normalizeHex, mixHex, getContrastText } from './lib/colorUtils';

const NODE_FILLED_COLORS: Record<string, NodeExportColor> = {
  white: {
    bg: '#ffffff',
    border: '#94a3b8',
    iconBg: '#f8fafc',
    iconColor: '#475569',
    text: '#0f172a',
    subText: '#475569',
  },
  slate: {
    bg: '#475569',
    border: '#334155',
    iconBg: '#64748b',
    iconColor: '#ffffff',
    text: '#ffffff',
    subText: '#e2e8f0',
  },
  blue: {
    bg: '#2563eb',
    border: '#1d4ed8',
    iconBg: '#1d4ed8',
    iconColor: '#ffffff',
    text: '#ffffff',
    subText: '#dbeafe',
  },
  emerald: {
    bg: '#059669',
    border: '#047857',
    iconBg: '#047857',
    iconColor: '#ffffff',
    text: '#ffffff',
    subText: '#d1fae5',
  },
  amber: {
    bg: '#f59e0b',
    border: '#d97706',
    iconBg: '#d97706',
    iconColor: '#ffffff',
    text: '#0f172a',
    subText: '#451a03',
  },
  red: {
    bg: '#dc2626',
    border: '#b91c1c',
    iconBg: '#b91c1c',
    iconColor: '#ffffff',
    text: '#ffffff',
    subText: '#fee2e2',
  },
  violet: {
    bg: '#7c3aed',
    border: '#6d28d9',
    iconBg: '#6d28d9',
    iconColor: '#ffffff',
    text: '#ffffff',
    subText: '#ede9fe',
  },
  pink: {
    bg: '#db2777',
    border: '#be185d',
    iconBg: '#be185d',
    iconColor: '#ffffff',
    text: '#ffffff',
    subText: '#fce7f3',
  },
  yellow: {
    bg: '#eab308',
    border: '#ca8a04',
    iconBg: '#ca8a04',
    iconColor: '#ffffff',
    text: '#0f172a',
    subText: '#4d3800',
  },
  cyan: {
    bg: '#0891b2',
    border: '#0e7490',
    iconBg: '#0e7490',
    iconColor: '#ffffff',
    text: '#ffffff',
    subText: '#cffafe',
  },
};

export function resolveNodeVisualStyle(
  colorKey?: string,
  colorMode: NodeColorMode = 'subtle',
  customColor?: string
): NodeExportColor {
  if (colorKey === 'custom') {
    const normalized = normalizeHex(customColor || '');
    if (normalized) {
      if (colorMode === 'filled') {
        const textColor = getContrastText(normalized);
        const subTextColor =
          textColor === '#ffffff'
            ? mixHex('#ffffff', normalized, 0.18)
            : mixHex('#0f172a', '#ffffff', 0.18);
        return {
          bg: normalized,
          border: mixHex(normalized, '#000000', 0.18),
          iconBg: mixHex(normalized, '#000000', 0.14),
          iconColor: textColor,
          text: textColor,
          subText: subTextColor,
        };
      }
      return {
        bg: mixHex(normalized, '#ffffff', 0.9),
        border: mixHex(normalized, '#ffffff', 0.2),
        iconBg: mixHex(normalized, '#ffffff', 0.8),
        iconColor: normalized,
        text: '#0f172a',
        subText: '#475569',
      };
    }
  }

  const resolvedColor = colorKey && NODE_EXPORT_COLORS[colorKey] ? colorKey : 'white';
  if (colorMode === 'filled') {
    return NODE_FILLED_COLORS[resolvedColor] || NODE_FILLED_COLORS.white;
  }
  return NODE_EXPORT_COLORS[resolvedColor] || NODE_EXPORT_COLORS.white;
}

export function resolveSharedColorKey(
  colorKey?: string,
  fallback: NodeColorKey = 'white'
): NodeColorKey {
  if (colorKey === 'custom') {
    return 'custom';
  }

  if (colorKey && colorKey in ANNOTATION_COLOR_ALIASES) {
    return ANNOTATION_COLOR_ALIASES[colorKey];
  }

  return colorKey && colorKey in NODE_EXPORT_COLORS
    ? (colorKey as Exclude<NodeColorKey, 'custom'>)
    : fallback;
}

export function resolveContainerVisualStyle(
  colorKey?: string,
  colorMode: NodeColorMode = 'subtle',
  customColor?: string,
  fallback: NodeColorKey = 'slate'
): ContainerVisualStyle {
  const resolvedColorKey = resolveSharedColorKey(colorKey, fallback);
  const resolved = resolveNodeVisualStyle(resolvedColorKey, colorMode, customColor);

  if (colorMode === 'filled') {
    return {
      bg: resolved.bg,
      border: resolved.border,
      text: resolved.text,
      subText: resolved.subText,
      accentBg: mixHex(resolved.iconBg, '#ffffff', 0.08),
      accentText: resolved.iconColor,
      hoverBg: mixHex(resolved.bg, '#000000', 0.08),
      badgeBg: mixHex(resolved.iconBg, '#ffffff', 0.1),
      badgeText: resolved.iconColor,
    };
  }

  const strongText = getContrastText(resolved.bg) === '#ffffff'
    ? '#ffffff'
    : mixHex(resolved.text, '#0f172a', 0.3);
  const subtleText = mixHex(resolved.subText, '#ffffff', 0.16);

  return {
    bg: resolved.bg,
    border: resolved.border,
    text: strongText,
    subText: subtleText,
    accentBg: resolved.iconBg,
    accentText: resolved.iconColor,
    hoverBg: mixHex(resolved.bg, '#ffffff', 0.16),
    badgeBg: mixHex(resolved.border, '#ffffff', 0.74),
    badgeText: mixHex(resolved.text, '#ffffff', 0.1),
  };
}

export function resolveTextVisualStyle(
  colorKey?: string,
  colorMode: NodeColorMode = 'subtle',
  customColor?: string,
  fallback: NodeColorKey = 'slate'
): Pick<ContainerVisualStyle, 'border' | 'text' | 'hoverBg'> {
  const resolved = resolveNodeVisualStyle(resolveSharedColorKey(colorKey, fallback), colorMode, customColor);
  return {
    border: mixHex(resolved.border, '#ffffff', 0.18),
    text: mixHex(resolved.text, '#0f172a', 0.22),
    hoverBg: colorMode === 'filled'
      ? mixHex(resolved.bg, '#000000', 0.06)
      : mixHex(resolved.bg, '#ffffff', 0.28),
  };
}

export function resolveAnnotationVisualStyle(
  colorKey?: string,
  colorMode: NodeColorMode = 'subtle',
  customColor?: string
): {
  containerBg: string;
  containerBorder: string;
  titleText: string;
  titleBorder: string;
  bodyText: string;
  foldBg: string;
  foldBorder: string;
  dot: string;
} {
  const resolved = resolveNodeVisualStyle(resolveSharedColorKey(colorKey, 'yellow'), colorMode, customColor);
  return {
    containerBg: resolved.bg,
    containerBorder: mixHex(resolved.border, '#ffffff', 0.12),
    titleText: mixHex(resolved.text, '#0f172a', 0.08),
    titleBorder: mixHex(resolved.border, '#ffffff', 0.14),
    bodyText: mixHex(resolved.subText, '#0f172a', 0.12),
    foldBg: mixHex(resolved.iconBg, '#ffffff', 0.18),
    foldBorder: mixHex(resolved.border, '#ffffff', 0.2),
    dot: resolved.border,
  };
}

export function resolveEdgeVisualStyle(stroke?: string): EdgeVisualStyle {
  const normalized = normalizeHex(stroke || '') || DEFAULT_EDGE_COLOR;
  const pillBg = mixHex(normalized, '#ffffff', 0.9);
  const pillBorder = mixHex(normalized, '#ffffff', 0.42);
  const pillText = mixHex(normalized, '#0f172a', 0.52);
  return {
    stroke: normalized,
    text: pillText,
    mutedText: mixHex(pillText, '#ffffff', 0.24),
    pillBg,
    pillBorder,
    pillText,
    pillHoverBorder: mixHex(normalized, '#ffffff', 0.22),
    pillHoverText: mixHex(normalized, '#0f172a', 0.3),
    focusRing: mixHex(normalized, '#ffffff', 0.55),
    metaBg: mixHex(normalized, '#ffffff', 0.88),
    metaBorder: mixHex(normalized, '#ffffff', 0.32),
    metaText: mixHex(normalized, '#0f172a', 0.46),
    metaMutedText: mixHex(normalized, '#ffffff', 0.16),
  };
}

export function resolveEdgeConditionStroke(condition: keyof typeof EDGE_CONDITION_COLOR_KEYS): string {
  const colorKey = EDGE_CONDITION_COLOR_KEYS[condition] || EDGE_CONDITION_COLOR_KEYS.default;
  return resolveNodeVisualStyle(colorKey, 'subtle').border;
}

export interface SectionColors {
  bg: string;
  border: string;
  title: string;
  badge: string; // Tailwind class
  badgeBgHex?: string; // For export
  badgeTextHex?: string; // For export
}

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
  fallback: NodeColorKey = 'blue'
): {
  bg: string;
  border: string;
  title: string;
  badgeBg: string;
  badgeText: string;
} {
  const resolvedColorKey = resolveSharedColorKey(colorKey, fallback);
  if (colorMode === 'filled') {
    const resolved = resolveNodeVisualStyle(resolvedColorKey, 'filled', customColor);
    return {
      bg: mixHex(resolved.bg, '#ffffff', 0.14),
      border: resolved.border,
      title: resolved.text,
      badgeBg: mixHex(resolved.iconBg, '#ffffff', 0.08),
      badgeText: resolved.iconColor,
    };
  }

  if (resolvedColorKey !== 'custom') {
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

  const resolved = resolveNodeVisualStyle(resolvedColorKey, 'subtle', customColor);
  return {
    bg: mixHex(resolved.bg, '#ffffff', 0.16),
    border: mixHex(resolved.border, '#ffffff', 0.1),
    title: mixHex(resolved.text, '#0f172a', 0.14),
    badgeBg: mixHex(resolved.iconBg, '#ffffff', 0.16),
    badgeText: mixHex(resolved.iconColor, '#0f172a', 0.08),
  };
}

export const NODE_DEFAULTS: Record<string, { color: string; icon: string; shape: string }> = {
  start: { color: 'emerald', icon: 'none', shape: 'capsule' },
  end: { color: 'red', icon: 'none', shape: 'capsule' },
  decision: { color: 'amber', icon: 'none', shape: 'diamond' },
  custom: { color: 'white', icon: 'none', shape: 'rounded' },
  process: { color: 'white', icon: 'none', shape: 'rounded' },
};

export const getDefaultColor = (type: string): string => NODE_DEFAULTS[type]?.color || 'white';
