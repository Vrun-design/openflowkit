import type { V2SettingsProps } from './V2Settings';
import type { SceneDocumentV1 } from '../../domain/document/types';
import type { ToastItem } from '../design-system';
import { V2CameraControls } from './V2CameraControls';
import { V2CreationToolbar, type V2Tool } from './V2CreationToolbar';
import { V2DocumentBar } from './V2DocumentBar';
import type { V2SaveStatus } from './useV2Autosave';
import type { IconChoice } from '../../domain/nodes/iconNode';

interface V2ChromeProps extends V2SettingsProps {
  readonly document: SceneDocumentV1;
  readonly saveStatus: V2SaveStatus;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly readOnly: boolean;
  readonly tool: V2Tool;
  readonly zoomPercent: number;
  readonly treeOpen: boolean;
  readonly onUndo: () => void;
  readonly onRedo: () => void;
  readonly onRetrySave: () => void;
  readonly onReload: () => void;
  readonly onToast: (toast: ToastItem) => void;
  readonly onRename: (name: string) => void;
  readonly onToolChange: (tool: V2Tool) => void;
  readonly iconsOpen: boolean;
  readonly onIconsOpenChange: (open: boolean) => void;
  readonly onInsertIcon: (icon: IconChoice) => void;
  readonly onZoomIn: () => void;
  readonly onZoomOut: () => void;
  readonly onZoomTo: (percent: number) => void;
  readonly onFitView: () => void;
  readonly onToggleTree: () => void;
}

// Persistent chrome (I-31): document bar, creation toolbar, camera controls.
// Floating overlays only — the canvas keeps ≥85% of the viewport at 1440×900.
export function V2Chrome(props: V2ChromeProps): React.JSX.Element {
  return (
    <>
      <V2DocumentBar
        preferences={props.preferences} canvasDefaultColor={props.canvasDefaultColor}
        onPreferencesChange={props.onPreferencesChange}
        document={props.document}
        saveStatus={props.saveStatus}
        readOnly={props.readOnly}
        onRetrySave={props.onRetrySave}
        onReload={props.onReload}
        onToast={props.onToast}
        onRename={props.onRename}
      />
      {props.readOnly ? null : (
        <V2CreationToolbar tool={props.tool} onToolChange={props.onToolChange}
          iconsOpen={props.iconsOpen} onIconsOpenChange={props.onIconsOpenChange} onInsertIcon={props.onInsertIcon} />
      )}
      <V2CameraControls
        preferences={props.preferences} canvasDefaultColor={props.canvasDefaultColor}
        onPreferencesChange={props.onPreferencesChange}
        canUndo={props.canUndo} canRedo={props.canRedo}
        onUndo={props.onUndo} onRedo={props.onRedo}
        zoomPercent={props.zoomPercent}
        treeOpen={props.treeOpen}
        onZoomIn={props.onZoomIn}
        onZoomOut={props.onZoomOut}
        onZoomTo={props.onZoomTo}
        onFitView={props.onFitView}
        onToggleTree={props.onToggleTree}
      />
    </>
  );
}
