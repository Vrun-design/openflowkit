import {
  IconCircle,
  IconHandStop,
  IconPointer,
  IconSquare,
  IconTypography,
  IconArrowUpRight,
  IconSparkles,
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
  /** null hides the entry point (v2Ai flag off). */
  readonly agentOpen: boolean | null;
  readonly onToggleAgent: () => void;
}): React.JSX.Element {
  return (
    <FloatingRegion slot="bottom-center">
      <Toolbar label="Create">
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
        {props.agentOpen === null ? null : (
          <Tooltip content="Agent" shortcut="⌘J">
            <IconButton variant="quiet" label="Agent" icon={<Icon icon={IconSparkles} />}
              selected={props.agentOpen} data-testid="v2-agent-toggle" onClick={props.onToggleAgent} />
          </Tooltip>
        )}
      </Toolbar>
    </FloatingRegion>
  );
}
