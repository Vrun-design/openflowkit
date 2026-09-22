import type { ArchFlow, ArchModel, FlowStep } from './types';

/**
 * Flow → text. A flow plays on the canvas; these projections let it leave as a
 * sequence diagram (our own family), Mermaid or PlantUML — IcePanel exports two
 * of the three, never back into an editable diagram.
 */

type Body = 'mermaid' | 'plantuml' | 'ofk';

interface Participant {
  readonly id: string;
  readonly name: string;
}

function participantOrder(model: ArchModel, flow: ArchFlow): readonly Participant[] {
  const seen = new Set<string>();
  const out: Participant[] = [];
  const visit = (steps: readonly FlowStep[]) => {
    for (const step of steps) {
      for (const id of [step.from, step.to]) {
        if (!id || seen.has(id)) continue;
        seen.add(id);
        out.push({ id, name: model.elements.find((element) => element.id === id)?.name ?? id });
      }
      for (const branch of step.branches ?? []) visit(branch.steps);
    }
  };
  visit(flow.steps);
  return out;
}

const labelOf = (step: FlowStep): string => step.label ?? (step.tech ? `[${step.tech}]` : '');
const nameOf = (model: ArchModel, id: string | undefined): string | undefined =>
  id ? model.elements.find((element) => element.id === id)?.name ?? id : undefined;

const arrow = (body: Body, from: string, to: string, label: string): string =>
  body === 'mermaid' ? `${from}->>${to}: ${label}` : `${from} -> ${to} : ${label}`;

const blockOpen = (body: Body, kind: 'alt' | 'par', label: string | undefined, indent: string): string =>
  `${indent}${kind}${label ? ` ${label}` : ''}${body === 'ofk' ? ' {' : ''}`;

const blockMiddle = (body: Body, kind: 'else' | 'and', label: string | undefined, indent: string): string =>
  body === 'ofk'
    ? `${indent}} ${kind}${label ? ` ${label}` : ''} {`
    : `${indent}${kind}${label ? ` ${label}` : ''}`;

const blockClose = (body: Body, indent: string): string => body === 'ofk' ? `${indent}}` : `${indent}end`;

const note = (body: Body, over: string, text: string): string =>
  body === 'mermaid' ? `Note over ${over}: ${text}` : `note over ${over} : ${text}`;

interface Cursor {
  /** Last participant a message touched; notes and process steps land on it. */
  last?: string;
}

function renderSteps(
  model: ArchModel,
  steps: readonly FlowStep[],
  body: Body,
  indent: string,
  participants: readonly Participant[],
  cursor: Cursor = {},
): string[] {
  const first = participants[0]?.name ?? 'System';
  const lines: string[] = [];
  const over = () => cursor.last ?? first;
  for (const step of steps) {
    const from = nameOf(model, step.from);
    const to = nameOf(model, step.to);
    switch (step.kind) {
      case 'message':
        if (from && to) {
          lines.push(`${indent}${arrow(body, from, to, labelOf(step))}`);
          cursor.last = to;
        }
        break;
      case 'process':
        if (from) {
          lines.push(`${indent}${arrow(body, from, from, labelOf(step) || 'process')}`);
          cursor.last = from;
        } else {
          lines.push(`${indent}${arrow(body, over(), over(), labelOf(step) || 'process')}`);
        }
        break;
      case 'alternate':
      case 'parallel': {
        const kind = step.kind === 'alternate' ? 'alt' : 'par';
        const middle = step.kind === 'alternate' ? 'else' : 'and';
        const branches = step.branches ?? [];
        lines.push(blockOpen(body, kind, step.label, indent));
        lines.push(...renderSteps(model, branches[0]?.steps ?? [], body, `${indent}  `, participants, { ...cursor }));
        for (const branch of branches.slice(1)) {
          lines.push(blockMiddle(body, middle, branch.label, indent));
          lines.push(...renderSteps(model, branch.steps, body, `${indent}  `, participants, { ...cursor }));
        }
        lines.push(blockClose(body, indent));
        break;
      }
      case 'goto':
        lines.push(`${indent}${note(body, over(), `goto ${step.goto ?? ''}`.trim())}`);
        break;
      case 'intro':
        lines.push(`${indent}${note(body, first, labelOf(step) || 'intro')}`);
        break;
      case 'conclusion':
        lines.push(`${indent}${note(body, over(), labelOf(step) || 'conclusion')}`);
        break;
      default:
        lines.push(`${indent}${note(body, from ?? over(), labelOf(step))}`);
    }
  }
  return lines;
}

function plantUmlBody(model: ArchModel, flow: ArchFlow, participants: readonly Participant[]): string[] {
  return renderSteps(model, flow.steps, 'plantuml', '', participants);
}

export function flowToSequenceDsl(flow: ArchFlow, model: ArchModel): string {
  const participants = participantOrder(model, flow);
  return [
    '%% ofk 1',
    'sequence',
    `title: ${flow.name}`,
    'autonumber',
    ...participants.map((participant) => `participant ${participant.name}`),
    ...renderSteps(model, flow.steps, 'ofk', '', participants),
  ].join('\n') + '\n';
}

export function flowToMermaid(flow: ArchFlow, model: ArchModel): string {
  const participants = participantOrder(model, flow);
  return [
    'sequenceDiagram',
    '  autonumber',
    ...participants.map((participant) => `  participant ${participant.name}`),
    ...renderSteps(model, flow.steps, 'mermaid', '  ', participants),
  ].join('\n') + '\n';
}

export function flowToPlantUml(flow: ArchFlow, model: ArchModel): string {
  const participants = participantOrder(model, flow);
  return [
    '@startuml',
    `title ${flow.name}`,
    'autonumber',
    ...participants.map((participant) => `participant ${participant.name}`),
    ...plantUmlBody(model, flow, participants),
    '@enduml',
  ].join('\n') + '\n';
}
