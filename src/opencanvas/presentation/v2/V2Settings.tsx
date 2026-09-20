import type { RefObject } from 'react';
import { Button, Popover, PopoverHeader, Segmented, Switch } from '../design-system';
import type { V2Preferences, V2ThemePreference } from './useV2Preferences';

export interface V2SettingsProps {
  preferences: V2Preferences;
  canvasDefaultColor: string;
  onPreferencesChange: (patch: Partial<V2Preferences>) => void;
}

export function V2Settings({ open, anchorRef, onClose, preferences, onPreferencesChange }:
  V2SettingsProps & { open: boolean; anchorRef: RefObject<HTMLButtonElement | null>; onClose: () => void }): React.JSX.Element {
  return (
    <Popover role="dialog" aria-label="Settings" open={open} anchorRef={anchorRef} onClose={onClose} placement="bottom-start">
      <PopoverHeader title="Settings" close={<Button variant="quiet" onClick={onClose}>Done</Button>} />
      <div className="ofk-v2-properties">
        <span className="ofk-caption">Appearance</span>
        <Segmented<V2ThemePreference> label="Appearance" value={preferences.theme}
          onChange={(theme) => onPreferencesChange({ theme })}
          options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }, { value: 'system', label: 'System' }]} />
        <Switch label="Dot grid" checked={preferences.showGrid} onChange={(event) => onPreferencesChange({ showGrid: event.target.checked })} />
        <Switch label="Snap to grid" checked={preferences.snapToGrid} onChange={(event) => onPreferencesChange({ snapToGrid: event.target.checked })} />
        <p className="ofk-caption">Hold Alt while dragging to bypass snapping.</p>
        <p className="ofk-caption">V Select · H Hand · R Rectangle · O Ellipse · T Text<br />Space + drag to pan · Ctrl/⌘ + scroll to zoom</p>
      </div>
    </Popover>
  );
}
