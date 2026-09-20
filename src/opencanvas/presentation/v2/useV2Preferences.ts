import { useState } from 'react';

export type V2ThemePreference = 'system' | 'light' | 'dark';
export interface V2Preferences {
  theme: V2ThemePreference;
  showGrid: boolean;
  snapToGrid: boolean;
  canvasColor: string | null;
  agentOpen: boolean;
}
const KEY = 'openflowkit-v2-preferences';
const DEFAULTS: V2Preferences = {
  theme: 'system', showGrid: true, snapToGrid: false, canvasColor: null, agentOpen: false,
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
      agentOpen: value?.agentOpen === true };
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
