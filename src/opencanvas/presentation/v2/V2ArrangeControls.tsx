import { useState } from 'react';
import {
  IconArrowBarDown, IconArrowBarUp, IconArrowDown, IconArrowUp, IconTransform,
  IconLayoutAlignBottom, IconLayoutAlignCenter, IconLayoutAlignLeft, IconLayoutAlignMiddle,
  IconLayoutAlignRight, IconLayoutAlignTop, IconLayoutDistributeHorizontal, IconLayoutDistributeVertical,
} from '@tabler/icons-react';
import type { ScenePage } from '../../domain/document/types';
import type { DocumentCommand } from '../../domain/commands/types';
import {
  buildAlignCommand, buildDistributeCommand, buildSetTransformCommand, buildStepOrderCommand, type NodeTransformPatch,
} from '../../domain/commands/arrangeNodes';
import { buildReorderCommand } from '../../domain/commands/sceneEdits';
import type { AlignMode, DistributeAxis } from '../../domain/transforms/arrangement';
import { Icon, NumberField, Tooltip } from '../design-system';
import { PanelRow, StyleButton } from './V2StyleControls';

interface V2ArrangeControlsProps {
  readonly page: ScenePage;
  readonly nodeIds: readonly string[];
  readonly commit: (command: DocumentCommand) => void;
}

type Panel = 'align' | 'arrange';

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

// Align stays visible for multiple nodes; Arrange holds position and order. Every action is
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

      <StyleButton label="Arrange" open={open === 'arrange'} onToggle={() => toggle('arrange')} onClose={close}
        preview={<Icon icon={IconTransform} />}>
      {single ? (
        <section className="ofk-style-section">
          <h3>Position and size</h3>
          <div className="ofk-position-grid">
            <NumberField stepper="none" label="X" prefix="X" hideLabel value={round(single.transform.translation.x)} step={1}
              onChange={() => undefined} onCommit={(x) => setTransform({ x })} />
            <NumberField stepper="none" label="Y" prefix="Y" hideLabel value={round(single.transform.translation.y)} step={1}
              onChange={() => undefined} onCommit={(y) => setTransform({ y })} />
            <NumberField stepper="none" label="Width" prefix="W" hideLabel value={round(single.size.width)} min={1} step={1}
              onChange={() => undefined} onCommit={(width) => setTransform({ width })} />
            <NumberField stepper="none" label="Height" prefix="H" hideLabel value={round(single.size.height)} min={1} step={1}
              onChange={() => undefined} onCommit={(height) => setTransform({ height })} />
            <NumberField stepper="none" label="Rotation" prefix="R" hideLabel unit="°" step={15}
              value={round((single.transform.rotationRadians * 180) / Math.PI)}
              onChange={() => undefined} onCommit={(rotation) => setTransform({ rotation })} />
          </div>
        </section>
      ) : null}
        <section className="ofk-style-section">
        <h3>Layer order</h3>
        <div className="ofk-layer-actions" role="group" aria-label="Layer order">
          <Tooltip content="Bring to front" shortcut="⌘⌥]">
            <button type="button" className="ofk-layer-action" aria-label="Bring to front" onClick={() => run(buildReorderCommand(page, nodeIds, 'front'))}>
              <Icon icon={IconArrowBarUp} /><span>To front</span>
            </button>
          </Tooltip>
          <Tooltip content="Bring forward" shortcut="⌘]">
            <button type="button" className="ofk-layer-action" aria-label="Bring forward" onClick={() => run(buildStepOrderCommand(page, nodeIds, 'forward'))}>
              <Icon icon={IconArrowUp} /><span>Forward</span>
            </button>
          </Tooltip>
          <Tooltip content="Send backward" shortcut="⌘[">
            <button type="button" className="ofk-layer-action" aria-label="Send backward" onClick={() => run(buildStepOrderCommand(page, nodeIds, 'backward'))}>
              <Icon icon={IconArrowDown} /><span>Backward</span>
            </button>
          </Tooltip>
          <Tooltip content="Send to back" shortcut="⌘⌥[">
            <button type="button" className="ofk-layer-action" aria-label="Send to back" onClick={() => run(buildReorderCommand(page, nodeIds, 'back'))}>
              <Icon icon={IconArrowBarDown} /><span>To back</span>
            </button>
          </Tooltip>
        </div>
        </section>
      </StyleButton>
    </>
  );
}
