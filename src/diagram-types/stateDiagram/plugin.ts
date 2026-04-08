import { parseMermaid } from '@/lib/mermaidParser';
import type { DiagramPlugin } from '@/diagram-types/core';
import type { FlowNode } from '@/lib/types';
import { setNodeParent } from '@/lib/nodeParent';
import { createId } from '@/lib/id';

interface StateNoteRecord {
  id: string;
  target: string;
  text: string;
  position: 'left' | 'right' | 'over';
}

interface StateControlRecord {
  id: string;
  label: string;
  kind: 'fork' | 'join';
}

function normalizeStateTransitionLabels(input: string): string {
  const lines = input.replace(/\r\n/g, '\n').split('\n');
  const normalized = lines.map((rawLine) => {
    const line = rawLine.trim();
    if (line.includes('|')) return rawLine;
    const transitionMatch = line.match(/^(.+?)\s+(<-->|<--|-->|==>|-.->)\s+(.+?)\s*:\s*(.+)$/);
    if (!transitionMatch) return rawLine;

    const source = transitionMatch[1].trim();
    const arrow = transitionMatch[2];
    const target = transitionMatch[3].trim();
    const label = transitionMatch[4].trim();
    if (!source || !target || !label) return rawLine;
    return `  ${source} ${arrow}|${label}| ${target}`;
  });

  return normalized.join('\n');
}

function collectStateDiagramDiagnostics(input: string): { diagnostics: string[]; direction?: 'TB' | 'LR' } {
  const diagnostics: string[] = [];
  const lines = input.replace(/\r\n/g, '\n').split('\n');
  let hasHeader = false;
  let compositeDepth = 0;
  let direction: 'TB' | 'LR' | undefined;

  for (const [index, rawLine] of lines.entries()) {
    const lineNumber = index + 1;
    const line = rawLine.trim();
    if (!line || line.startsWith('%%')) continue;

    if (/^stateDiagram(?:-v2)?\b/i.test(line)) {
      hasHeader = true;
      continue;
    }
    if (!hasHeader) continue;

    if (/^direction\b/i.test(line)) {
      const directionMatch = line.match(/^direction\s+(LR|TB)\s*$/i);
      if (!directionMatch) {
        diagnostics.push(`Invalid stateDiagram direction syntax at line ${lineNumber}: "${line}"`);
        continue;
      }
      direction = directionMatch[1].toUpperCase() as 'TB' | 'LR';
      continue;
    }

    if (/^note\b/i.test(line)) {
      const noteMatch = line.match(/^note\s+(left of|right of|over)\s+\S+\s*:\s*.+$/i);
      if (!noteMatch) {
        diagnostics.push(`Invalid stateDiagram note syntax at line ${lineNumber}: "${line}"`);
      }
      continue;
    }

    if (/^state\s+.+\{\s*$/i.test(line)) {
      compositeDepth += 1;
      continue;
    }

    if (/^}\s*$/.test(line) || /^end\s*$/i.test(line)) {
      if (compositeDepth === 0) {
        diagnostics.push(`Unexpected stateDiagram composite block closer at line ${lineNumber}: "${line}"`);
      } else {
        compositeDepth -= 1;
      }
      continue;
    }

    if (/\s->\s/.test(line)) {
      diagnostics.push(`Invalid stateDiagram transition syntax at line ${lineNumber}: "${line}"`);
    }
  }

  if (compositeDepth > 0) {
    diagnostics.push(`Unclosed stateDiagram composite block detected (${compositeDepth} block(s) not closed).`);
  }

  return { diagnostics, direction };
}

function parseStateDiagram(input: string) {
  const { diagnostics, direction } = collectStateDiagramDiagnostics(input);
  const normalizedInput = normalizeStateTransitionLabels(input);
  const parsed = parseMermaid(normalizedInput);
  const withCompositeParents = applyCompositeStateParenting(parsed.nodes as FlowNode[], input);
  const notes = parseStateDiagramNotes(input, withCompositeParents);
  const controls = parseStateDiagramControls(input);
  parsed.nodes = applyStateDiagramEnhancements(withCompositeParents, notes, controls);
  parsed.edges = [
    ...parsed.edges,
    ...notes.map((note) => ({
      id: createId(`e-state-note-${note.id}-${note.target}`),
      source: note.id,
      target: note.target,
      type: 'straight',
      data: {
        dashPattern: 'dashed' as const,
      },
    })),
  ];
  if (direction) {
    parsed.direction = direction;
  }
  if (diagnostics.length === 0) {
    return parsed;
  }
  return {
    ...parsed,
    diagnostics,
  };
}

function applyCompositeStateParenting(nodes: FlowNode[], input: string): FlowNode[] {
  const nextNodes = [...nodes];
  const nodeIndexById = new Map(nextNodes.map((node, index) => [node.id, index]));
  const compositeStack: string[] = [];

  const lines = input.replace(/\r\n/g, '\n').split('\n');
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('%%')) {
      continue;
    }

    const compositeMatch = line.match(/^state\s+("?)([^"{]+)\1\s*\{$/i);
    if (compositeMatch) {
      const parentId = compositeMatch[2].trim();
      compositeStack.push(parentId);

      if (!nodeIndexById.has(parentId)) {
        nodeIndexById.set(parentId, nextNodes.length);
        nextNodes.push({
          id: parentId,
          type: 'state',
          position: { x: 0, y: 0 },
          data: { label: parentId },
        } as FlowNode);
      }
      continue;
    }

    if (/^}\s*$/.test(line) || /^end\s*$/i.test(line)) {
      compositeStack.pop();
      continue;
    }

    const activeParentId = compositeStack[compositeStack.length - 1];
    if (!activeParentId) {
      continue;
    }

    const transitionMatch = line.match(/^(.+?)\s+(<-->|<--|-->|==>|-.->)\s+(.+?)(?:\s*:\s*(.+))?$/);
    if (!transitionMatch) {
      continue;
    }

    const stateIds = [transitionMatch[1].trim(), transitionMatch[3].trim()].filter(
      (value) => value !== '[*]'
    );

    for (const stateId of stateIds) {
      const nodeIndex = nodeIndexById.get(stateId);
      if (typeof nodeIndex !== 'number') {
        continue;
      }
      nextNodes[nodeIndex] = setNodeParent(nextNodes[nodeIndex], activeParentId);
    }
  }

  return nextNodes;
}

function parseStateDiagramNotes(input: string, nodes: FlowNode[]): StateNoteRecord[] {
  const knownNodeIds = new Set(nodes.map((node) => node.id));
  const notes: StateNoteRecord[] = [];

  input
    .replace(/\r\n/g, '\n')
    .split('\n')
    .forEach((rawLine, index) => {
      const line = rawLine.trim();
      const match = line.match(/^note\s+(left of|right of|over)\s+(\S+)\s*:\s*(.+)$/i);
      if (!match || !knownNodeIds.has(match[2])) {
        return;
      }

      notes.push({
        id: `state-note-${index + 1}`,
        target: match[2],
        text: match[3].trim(),
        position: match[1].toLowerCase().replace(' of', '') as StateNoteRecord['position'],
      });
    });

  return notes;
}

function parseStateDiagramControls(input: string): StateControlRecord[] {
  const controls: StateControlRecord[] = [];

  input
    .replace(/\r\n/g, '\n')
    .split('\n')
    .forEach((rawLine) => {
      const line = rawLine.trim();
      const aliasMatch = line.match(
        /^state\s+"([^"]+)"\s+as\s+([A-Za-z_][\w.-]*)\s+<<(fork|join)>>\s*$/i
      );
      if (aliasMatch) {
        controls.push({
          id: aliasMatch[2],
          label: aliasMatch[1],
          kind: aliasMatch[3].toLowerCase() as StateControlRecord['kind'],
        });
        return;
      }

      const simpleMatch = line.match(/^state\s+([A-Za-z_][\w.-]*)\s+<<(fork|join)>>\s*$/i);
      if (simpleMatch) {
        controls.push({
          id: simpleMatch[1],
          label: simpleMatch[2].toLowerCase() === 'fork' ? 'Fork' : 'Join',
          kind: simpleMatch[2].toLowerCase() as StateControlRecord['kind'],
        });
      }
    });

  return controls;
}

function applyStateDiagramEnhancements(
  nodes: FlowNode[],
  notes: StateNoteRecord[],
  controls: StateControlRecord[]
): FlowNode[] {
  const nextNodes = [...nodes];
  const nodeIndexById = new Map(nextNodes.map((node, index) => [node.id, index]));

  controls.forEach((control) => {
    const existingIndex = nodeIndexById.get(control.id);
    const baseData = {
      label: control.label,
      color: control.kind === 'fork' ? 'slate' : 'blue',
      shape: 'rectangle' as const,
      width: 120,
      height: 52,
      stateControlKind: control.kind,
    };

    if (typeof existingIndex === 'number') {
      nextNodes[existingIndex] = {
        ...nextNodes[existingIndex],
        type: 'process',
        data: {
          ...nextNodes[existingIndex].data,
          ...baseData,
        },
      };
      return;
    }

    nodeIndexById.set(control.id, nextNodes.length);
    nextNodes.push({
      id: control.id,
      type: 'process',
      position: { x: 0, y: 0 },
      data: baseData,
    } as FlowNode);
  });

  notes.forEach((note) => {
    const targetNode = nextNodes.find((node) => node.id === note.target);
    const offsetX = note.position === 'left' ? -220 : note.position === 'right' ? 220 : 0;
    const offsetY = note.position === 'over' ? -90 : 0;
    nextNodes.push({
      id: note.id,
      type: 'annotation',
      position: {
        x: (targetNode?.position.x ?? 0) + offsetX,
        y: (targetNode?.position.y ?? 0) + offsetY,
      },
      data: {
        label: note.text,
        color: 'yellow',
        stateNotePosition: note.position,
        stateNoteTarget: note.target,
      },
    } as FlowNode);
  });

  return nextNodes;
}

export const STATE_DIAGRAM_PLUGIN: DiagramPlugin = {
  id: 'stateDiagram',
  displayName: 'State Diagram',
  parseMermaid: parseStateDiagram,
};
