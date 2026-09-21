import {
  IconCircle,
  IconHandStop,
  IconPointer,
  IconSquare,
  IconTypography,
  IconArrowUpRight,
} from '@tabler/icons-react';
import { FloatingRegion, Icon, IconButton, Toolbar, Tooltip } from '../design-system';

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
}): React.JSX.Element {
  return (
    <FloatingRegion slot="top-start" className="ofk-v2-tools">
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

      </Toolbar>
    </FloatingRegion>
  );
}
