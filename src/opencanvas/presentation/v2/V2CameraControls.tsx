import { Button, FloatingRegion, Toolbar } from '../design-system';

interface V2CameraControlsProps {
  readonly zoomPercent: number;
  readonly treeOpen: boolean;
  readonly onZoomIn: () => void;
  readonly onZoomOut: () => void;
  readonly onResetZoom: () => void;
  readonly onFitView: () => void;
  readonly onToggleTree: () => void;
}

export function V2CameraControls(props: V2CameraControlsProps): React.JSX.Element {
  return (
    <FloatingRegion slot="bottom-start">
      <Toolbar label="Canvas view">
        <Button variant="quiet" type="button" title="Zoom out (⌘−)" onClick={props.onZoomOut}>
          −
        </Button>
        <Button
          variant="quiet"
          type="button"
          className="ofk-numeric"
          title="Zoom to 100% (⌘0)"
          onClick={props.onResetZoom}
        >
          {props.zoomPercent}%
        </Button>
        <Button variant="quiet" type="button" title="Zoom in (⌘+)" onClick={props.onZoomIn}>
          +
        </Button>
        <Button variant="quiet" type="button" title="Fit page (⇧1)" onClick={props.onFitView}>
          Fit
        </Button>
        <Button
          variant="quiet"
          type="button"
          title="Layers panel (L)"
          aria-pressed={props.treeOpen}
          onClick={props.onToggleTree}
        >
          Layers
        </Button>
      </Toolbar>
    </FloatingRegion>
  );
}
