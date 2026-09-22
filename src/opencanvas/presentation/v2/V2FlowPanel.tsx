import { IconPlayerPause, IconPlayerPlay, IconPlayerTrackNext, IconPlayerTrackPrev, IconX } from '@tabler/icons-react';
import { Button, Icon, IconButton } from '../design-system';
import type { FlowPlayback } from './useV2FlowPlayback';
import type { FlowStepKind } from '../../../dsl/model/types';

export interface V2FlowPanelProps {
  readonly playback: FlowPlayback;
  readonly onClose: () => void;
  readonly onCopy: (kind: 'mermaid' | 'plantuml' | 'sequence') => void;
}

const KIND_LABEL: Readonly<Record<FlowStepKind, string>> = {
  intro: 'Intro', message: 'Message', process: 'Process', alternate: 'Alternate',
  parallel: 'Parallel', goto: 'Go to flow', info: 'Info', conclusion: 'Conclusion',
};

function stepText(kind: FlowStepKind, label: string | undefined, from?: string, to?: string): string {
  if (kind === 'message' && from && to) return `${from} → ${to}${label ? ` · ${label}` : ''}`;
  if (kind === 'goto') return label ?? '';
  return label ?? KIND_LABEL[kind];
}

/**
 * Flow playback: a bottom bar with the step timeline, prev/play/next and the
 * text exports. Keyboard: ←/→ step, Space plays, Escape closes (owned by the page).
 */
export function V2FlowPanel({ playback, onClose, onCopy }: V2FlowPanelProps): React.JSX.Element | null {
  const { flow, flat, stepIndex, step, playing } = playback;
  if (!flow || !step) return null;
  const total = flat.length;
  return (
    <section className="ofk-v2-flow" aria-label={`Flow ${flow.name}`}>
      <header className="ofk-v2-flow-head">
        <span className="ofk-v2-flow-title">{flow.name}</span>
        <span className="ofk-v2-flow-count" aria-live="polite">
          Step {stepIndex + 1} of {total}
        </span>
        <IconButton label="Close flow" variant="quiet" onClick={onClose} icon={<Icon icon={IconX} />} />
      </header>
      <ol className="ofk-v2-flow-timeline">
        {flat.map((entry, index) => (
          <li key={entry.step.id}>
            <button
              type="button"
              className="ofk-v2-flow-tick"
              data-state={index === stepIndex ? 'current' : index < stepIndex ? 'done' : 'todo'}
              data-kind={entry.step.kind}
              aria-current={index === stepIndex ? 'step' : undefined}
              aria-label={`Step ${index + 1}: ${KIND_LABEL[entry.step.kind]}${entry.branch ? ` (${entry.branch})` : ''}`}
              onClick={() => playback.jumpTo(index)}
            />
          </li>
        ))}
      </ol>
      <p className="ofk-v2-flow-step" data-kind={step.step.kind}>
        <span className="ofk-v2-flow-kind">{KIND_LABEL[step.step.kind]}</span>
        <span>{stepText(step.step.kind, step.step.label, step.step.from, step.step.to)}</span>
      </p>
      <div className="ofk-v2-flow-controls">
        <IconButton label="Previous step" variant="quiet" onClick={playback.prev} disabled={stepIndex === 0}
          icon={<Icon icon={IconPlayerTrackPrev} />} />
        <Button variant="primary" selected={playing} onClick={playback.toggle}
          aria-label={playing ? 'Pause flow' : 'Play flow'}>
          <Icon icon={playing ? IconPlayerPause : IconPlayerPlay} />
          {playing ? 'Pause' : 'Play'}
        </Button>
        <IconButton label="Next step" variant="quiet" onClick={playback.next} disabled={stepIndex >= total - 1}
          icon={<Icon icon={IconPlayerTrackNext} />} />
        <span className="ofk-v2-flow-exports">
          <Button variant="quiet" onClick={() => onCopy('mermaid')}>Mermaid</Button>
          <Button variant="quiet" onClick={() => onCopy('plantuml')}>PlantUML</Button>
          <Button variant="quiet" onClick={() => onCopy('sequence')}>Sequence</Button>
        </span>
      </div>
    </section>
  );
}
