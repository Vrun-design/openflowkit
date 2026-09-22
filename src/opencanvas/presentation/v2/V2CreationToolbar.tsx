import { useRef, useState } from 'react';
import {
  IconCircle,
  IconHandStop,
  IconLock,
  IconLockOpen,
  IconPhoto,
  IconPointer,
  IconSquare,
  IconTypography,
} from '@tabler/icons-react';
import type { IconChoice } from '../../domain/nodes/iconNode';
import { FloatingRegion, Icon, IconButton, Popover, Toolbar, Tooltip } from '../design-system';
import { V2IconPicker } from './V2IconPicker';
import { FlyoutButton } from './V2Flyout';
import {
  CONNECTOR_OPTIONS, SHAPE_OPTIONS, connectorOption, shapeOption,
  type V2ConnectorTool, type V2Tool, type V2ToolConfig,
} from './v2ToolCatalog';
import type { ShapeKind } from '../../domain/nodes/shapeNode';

type V2FlyoutId = 'shapes' | 'connector';

export type { V2Tool, V2ToolConfig, V2ConnectorTool };

export function V2CreationToolbar(props: {
  readonly tool: V2Tool;
  readonly toolConfig: V2ToolConfig;
  readonly onToolChange: (tool: V2Tool) => void;
  readonly onPickShape: (shape: ShapeKind) => void;
  readonly onPickConnector: (kind: V2ConnectorTool) => void;
  /** Lock toggles the selection; disabled until something is selected. */
  readonly selectionCount: number;
  readonly selectionLocked: boolean;
  readonly onToggleLock: () => void;
  /** Icon library pick: the page inserts the icon node and opens its label. */
  readonly onInsertIcon: (icon: IconChoice) => void;
  readonly iconsOpen: boolean;
  readonly onIconsOpenChange: (open: boolean) => void;
}): React.JSX.Element {
  // The library opens beside the whole toolbar, top-aligned, not off its last button.
  const toolsRef = useRef<HTMLDivElement>(null);
  // One flyout at a time: a rail with two open grids reads as two selections.
  const [flyout, setFlyout] = useState<V2FlyoutId | null>(null);
  const setFlyoutOpen = (id: V2FlyoutId) => (open: boolean) => setFlyout(open ? id : null);
  const shape = shapeOption(props.toolConfig.shape);
  const connector = connectorOption(props.toolConfig.connector);

  const plain = (tool: V2Tool, label: string, shortcut: string, icon: typeof IconPointer) => (
    <Tooltip content={label} shortcut={shortcut}>
      <IconButton variant="quiet" label={label} icon={<Icon icon={icon} />}
        selected={props.tool === tool} onClick={() => props.onToolChange(tool)} />
    </Tooltip>
  );

  return (
    <FloatingRegion ref={toolsRef} slot="top-start" className="ofk-v2-tools">
      <Toolbar label="Create" orientation="vertical">
        {plain('select', 'Select', 'V', IconPointer)}
        {plain('hand', 'Hand', 'H', IconHandStop)}
        <span className="ofk-v2-tools-separator" aria-hidden="true" />
        {plain('rectangle', 'Rectangle', 'R', IconSquare)}
        {plain('ellipse', 'Ellipse', 'O', IconCircle)}
        <FlyoutButton label="Shapes" shortcut="S" icon={<Icon icon={shape.icon} />}
          selected={props.tool === 'shape'} open={flyout === 'shapes'}
          onOpenChange={setFlyoutOpen('shapes')} options={SHAPE_OPTIONS}
          selectedId={props.toolConfig.shape} onPick={props.onPickShape} />
        <FlyoutButton label="Connector" shortcut="A" icon={<Icon icon={connector.icon} />}
          selected={props.tool === 'connector'} open={flyout === 'connector'}
          onOpenChange={setFlyoutOpen('connector')} options={CONNECTOR_OPTIONS} columns={2}
          selectedId={props.toolConfig.connector} onPick={props.onPickConnector} />
        <span className="ofk-v2-tools-separator" aria-hidden="true" />
        {plain('text', 'Text', 'T', IconTypography)}
        <Tooltip content="Icons" shortcut="I">
          <IconButton variant="quiet" label="Icons" icon={<Icon icon={IconPhoto} />}
            selected={props.iconsOpen} aria-haspopup="dialog" aria-expanded={props.iconsOpen}
            onClick={() => props.onIconsOpenChange(!props.iconsOpen)} />
        </Tooltip>
        <span className="ofk-v2-tools-separator" aria-hidden="true" />
        <Tooltip shortcut="⌘L"
          content={props.selectionCount === 0 ? 'Select something to lock' : props.selectionLocked ? 'Unlock' : 'Lock'}>
          {/* A disabled button swallows pointer events; the wrapper keeps the
              "select something" hint reachable while staying natively disabled. */}
          <span className="ofk-v2-lock-slot">
            <IconButton variant="quiet" label={props.selectionLocked ? 'Unlock' : 'Lock'}
              icon={<Icon icon={props.selectionLocked ? IconLock : IconLockOpen} />}
              disabled={props.selectionCount === 0} aria-pressed={props.selectionLocked}
              onClick={props.onToggleLock} />
          </span>
        </Tooltip>
      </Toolbar>
      <Popover role="dialog" aria-label="Icon library" open={props.iconsOpen} anchorRef={toolsRef}
        onClose={() => props.onIconsOpenChange(false)} placement="right-start" gap={12}
        className="ofk-style-panel ofk-style-panel--icons" onPointerDown={(event) => event.stopPropagation()}>
        <V2IconPicker onClose={() => props.onIconsOpenChange(false)}
          onPick={(icon) => { props.onInsertIcon(icon); props.onIconsOpenChange(false); }} />
      </Popover>
    </FloatingRegion>
  );
}
