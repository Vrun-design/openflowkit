import React from 'react';
import { useTheme } from '@/context/ThemeContext';
import { SystemRoot, Button, Toolbar } from './design-system';

interface OpenCanvasCameraControlsProps {
  readonly canFitSelection: boolean;
  readonly canRecallPrevious: boolean;
  readonly onFitPage: () => void;
  readonly onFitSelection: () => void;
  readonly onResetZoom: () => void;
  readonly onRecallPrevious: () => void;
}

export function OpenCanvasCameraControls(props: OpenCanvasCameraControlsProps): React.JSX.Element {
  const { resolvedTheme } = useTheme();
  return (
    <SystemRoot appearance={resolvedTheme} className="ofk-camera-controls">
      <Toolbar label="Canvas view">
        <Button variant="quiet" type="button" title="Fit page (Shift+1)" onClick={props.onFitPage}>
          Fit page
        </Button>
        <Button
          variant="quiet"
          type="button"
          title="Fit selection (Shift+2)"
          disabled={!props.canFitSelection}
          onClick={props.onFitSelection}
        >
          Fit selection
        </Button>
        <Button variant="quiet" type="button" title="Zoom to 100% (0)" onClick={props.onResetZoom}>
          100%
        </Button>
        <Button
          variant="quiet"
          type="button"
          title="Previous view (Shift+0)"
          disabled={!props.canRecallPrevious}
          onClick={props.onRecallPrevious}
        >
          Previous view
        </Button>
      </Toolbar>
    </SystemRoot>
  );
}
