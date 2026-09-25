import type { V2SettingsProps } from './V2Settings';
import type { SceneDocumentV1 } from '../../domain/document/types';
import type { ToastItem } from '../design-system';
import { V2CameraControls } from './V2CameraControls';
import { V2CreationToolbar, type V2Tool } from './V2CreationToolbar';
import type { V2ChartKind, V2ConnectorTool, V2MoreItem, V2ToolConfig } from './v2ToolCatalog';
import type { ShapeKind } from '../../domain/nodes/shapeNode';
import { V2DocumentBar } from './V2DocumentBar';
import type { V2SaveStatus } from './useV2Autosave';
import type { IconChoice } from '../../domain/nodes/iconNode';

interface V2ChromeProps extends V2SettingsProps {
  readonly document: SceneDocumentV1;
  /** Page controls; the active page drives the canvas and export. */
  readonly pages: ReturnType<typeof import('./useV2Pages').useV2Pages>;
  readonly pageId: string;
  readonly bridge: { readonly status: import('./useV2AgentBridge').V2BridgeStatus; readonly onOpen: () => void };
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
  readonly workspace?: {
    readonly name: string | null;
    readonly onOpenFolder: () => void;
    readonly onCloseFolder: () => void;
  };
  readonly breadcrumb?: readonly { readonly pageId: string; readonly label: string; readonly elementId?: string }[];
  readonly onCrumb?: (crumb: { readonly pageId: string; readonly elementId?: string }) => void;
  readonly onToolChange: (tool: V2Tool) => void;
  readonly onPickChart: (kind: V2ChartKind) => void;
  readonly toolConfig: V2ToolConfig;
  readonly onPickShape: (shape: ShapeKind) => void;
  readonly onPickConnector: (kind: V2ConnectorTool) => void;
  readonly iconsOpen: boolean;
  readonly onIconsOpenChange: (open: boolean) => void;
  readonly onInsertIcon: (icon: IconChoice) => void;
  readonly onInsertImage: () => void;
  readonly onPickEmoji: (glyph: string) => void;
  readonly recentEmoji: readonly string[];
  readonly librarySection: 'icons' | 'emoji';
  readonly moreOpen: boolean;
  readonly onMoreOpenChange: (open: boolean) => void;
  readonly onPickMore: (item: V2MoreItem) => void;
  readonly onZoomIn: () => void;
  readonly onZoomOut: () => void;
  readonly onZoomTo: (percent: number) => void;
  readonly onFitView: () => void;
  readonly onToggleTree: () => void;
  /** Export… opens the shared panel; a document panel closes it again. */
  readonly onOpenExport: (anchor: HTMLElement | null) => void;
  readonly onDismissExport: () => void;
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
        pages={props.pages}
        pageId={props.pageId}
        bridge={props.bridge}
        saveStatus={props.saveStatus}
        readOnly={props.readOnly}
        onRetrySave={props.onRetrySave}
        onReload={props.onReload}
        onToast={props.onToast}
        onRename={props.onRename}
        {...(props.workspace ? { workspace: props.workspace } : {})}
        {...(props.breadcrumb ? { breadcrumb: props.breadcrumb } : {})}
        {...(props.onCrumb ? { onCrumb: props.onCrumb } : {})}
        onOpenExport={props.onOpenExport}
        onDismissExport={props.onDismissExport}
      />
      {props.readOnly ? null : (
        <V2CreationToolbar tool={props.tool} onToolChange={props.onToolChange}
          toolConfig={props.toolConfig} onPickShape={props.onPickShape}
          onPickConnector={props.onPickConnector}
          iconsOpen={props.iconsOpen} onIconsOpenChange={props.onIconsOpenChange} onInsertIcon={props.onInsertIcon}
          onInsertImage={props.onInsertImage} onPickEmoji={props.onPickEmoji}
          recentEmoji={props.recentEmoji} librarySection={props.librarySection}
          onPickChart={props.onPickChart}
          moreOpen={props.moreOpen} onMoreOpenChange={props.onMoreOpenChange} onPickMore={props.onPickMore} />
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
