import React from 'react';

interface OpenCanvasCameraControlsProps {
  readonly canFitSelection: boolean;
  readonly canRecallPrevious: boolean;
  readonly onFitPage: () => void;
  readonly onFitSelection: () => void;
  readonly onResetZoom: () => void;
  readonly onRecallPrevious: () => void;
}

export function OpenCanvasCameraControls(
  props: OpenCanvasCameraControlsProps
): React.JSX.Element {
  return (
    <div role="group" aria-label="Canvas view">
      <button type="button" title="Fit page (Shift+1)" onClick={props.onFitPage}>
        Fit page
      </button>
      <button type="button" title="Fit selection (Shift+2)"
        disabled={!props.canFitSelection} onClick={props.onFitSelection}>
        Fit selection
      </button>
      <button type="button" title="Zoom to 100% (0)" onClick={props.onResetZoom}>
        100%
      </button>
      <button type="button" title="Previous view (Shift+0)"
        disabled={!props.canRecallPrevious} onClick={props.onRecallPrevious}>
        Previous view
      </button>
    </div>
  );
}
