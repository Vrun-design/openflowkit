import { useRef, useState } from 'react';
import {
  IconArrowUpRight,
  IconChartBar,
  IconCircle,
  IconHandStop,
  IconMoodSmile,
  IconPencil,
  IconPhotoPlus,
  IconPointer,
  IconSquare,
  IconTriangleSquareCircle,
  IconTypography,
} from '@tabler/icons-react';
import type { IconChoice } from '../../domain/nodes/iconNode';
import { FloatingRegion, Icon, IconButton, Popover, Toolbar, Tooltip } from '../design-system';
import { V2IconPicker } from './V2IconPicker';
import { FlyoutButton } from './V2Flyout';
import {
  CHART_OPTIONS, CONNECTOR_OPTIONS, INK_OPTIONS, SHAPE_OPTIONS,
  type V2ChartKind, type V2ConnectorTool, type V2InkTool, type V2Tool, type V2ToolConfig,
} from './v2ToolCatalog';
import type { ShapeKind } from '../../domain/nodes/shapeNode';

type V2FlyoutId = 'shapes' | 'connector' | 'ink' | 'charts';

export type { V2Tool, V2ToolConfig, V2ConnectorTool, V2InkTool };

export function V2CreationToolbar(props: {
  readonly tool: V2Tool;
  readonly toolConfig: V2ToolConfig;
  readonly onToolChange: (tool: V2Tool) => void;
  readonly onPickShape: (shape: ShapeKind) => void;
  readonly onPickConnector: (kind: V2ConnectorTool) => void;
  /** Icon library pick: the page inserts the icon node and opens its label. */
  readonly onInsertIcon: (icon: IconChoice) => void;
  readonly iconsOpen: boolean;
  readonly onIconsOpenChange: (open: boolean) => void;
  /** Emoji live in the same library, on their own tab. */
  readonly onPickEmoji: (glyph: string) => void;
  readonly recentEmoji: readonly string[];
  /** Which tab the library opens on: E asks for emoji, I for icons. */
  readonly librarySection: 'icons' | 'emoji';
  /** Image picks a file; the page stores the bytes and inserts the node. */
  readonly onInsertImage: () => void;
  /** A chart pick inserts the chart; there is no armed chart tool. */
  readonly onPickChart: (kind: V2ChartKind) => void;
}): React.JSX.Element {
  // Each picker anchors to its own trigger: the popover opens at the button's
  // height and, more importantly, focus returns to a real button when it closes.
  const toolsRef = useRef<HTMLDivElement>(null);
  const iconsRef = useRef<HTMLButtonElement>(null);
  // One flyout at a time: a rail with two open grids reads as two selections.
  const [flyout, setFlyout] = useState<V2FlyoutId | null>(null);
  const setFlyoutOpen = (id: V2FlyoutId) => (open: boolean) => setFlyout(open ? id : null);
  const ink: V2InkTool = props.tool === 'highlighter' ? 'highlighter' : 'pen';

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
        <FlyoutButton label="Shapes" shortcut="S" icon={<Icon icon={IconTriangleSquareCircle} />}
          selected={props.tool === 'shape'} open={flyout === 'shapes'}
          onOpenChange={setFlyoutOpen('shapes')} options={SHAPE_OPTIONS} columns={6}
          selectedId={props.toolConfig.shape} onPick={props.onPickShape} />
        <FlyoutButton label="Connector" shortcut="A" icon={<Icon icon={IconArrowUpRight} />}
          selected={props.tool === 'connector'} open={flyout === 'connector'}
          onOpenChange={setFlyoutOpen('connector')} options={CONNECTOR_OPTIONS} columns={5}
          selectedId={props.toolConfig.connector} onPick={props.onPickConnector} />
        <span className="ofk-v2-tools-separator" aria-hidden="true" />
        {plain('text', 'Text', 'T', IconTypography)}
        <FlyoutButton label="Charts" icon={<Icon icon={IconChartBar} />}
          selected={flyout === 'charts'} open={flyout === 'charts'}
          onOpenChange={setFlyoutOpen('charts')} options={CHART_OPTIONS}
          selectedId={'bar' as V2ChartKind} onPick={props.onPickChart} />
        <FlyoutButton label="Draw" shortcut="P" icon={<Icon icon={IconPencil} />}
          selected={props.tool === 'pen' || props.tool === 'highlighter'} open={flyout === 'ink'}
          onOpenChange={setFlyoutOpen('ink')} options={INK_OPTIONS} columns={1}
          selectedId={ink} onPick={(id) => props.onToolChange(id)} />
        <Tooltip content="Image" shortcut="⇧I">
          <IconButton variant="quiet" label="Image" icon={<Icon icon={IconPhotoPlus} />}
            onClick={props.onInsertImage} />
        </Tooltip>
        <Tooltip content="Icons and emoji" shortcut="I / E">
          <IconButton ref={iconsRef} variant="quiet" label="Icons and emoji" icon={<Icon icon={IconMoodSmile} />}
            selected={props.iconsOpen} aria-haspopup="dialog" aria-expanded={props.iconsOpen}
            onClick={() => props.onIconsOpenChange(!props.iconsOpen)} />
        </Tooltip>
      </Toolbar>
      <Popover role="dialog" aria-label="Icon library" open={props.iconsOpen} anchorRef={iconsRef}
        onClose={() => props.onIconsOpenChange(false)} placement="right-start" gap={12}
        className="ofk-style-panel ofk-style-panel--icons" onPointerDown={(event) => event.stopPropagation()}>
        <V2IconPicker key={props.librarySection} initialPack={props.librarySection === 'emoji' ? 'emoji' : 'all'}
          recentEmoji={props.recentEmoji} onPickEmoji={props.onPickEmoji}
          onClose={() => props.onIconsOpenChange(false)}
          onPick={(icon) => { props.onInsertIcon(icon); props.onIconsOpenChange(false); }} />
      </Popover>
    </FloatingRegion>
  );
}
