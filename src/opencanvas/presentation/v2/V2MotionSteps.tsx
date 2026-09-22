// The timeline editor, lite: the current order as chips. Drag to reorder,
// drop one chip onto another to merge, click to set its hold. Every edit
// writes the animate block into the code panel — the chips are the DSL,
// rendered. No per-object curves, no ruler, no keyframes (phase 8).
import { useRef, useState } from 'react';
import type { ScenePage } from '../../domain/document/types';
import type { AnimationStep } from '../../domain/animation/types';
import { Button, NumberField, Popover, PopoverHeader } from '../design-system';

export interface V2MotionStepsProps {
  readonly steps: readonly AnimationStep[];
  readonly page: ScenePage;
  readonly onReorder: (from: number, to: number) => void;
  readonly onMerge: (from: number, to: number) => void;
  readonly onHold: (index: number, holdMs: number | null) => void;
}

function labelOf(page: ScenePage, id: string): string {
  const node = page.nodes.find((candidate) => candidate.id === id);
  const label = node?.content.label;
  return typeof label === 'string' && label.length > 0 ? label : id;
}

/** `A, B` · `A → C` — what the step shows, short. */
function chipLabel(page: ScenePage, step: AnimationStep): string {
  const parts: string[] = [];
  const named = new Set<string>();
  const edges = step.connectorIds.flatMap((id) => {
    const connector = page.connectors.find((candidate) => candidate.id === id);
    if (!connector?.source.nodeId || !connector.target.nodeId) return [];
    named.add(connector.source.nodeId);
    named.add(connector.target.nodeId);
    return [`${labelOf(page, connector.source.nodeId)} → ${labelOf(page, connector.target.nodeId)}`];
  });
  if (edges.length > 0) parts.push(edges[0]!);
  // Nodes the step's edges already name are not repeated.
  const others = step.nodeIds.filter((id) => !named.has(id));
  const refs = others.slice(0, 2).map((id) => labelOf(page, id));
  if (refs.length > 0) parts.push(refs.join(', '));
  const extra = others.length - refs.length + Math.max(0, edges.length - 1);
  return `${parts.join(' + ')}${extra > 0 ? ` +${extra}` : ''}`;
}

export function V2MotionSteps({ steps, page, onReorder, onMerge, onHold }: V2MotionStepsProps) {
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dropAt, setDropAt] = useState<number | null>(null);
  const [holdIndex, setHoldIndex] = useState<number | null>(null);
  const holdAnchor = useRef<HTMLElement | null>(null);
  const holdStep = holdIndex === null ? null : steps[holdIndex] ?? null;
  return (
    <div className="ofk-motion-steps">
      <div className="ofk-motion-steps-head">
        <span>Steps</span>
        <span className="ofk-caption">{steps.length} step{steps.length === 1 ? '' : 's'}</span>
      </div>
      <ol className="ofk-motion-chip-row" aria-label="Animation steps">
        {steps.map((step, index) => (
          <li key={`${index}:${step.nodeIds.join(',')}:${step.connectorIds.join(',')}`}>
            <button
              type="button"
              className="ofk-motion-chip"
              data-dragging={dragFrom === index || undefined}
              data-drop={dropAt === index || undefined}
              draggable
              aria-label={`Step ${index + 1} of ${steps.length}: ${chipLabel(page, step)}${step.holdMs ? `, held ${(step.holdMs / 1000).toFixed(1)} seconds` : ''}. Alt+left and right move it, Alt+up merges it into the previous step, Enter sets its hold.`}
              onDragStart={(event) => {
                setDragFrom(index);
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', String(index));
              }}
              onDragOver={(event) => { event.preventDefault(); setDropAt(index); }}
              onDragLeave={() => setDropAt((current) => (current === index ? null : current))}
              onDrop={(event) => {
                event.preventDefault();
                const from = dragFrom ?? Number(event.dataTransfer.getData('text/plain'));
                setDragFrom(null);
                setDropAt(null);
                if (!Number.isInteger(from) || from === index) return;
                if (event.altKey || event.shiftKey) onMerge(from, index);
                else onReorder(from, index);
              }}
              onDragEnd={() => { setDragFrom(null); setDropAt(null); }}
              onClick={(event) => { holdAnchor.current = event.currentTarget; setHoldIndex(index); }}
              onKeyDown={(event) => {
                if (event.altKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
                  event.preventDefault();
                  onReorder(index, index + (event.key === 'ArrowLeft' ? -1 : 1));
                } else if (event.altKey && event.key === 'ArrowUp' && index > 0) {
                  event.preventDefault();
                  onMerge(index, index - 1);
                } else if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  holdAnchor.current = event.currentTarget;
                  setHoldIndex(index);
                }
              }}
            >
              <span className="ofk-motion-chip-index" aria-hidden="true">{index + 1}</span>
              <span className="ofk-motion-chip-label">{chipLabel(page, step)}</span>
            </button>
            {index < steps.length - 1 ? (
              <span className="ofk-motion-chip-gap" aria-hidden="true" onDragOver={(event) => event.preventDefault()} onDrop={() => { if (dragFrom !== null) { onReorder(dragFrom, index); setDragFrom(null); setDropAt(null); } }} />
            ) : null}
          </li>
        ))}
      </ol>
      <p className="ofk-caption">Drag to reorder, drop one onto another to merge, click for its hold. Every edit writes the <code>animate</code> block.</p>
      {holdStep ? (
        <Popover role="dialog" aria-label={`Step ${(holdIndex ?? 0) + 1} hold`} open anchorRef={holdAnchor} onClose={() => setHoldIndex(null)} placement="bottom-start">
          <PopoverHeader title={`Step ${(holdIndex ?? 0) + 1} hold`} close={<Button variant="quiet" onClick={() => setHoldIndex(null)}>Done</Button>} />
          <div className="ofk-v2-properties ofk-motion-hold">
            <NumberField
              label="Hold"
              data-autofocus
              value={Number(((holdStep.holdMs ?? 0) / 1000).toFixed(1))}
              min={0.2}
              max={120}
              step={0.5}
              unit="s"
              onChange={(value) => onHold(holdIndex ?? 0, Math.round(value * 1000))}
            />
            <div className="ofk-motion-hold-actions">
              <Button variant="quiet" onClick={() => onHold(holdIndex ?? 0, 1700)}>One beat</Button>
              <Button variant="quiet" onClick={() => onHold(holdIndex ?? 0, 2600)}>Note length</Button>
              <Button variant="quiet" onClick={() => onHold(holdIndex ?? 0, null)}>Default</Button>
            </div>
          </div>
        </Popover>
      ) : null}
    </div>
  );
}
