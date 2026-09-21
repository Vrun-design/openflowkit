import { getContrastText, mixHex, normalizeHex } from '../lib/colorUtils';
import {
  DEFAULT_DIAGRAM_PALETTE, diagramPalette, paletteTablesForMode,
  type DiagramPaletteName,
} from '../opencanvas/domain/nodes/nodePalette';
import { NODE_EXPORT_COLORS } from './palettes';
import type {
  ContainerVisualStyle,
  EdgeVisualStyle,
  NodeColorKey,
  NodeColorMode,
  NodeExportColor,
} from './types';

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

export function resolveNodeVisualStyle(
  colorKey?: string,
  colorMode: NodeColorMode = 'subtle',
  customColor?: string,
  palette: DiagramPaletteName = DEFAULT_DIAGRAM_PALETTE
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

  const tables = paletteTablesForMode(diagramPalette(palette), colorMode === 'filled' ? 'solid' : 'pastel');
  const resolvedColor = colorKey && tables[colorKey as NodeColorKey] ? colorKey : 'white';
  return tables[resolvedColor as NodeColorKey] ?? tables.white;
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
  fallback: NodeColorKey = 'slate',
  palette: DiagramPaletteName = DEFAULT_DIAGRAM_PALETTE
): ContainerVisualStyle {
  const resolvedColorKey = resolveSharedColorKey(colorKey, fallback);
  const resolved = resolveNodeVisualStyle(resolvedColorKey, colorMode, customColor, palette);

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

  const strongText =
    getContrastText(resolved.bg) === '#ffffff' ? '#ffffff' : mixHex(resolved.text, '#0f172a', 0.3);
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
  fallback: NodeColorKey = 'slate',
  palette: DiagramPaletteName = DEFAULT_DIAGRAM_PALETTE
): Pick<ContainerVisualStyle, 'border' | 'text' | 'hoverBg'> {
  const resolved = resolveNodeVisualStyle(
    resolveSharedColorKey(colorKey, fallback),
    colorMode,
    customColor,
    palette
  );
  return {
    border: mixHex(resolved.border, '#ffffff', 0.18),
    text: mixHex(resolved.text, '#0f172a', 0.22),
    hoverBg:
      colorMode === 'filled'
        ? mixHex(resolved.bg, '#000000', 0.06)
        : mixHex(resolved.bg, '#ffffff', 0.28),
  };
}

export function resolveAnnotationVisualStyle(
  colorKey?: string,
  colorMode: NodeColorMode = 'subtle',
  customColor?: string,
  palette: DiagramPaletteName = DEFAULT_DIAGRAM_PALETTE
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
  const resolved = resolveNodeVisualStyle(
    resolveSharedColorKey(colorKey, 'yellow'),
    colorMode,
    customColor,
    palette
  );
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

export function resolveEdgeConditionStroke(
  condition: keyof typeof EDGE_CONDITION_COLOR_KEYS
): string {
  const colorKey = EDGE_CONDITION_COLOR_KEYS[condition] || EDGE_CONDITION_COLOR_KEYS.default;
  return resolveNodeVisualStyle(colorKey, 'subtle').border;
}
