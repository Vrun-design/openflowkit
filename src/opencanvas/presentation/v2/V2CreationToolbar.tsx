import { useRef } from 'react';
import {
  IconCircle,
  IconHandStop,
  IconPhoto,
  IconPointer,
  IconSquare,
  IconTypography,
  IconArrowUpRight,
} from '@tabler/icons-react';
import type { IconChoice } from '../../domain/nodes/iconNode';
import { FloatingRegion, Icon, IconButton, Popover, Toolbar, Tooltip } from '../design-system';
import { V2IconPicker } from './V2IconPicker';

export type V2Tool = 'select' | 'hand' | 'rectangle' | 'ellipse' | 'connector' | 'text';

const TOOLS: readonly { tool: V2Tool; label: string; shortcut: string; icon: typeof IconPointer }[] = [
  { tool: 'select', label: 'Select', shortcut: 'V', icon: IconPointer },
  { tool: 'hand', label: 'Hand', shortcut: 'H', icon: IconHandStop },
  { tool: 'rectangle', label: 'Rectangle', shortcut: 'R', icon: IconSquare },
  { tool: 'ellipse', label: 'Ellipse', shortcut: 'O', icon: IconCircle },
  { tool: 'connector', label: 'Connector', shortcut: 'A', icon: IconArrowUpRight },
  { tool: 'text', label: 'Text', shortcut: 'T', icon: IconTypography },
];

export function V2CreationToolbar(props: {
  readonly tool: V2Tool;
  readonly onToolChange: (tool: V2Tool) => void;
  /** Icon library pick: the page inserts the icon node and opens its label. */
  readonly onInsertIcon: (icon: IconChoice) => void;
  readonly iconsOpen: boolean;
  readonly onIconsOpenChange: (open: boolean) => void;
}): React.JSX.Element {
  // The library opens beside the whole toolbar, top-aligned, not off its last button.
  const toolsRef = useRef<HTMLDivElement>(null);
  return (
    <FloatingRegion ref={toolsRef} slot="top-start" className="ofk-v2-tools">
      <Toolbar label="Create" orientation="vertical">
        {TOOLS.map(({ tool, label, shortcut, icon }) => (
          <Tooltip key={tool} content={label} shortcut={shortcut}>
            <IconButton
              variant="quiet"
              label={label}
              icon={<Icon icon={icon} />}
              selected={props.tool === tool}
              onClick={() => props.onToolChange(tool)}
            />
          </Tooltip>
        ))}
        <Tooltip content="Icons" shortcut="I">
          <IconButton variant="quiet" label="Icons" icon={<Icon icon={IconPhoto} />}
            selected={props.iconsOpen} aria-haspopup="dialog" aria-expanded={props.iconsOpen}
            onClick={() => props.onIconsOpenChange(!props.iconsOpen)} />
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
