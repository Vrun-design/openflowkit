import { IconCopy, IconPencil, IconTrash } from '@tabler/icons-react';
import { ContextBar, ContextGroup, Icon, IconButton, Tooltip } from '../design-system';

interface V2ContextBarProps {
  readonly selectionCount: number;
  readonly style: React.CSSProperties;
  readonly onEditLabel: () => void;
  readonly onDuplicate: () => void;
  readonly onDelete: () => void;
}

// Positioned above the selection union, falling below it near the viewport
// top. Coordinates are viewport CSS pixels from the render host.
export function contextBarStyle(anchor: DOMRect): React.CSSProperties {
  const top = anchor.y - 56;
  return {
    position: 'absolute',
    left: Math.max(8, Math.min(anchor.x, window.innerWidth - 320)),
    top: top >= 8 ? top : anchor.y + anchor.height + 16,
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

// I-31: contextual actions replace a permanent inspector. Ordering, lock and
// style arrive in V2-05; only the actions with commands today are shown.
export function V2ContextBar(props: V2ContextBarProps): React.JSX.Element {
  return (
    <ContextBar label="Selection actions" style={props.style}>
      <ContextGroup label="Edit">
        <Tooltip content="Edit label" shortcut="Enter">
          <IconButton
            variant="quiet"
            label={`Edit label (${props.selectionCount} selected)`}
            icon={<Icon icon={IconPencil} />}
            onClick={props.onEditLabel}
          />
        </Tooltip>
      </ContextGroup>
      <ContextGroup label="Arrange">
        <Tooltip content="Duplicate">
          <IconButton
            variant="quiet"
            label="Duplicate selection"
            icon={<Icon icon={IconCopy} />}
            onClick={props.onDuplicate}
          />
        </Tooltip>
        <Tooltip content="Delete" shortcut="⌫">
          <IconButton
            variant="quiet"
            label="Delete selection"
            icon={<Icon icon={IconTrash} />}
            onClick={props.onDelete}
          />
        </Tooltip>
      </ContextGroup>
    </ContextBar>
  );
}
