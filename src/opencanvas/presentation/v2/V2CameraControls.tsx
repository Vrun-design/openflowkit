import { useRef, useState } from 'react';
import { IconStack2 } from '@tabler/icons-react';
import {
  Button,
  ColorPicker,
  ColorSwatch,
  FloatingRegion,
  Icon,
  IconButton,
  Menu,
  MenuItem,
  MenuSeparator,
  Popover,
  PopoverHeader,
  Toolbar,
  Tooltip,
} from '../design-system';
import type { V2SettingsProps } from './V2Settings';

interface V2CameraControlsProps extends V2SettingsProps {
  readonly zoomPercent: number;
  readonly treeOpen: boolean;
  readonly onZoomIn: () => void;
  readonly onZoomOut: () => void;
  readonly onZoomTo: (percent: number) => void;
  readonly onFitView: () => void;
  readonly onToggleTree: () => void;
}

const ZOOM_PRESETS = [50, 100, 200];

// Lab shell composition: layers toggle plus one zoom readout that opens the
// zoom menu. Buttons for ±/fit live in the menu and on the keyboard.
export function V2CameraControls(props: V2CameraControlsProps): React.JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false);
  const zoomRef = useRef<HTMLButtonElement>(null);
  const [colorOpen, setColorOpen] = useState(false);
  const colorRef = useRef<HTMLButtonElement>(null);
  const canvasColor = props.preferences.canvasColor ?? props.canvasDefaultColor;
  return (
    <>
      <FloatingRegion slot="bottom-start">
        <Toolbar label="View">
          <Tooltip content="Canvas background">
            <ColorSwatch ref={colorRef} label="Canvas background" color={canvasColor}
              onClick={() => setColorOpen((open) => !open)} />
          </Tooltip>
          <Tooltip content="Layers" shortcut="L">
            <IconButton
              variant="quiet"
              label="Layers"
              icon={<Icon icon={IconStack2} />}
              selected={props.treeOpen}
              onClick={props.onToggleTree}
            />
          </Tooltip>
          <Button
            ref={zoomRef}
            variant="quiet"
            className="ofk-numeric"
            aria-haspopup="menu"
            aria-label={`Zoom ${props.zoomPercent}%`}
            onClick={() => setMenuOpen(true)}
          >
            {props.zoomPercent}%
          </Button>
        </Toolbar>
      </FloatingRegion>
      <Popover role="dialog" aria-label="Canvas background" open={colorOpen} anchorRef={colorRef}
        onClose={() => setColorOpen(false)} placement="top-start">
        <PopoverHeader title="Canvas background" close={<Button variant="quiet" onClick={() => setColorOpen(false)}>Done</Button>} />
        <div className="ofk-v2-properties">
          <ColorPicker value={canvasColor} allowAlpha={false}
            presets={['#f7f7f5', '#ffffff', '#f5f1e8', '#eaf2ef', '#191b19', '#20242b']}
            onChange={(color) => props.onPreferencesChange({ canvasColor: color })} />
          {props.preferences.canvasColor ? (
            <Button variant="quiet" onClick={() => props.onPreferencesChange({ canvasColor: null })}>Reset to default</Button>
          ) : null}
        </div>
      </Popover>
      <Menu
        open={menuOpen}
        anchorRef={zoomRef}
        onClose={() => setMenuOpen(false)}
        label="Zoom"
        placement="top-start"
      >
        <MenuItem onSelect={props.onZoomIn} shortcut={['⌘', '+']}>Zoom in</MenuItem>
        <MenuItem onSelect={props.onZoomOut} shortcut={['⌘', '−']}>Zoom out</MenuItem>
        <MenuItem onSelect={props.onFitView} shortcut={['⇧', '1']}>Zoom to fit</MenuItem>
        <MenuSeparator />
        {ZOOM_PRESETS.map((percent) => (
          <MenuItem
            key={percent}
            onSelect={() => props.onZoomTo(percent)}
            checked={props.zoomPercent === percent}
            shortcut={percent === 100 ? ['⌘', '0'] : undefined}
          >
            Zoom to {percent}%
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
