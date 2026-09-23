import { useState } from 'react';
import { BRIDGE_DEFAULT_PORT } from '../../../agent/bridge/protocol';

export type V2ThemePreference = 'system' | 'light' | 'dark';
export type V2Density = 'comfortable' | 'compact';
export type V2DiagramPalette = 'pastel' | 'paper' | 'builder' | 'mono';
export interface V2Preferences {
  theme: V2ThemePreference;
  showGrid: boolean;
  snapToGrid: boolean;
  canvasColor: string | null;
  density: V2Density;
  /** Palette handed to every compile; the DSL's own `appearance:` wins. */
  diagramPalette: V2DiagramPalette;
  /** Icons from labels on generated diagrams; the DSL's own `icons:` wins. */
  autoIcons: boolean;
  /** Local agent pairing: port, optional shared token, and whether to connect. */
  bridgePort: number;
  bridgeToken: string;
  agentBridgeEnabled: boolean;
  /** Tag perspective: matching elements stay bright, the rest dims. */
  perspectiveTags: string[];
  /** Last emoji picks, newest first (slice 6.5). */
  recentEmoji: string[];
}
const KEY = 'openflowkit-v2-preferences';
const DEFAULTS: V2Preferences = {
  theme: 'system', showGrid: true, snapToGrid: false, canvasColor: null, density: 'comfortable',
  diagramPalette: 'pastel', autoIcons: true, bridgePort: BRIDGE_DEFAULT_PORT, bridgeToken: '', agentBridgeEnabled: false,
  perspectiveTags: [],
  recentEmoji: [],
};

function readPreferences(): V2Preferences {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    return { theme: value?.theme === 'light' || value?.theme === 'dark' ? value.theme : 'system',
      showGrid: typeof value?.showGrid === 'boolean' ? value.showGrid : true,
      snapToGrid: value?.snapToGrid === true,
      canvasColor: typeof value?.canvasColor === 'string' && /^#[0-9a-f]{6}$/i.test(value.canvasColor)
        ? value.canvasColor
        : null,
      density: value?.density === 'compact' ? 'compact' : 'comfortable',
      diagramPalette: ['pastel', 'paper', 'builder', 'mono'].includes(value?.diagramPalette)
        ? value.diagramPalette : 'pastel',
      autoIcons: value?.autoIcons !== false,
      bridgePort: Number.isInteger(value?.bridgePort) && value.bridgePort > 0 && value.bridgePort < 65536
        ? value.bridgePort : BRIDGE_DEFAULT_PORT,
      bridgeToken: typeof value?.bridgeToken === 'string' ? value.bridgeToken.slice(0, 64) : '',
      agentBridgeEnabled: value?.agentBridgeEnabled === true,
      perspectiveTags: Array.isArray(value?.perspectiveTags)
        ? value.perspectiveTags.filter((tag: unknown): tag is string => typeof tag === 'string').slice(0, 24)
        : [],
      recentEmoji: Array.isArray(value?.recentEmoji)
        ? value.recentEmoji.filter((glyph: unknown): glyph is string => typeof glyph === 'string').slice(0, 24)
        : [] };
  } catch { return DEFAULTS; }
}

export function useV2Preferences() {
  const [preferences, setPreferences] = useState(readPreferences);
  function updatePreferences(patch: Partial<V2Preferences>): void {
    const next = { ...preferences, ...patch };
    setPreferences(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* Session preference still works. */ }
  }
  return { preferences, updatePreferences };
}
