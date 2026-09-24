import { useRef, useState } from 'react';
import { IconStack2, IconMaximize, IconArrowBackUp, IconArrowForwardUp } from '@tabler/icons-react';
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
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly onUndo: () => void;
  readonly onRedo: () => void;
  readonly zoomPercent: number;
  readonly treeOpen: boolean;
  readonly onZoomIn: () => void;
  readonly onZoomOut: () => void;
  readonly onZoomTo: (percent: number) => void;
  readonly onFitView: () => void;
  readonly onToggleTree: () => void;
}

const ZOOM_PRESETS = [50, 100, 200];

export function V2CameraControls(props: V2CameraControlsProps): React.JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false);
  const zoomRef = useRef<HTMLButtonElement>(null);
  const [colorOpen, setColorOpen] = useState(false);
  const colorRef = useRef<HTMLButtonElement>(null);
  const canvasColor = props.preferences.canvasColor ?? props.canvasDefaultColor;
  return (
    <>
      <FloatingRegion slot="bottom-start">
        <Toolbar label="View" className="ofk-v2-view-controls">
          <Tooltip content="Canvas background">
            <ColorSwatch ref={colorRef} label="Canvas background" color={canvasColor} expanded={colorOpen}
              onClick={() => setColorOpen((open) => !open)} />
          </Tooltip>
          <span className="ofk-v2-divider" aria-hidden="true" />
          <Tooltip content="Layers" shortcut="L">
            <IconButton
              variant="quiet"
              label="Layers"
              icon={<Icon icon={IconStack2} />}
              selected={props.treeOpen}
              onClick={props.onToggleTree}
            />
          </Tooltip>
          <span className="ofk-v2-divider" aria-hidden="true" />
          <Tooltip content="Zoom">
            <Button
              ref={zoomRef}
              variant="quiet"
              className="ofk-numeric"
              aria-haspopup="menu"
              aria-label={`Zoom ${props.zoomPercent}%`}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {props.zoomPercent}%
            </Button>
          </Tooltip>
          <span className="ofk-v2-divider" aria-hidden="true" />
          <Tooltip content="Zoom to fit" shortcut="⌘0"><IconButton variant="quiet" label="Zoom to fit" icon={<Icon icon={IconMaximize} />} onClick={props.onFitView} /></Tooltip>
          <span className="ofk-v2-divider" aria-hidden="true" />
          <Tooltip content="Undo" shortcut="⌘Z"><IconButton variant="quiet" label="Undo" icon={<Icon icon={IconArrowBackUp} />} disabled={!props.canUndo} onClick={props.onUndo} /></Tooltip>
          <Tooltip content="Redo" shortcut="⇧⌘Z"><IconButton variant="quiet" label="Redo" icon={<Icon icon={IconArrowForwardUp} />} disabled={!props.canRedo} onClick={props.onRedo} /></Tooltip>
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
        <MenuItem onSelect={props.onFitView} shortcut={['⌘', '0']}>Zoom to fit</MenuItem>
        <MenuSeparator />
        {ZOOM_PRESETS.map((percent) => (
          <MenuItem
            key={percent}
            onSelect={() => props.onZoomTo(percent)}
            checked={props.zoomPercent === percent}
            shortcut={percent === 100 ? ['⌘', '1'] : undefined}
          >
            Zoom to {percent}%
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
