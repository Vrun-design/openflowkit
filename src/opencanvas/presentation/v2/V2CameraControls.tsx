import { useRef, useState } from 'react';
import { IconStack2 } from '@tabler/icons-react';
import {
  Button,
  FloatingRegion,
  Icon,
  IconButton,
  Menu,
  MenuItem,
  MenuSeparator,
  Toolbar,
  Tooltip,
} from '../design-system';

interface V2CameraControlsProps {
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
  return (
    <>
      <FloatingRegion slot="bottom-start">
        <Toolbar label="View">
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
