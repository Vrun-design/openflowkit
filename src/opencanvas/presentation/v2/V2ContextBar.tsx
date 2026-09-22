import type { DocumentCommand } from '../../domain/commands/types';
import type { ScenePage } from '../../domain/document/types';
import type { JsonObject } from '../../domain/document/json';
import { V2NodeStylePanels } from './V2NodeStyle';
import { V2ArrangeControls } from './V2ArrangeControls';
import { V2ConnectorStyle } from './V2ConnectorStyle';
import type { ConnectorStylePatch } from '../../domain/commands/styleConnectors';
import { IconDots, IconTable } from '@tabler/icons-react';
import { Button, ContextBar, ContextGroup, Icon, IconButton, Tooltip } from '../design-system';

interface V2ContextBarProps {
  readonly page: ScenePage;
  readonly nodeIds: readonly string[];
  readonly connectorId: string | null;
  readonly commit: (command: DocumentCommand) => void;
  readonly onStylePreview: (patch: JsonObject | null) => void;
  /** Sticky defaults: the last committed style patch seeds the next created item. */
  readonly onNodeStyleCommitted: (patch: JsonObject) => void;
  readonly onConnectorStyleCommitted: (patch: ConnectorStylePatch) => void;
  readonly style: React.CSSProperties;
  readonly onOpenMenu: (x: number, y: number) => void;
  /** Single chart selected: jump straight to its data panel. */
  readonly onOpenChartData?: () => void;
}

export interface ContextBarLayout {
  /** Measured bar width; the caller observes the element. */
  readonly width: number;
  /** Visible canvas edges in viewport px: side panels shrink them. */
  readonly left: number;
  readonly right: number;
}

/** Canvas edges not covered by the layers/workspace panels. */
export function visibleCanvasEdges(root: HTMLElement | null): Pick<ContextBarLayout, 'left' | 'right'> {
  const style = root ? getComputedStyle(root) : null;
  const panel = root?.dataset.workspaceOpen === 'true' ? parseFloat(style?.getPropertyValue('--v2-panel-width') ?? '') || 0 : 0;
  // The left slot holds either the tree or the animation panel; its width is
  // whichever one is open (--v2-left-width follows the panel).
  const left = root?.dataset.leftOpen === 'true' ? parseFloat(style?.getPropertyValue('--v2-left-width') ?? '') || 0 : 0;
  return { left, right: window.innerWidth - panel };
}

// Positioned above the selection union, falling below it near the viewport
// top, kept inside the visible canvas. A zero-width anchor is a point
// (selected connector: x at its midpoint, y/height spanning the path) and
// centres the bar on it instead of hanging it to the right.
export function contextBarStyle(anchor: DOMRect, layout: ContextBarLayout): React.CSSProperties {
  const top = anchor.y - 104;
  const left = anchor.width === 0 ? anchor.x - layout.width / 2 : anchor.x;
  const minLeft = layout.left + 8;
  return {
    position: 'absolute',
    left: Math.max(minLeft, Math.min(left, Math.max(minLeft, layout.right - layout.width - 8))),
    top: Math.max(80, Math.min(top >= 80 ? top : anchor.y + anchor.height + 16, window.innerHeight - 144)),
    zIndex: 35,
  };
}

export function sameRect(a: DOMRect, b: DOMRect): boolean {
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}

export function unionScreenBounds(rects: readonly (DOMRect | null | undefined)[]): DOMRect | null {
  const boxes = rects.filter((rect): rect is DOMRect => !!rect);
  if (boxes.length === 0) return null;
  const left = Math.min(...boxes.map((box) => box.x));
  const top = Math.min(...boxes.map((box) => box.y));
  const right = Math.max(...boxes.map((box) => box.x + box.width));
  const bottom = Math.max(...boxes.map((box) => box.y + box.height));
  return new DOMRect(left, top, right - left, bottom - top);
}

// I-31: contextual actions use the same command path as keyboard edits.
// Keydown bubbles to the page on purpose: ⌘Z after a swatch click must undo
// (the page ignores keys aimed at inputs; buttons keep Enter/Space/arrows).
export function V2ContextBar(props: V2ContextBarProps): React.JSX.Element {
  const openMenu = (button: HTMLButtonElement) => {
    const rect = button.getBoundingClientRect();
    props.onOpenMenu(rect.left, rect.bottom + 6);
  };
  if (props.connectorId) {
    return (
      <ContextBar label="Connector actions" data-context-bar style={props.style}
        onPointerDown={(event) => event.stopPropagation()}
        onDoubleClick={(event) => event.stopPropagation()}>
        <ContextGroup label="Appearance">
          <V2ConnectorStyle page={props.page} connectorId={props.connectorId} commit={props.commit}
            onCommitted={props.onConnectorStyleCommitted} />
        </ContextGroup>
        <ContextGroup label="Actions">
          <Tooltip content="More options">
            <IconButton variant="quiet" label="More options" icon={<Icon icon={IconDots} />}
              onClick={(event) => openMenu(event.currentTarget)} />
          </Tooltip>
        </ContextGroup>
      </ContextBar>
    );
  }
  return (
    <ContextBar label="Selection actions" data-context-bar style={props.style}
      onPointerDown={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}>
      <ContextGroup label="Appearance">
        <V2NodeStylePanels key={props.nodeIds.join(':')} page={props.page} nodeIds={props.nodeIds}
          commit={props.commit} onPreview={props.onStylePreview} onCommitted={props.onNodeStyleCommitted} />
      </ContextGroup>
      {props.onOpenChartData ? (
        <ContextGroup label="Data">
          <Tooltip content="Edit chart data">
            <Button variant="secondary" onClick={props.onOpenChartData}>
              <Icon icon={IconTable} /> Data
            </Button>
          </Tooltip>
        </ContextGroup>
      ) : null}
      <ContextGroup label="Arrange">
        <V2ArrangeControls page={props.page} nodeIds={props.nodeIds} commit={props.commit} />
      </ContextGroup>
      <ContextGroup label="Actions">
        <Tooltip content="More options">
          <IconButton variant="quiet" label="More options" icon={<Icon icon={IconDots} />}
            onClick={(event) => openMenu(event.currentTarget)} />
        </Tooltip>
      </ContextGroup>
    </ContextBar>
  );
}
