import { useState } from 'react';
import {
  IconArrowBarDown, IconArrowBarUp, IconArrowDown, IconArrowUp, IconDimensions,
  IconLayoutAlignBottom, IconLayoutAlignCenter, IconLayoutAlignLeft, IconLayoutAlignMiddle,
  IconLayoutAlignRight, IconLayoutAlignTop, IconLayoutDistributeHorizontal, IconLayoutDistributeVertical, IconStack2,
} from '@tabler/icons-react';
import type { ScenePage } from '../../domain/document/types';
import type { DocumentCommand } from '../../domain/commands/types';
import {
  buildAlignCommand, buildDistributeCommand, buildSetTransformCommand, buildStepOrderCommand, type NodeTransformPatch,
} from '../../domain/commands/arrangeNodes';
import { buildReorderCommand } from '../../domain/commands/sceneEdits';
import type { AlignMode, DistributeAxis } from '../../domain/transforms/arrangement';
import { Icon, IconButton, NumberField, Tooltip } from '../design-system';
import { PanelRow, StyleButton } from './V2StyleControls';

interface V2ArrangeControlsProps {
  readonly page: ScenePage;
  readonly nodeIds: readonly string[];
  readonly commit: (command: DocumentCommand) => void;
}

type Panel = 'align' | 'position' | 'layer';

const ALIGNS: readonly { mode: AlignMode; label: string; shortcut: string; icon: typeof IconLayoutAlignLeft }[] = [
  { mode: 'left', label: 'Align left', shortcut: '⌥A', icon: IconLayoutAlignLeft },
  { mode: 'center-x', label: 'Align centre', shortcut: '⌥H', icon: IconLayoutAlignCenter },
  { mode: 'right', label: 'Align right', shortcut: '⌥D', icon: IconLayoutAlignRight },
  { mode: 'top', label: 'Align top', shortcut: '⌥W', icon: IconLayoutAlignTop },
  { mode: 'center-y', label: 'Align middle', shortcut: '⌥V', icon: IconLayoutAlignMiddle },
  { mode: 'bottom', label: 'Align bottom', shortcut: '⌥S', icon: IconLayoutAlignBottom },
];
const DISTRIBUTES: readonly { axis: DistributeAxis; label: string; shortcut: string; icon: typeof IconLayoutAlignLeft }[] = [
  { axis: 'horizontal', label: 'Distribute horizontally', shortcut: '⌥⇧H', icon: IconLayoutDistributeHorizontal },
  { axis: 'vertical', label: 'Distribute vertically', shortcut: '⌥⇧V', icon: IconLayoutDistributeVertical },
];

const round = (value: number) => Math.round(value * 10) / 10;

// Align (≥2), Position (1) and Layer buttons of the style bar. Every action is
// one command; no-ops commit nothing.
export function V2ArrangeControls({ page, nodeIds, commit }: V2ArrangeControlsProps): React.JSX.Element {
  const [open, setOpen] = useState<Panel | null>(null);
  const toggle = (panel: Panel) => setOpen((current) => (current === panel ? null : panel));
  const close = () => setOpen(null);
  const run = (command: DocumentCommand | null) => { if (command) commit(command); };
  const single = nodeIds.length === 1 ? page.nodes.find((node) => node.id === nodeIds[0]) ?? null : null;
  const setTransform = (patch: NodeTransformPatch) => { if (single) run(buildSetTransformCommand(page, single.id, patch)); };

  return (
    <>
      {nodeIds.length >= 2 ? (
        <StyleButton label="Align" open={open === 'align'} onToggle={() => toggle('align')} onClose={close}
          preview={<Icon icon={IconLayoutAlignCenter} />}>
          <PanelRow>
            <div className="ofk-choice-row" role="group" aria-label="Align">
              {ALIGNS.slice(0, 3).map(({ mode, label, shortcut, icon }) => (
                <Tooltip key={mode} content={label} shortcut={shortcut}>
                  <button type="button" className="ofk-choice" aria-label={label} onClick={() => run(buildAlignCommand(page, nodeIds, mode))}>
                    <Icon icon={icon} />
                  </button>
                </Tooltip>
              ))}
            </div>
            <div className="ofk-choice-row" role="group" aria-label="Align vertically">
              {ALIGNS.slice(3).map(({ mode, label, shortcut, icon }) => (
                <Tooltip key={mode} content={label} shortcut={shortcut}>
                  <button type="button" className="ofk-choice" aria-label={label} onClick={() => run(buildAlignCommand(page, nodeIds, mode))}>
                    <Icon icon={icon} />
                  </button>
                </Tooltip>
              ))}
            </div>
          </PanelRow>
          <PanelRow label="Distribute">
            <div className="ofk-choice-row" role="group" aria-label="Distribute">
              {DISTRIBUTES.map(({ axis, label, shortcut, icon }) => (
                <Tooltip key={axis} content={label} shortcut={shortcut}>
                  <button type="button" className="ofk-choice" aria-label={label} disabled={nodeIds.length < 3}
                    onClick={() => run(buildDistributeCommand(page, nodeIds, axis))}>
                    <Icon icon={icon} />
                  </button>
                </Tooltip>
              ))}
            </div>
          </PanelRow>
        </StyleButton>
      ) : null}

      {single ? (
        <StyleButton label="Position" open={open === 'position'} onToggle={() => toggle('position')} onClose={close}
          preview={<Icon icon={IconDimensions} />}>
          <div className="ofk-position-grid">
            <NumberField label="X" prefix="X" hideLabel value={round(single.transform.translation.x)} step={1}
              onChange={() => undefined} onCommit={(x) => setTransform({ x })} />
            <NumberField label="Y" prefix="Y" hideLabel value={round(single.transform.translation.y)} step={1}
              onChange={() => undefined} onCommit={(y) => setTransform({ y })} />
            <NumberField label="Width" prefix="W" hideLabel value={round(single.size.width)} min={1} step={1}
              onChange={() => undefined} onCommit={(width) => setTransform({ width })} />
            <NumberField label="Height" prefix="H" hideLabel value={round(single.size.height)} min={1} step={1}
              onChange={() => undefined} onCommit={(height) => setTransform({ height })} />
            <NumberField label="Rotation" prefix="R" hideLabel unit="°" step={15}
              value={round((single.transform.rotationRadians * 180) / Math.PI)}
              onChange={() => undefined} onCommit={(rotation) => setTransform({ rotation })} />
          </div>
        </StyleButton>
      ) : null}

      <StyleButton label="Layer" open={open === 'layer'} onToggle={() => toggle('layer')} onClose={close}
        preview={<Icon icon={IconStack2} />}>
        <div className="ofk-choice-row" role="group" aria-label="Layer order">
          <Tooltip content="Bring to front" shortcut="⌘⌥]">
            <IconButton variant="quiet" label="Bring to front" icon={<Icon icon={IconArrowBarUp} />}
              onClick={() => run(buildReorderCommand(page, nodeIds, 'front'))} />
          </Tooltip>
          <Tooltip content="Bring forward" shortcut="⌘]">
            <IconButton variant="quiet" label="Bring forward" icon={<Icon icon={IconArrowUp} />}
              onClick={() => run(buildStepOrderCommand(page, nodeIds, 'forward'))} />
          </Tooltip>
          <Tooltip content="Send backward" shortcut="⌘[">
            <IconButton variant="quiet" label="Send backward" icon={<Icon icon={IconArrowDown} />}
              onClick={() => run(buildStepOrderCommand(page, nodeIds, 'backward'))} />
          </Tooltip>
          <Tooltip content="Send to back" shortcut="⌘⌥[">
            <IconButton variant="quiet" label="Send to back" icon={<Icon icon={IconArrowBarDown} />}
              onClick={() => run(buildReorderCommand(page, nodeIds, 'back'))} />
          </Tooltip>
        </div>
      </StyleButton>
    </>
  );
}
