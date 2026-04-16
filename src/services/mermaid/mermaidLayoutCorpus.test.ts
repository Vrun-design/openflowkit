import { describe, expect, it } from 'vitest';
import { composeDiagramForDisplay } from '@/services/composeDiagramForDisplay';
import { parseMermaidByType } from './parseMermaidByType';
import type { MermaidImportStatus } from './importContracts';
import { MERMAID_COMPAT_FIXTURES } from '../../../scripts/mermaid-compat-fixtures.mjs';

interface MermaidLayoutFixture {
  name: string;
  source: string;
  expectedImportState: MermaidImportStatus;
  layoutAssertions?: {
    maxBoundingWidth?: number;
    maxBoundingHeight?: number;
    requireUniquePositions?: boolean;
    minSections?: number;
    minParticipants?: number;
    requireSequenceLaneAlignment?: boolean;
    requireNotesBelowParticipants?: boolean;
    orderedLabelsLeftToRight?: string[];
    orderedLabelsTopToBottom?: string[];
    sameRowLabels?: string[];
    sameColumnLabels?: string[];
    verticalFlowLabels?: string[];
    horizontalFlowLabels?: string[];
  };
}

function getBounds(nodes: Array<{ position: { x: number; y: number } }>): {
  width: number;
  height: number;
} {
  if (nodes.length === 0) {
    return { width: 0, height: 0 };
  }

  const xs = nodes.map((node) => node.position.x);
  const ys = nodes.map((node) => node.position.y);
  return {
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  };
}

function findNodeByLabel(
  nodes: Array<{ data?: { label?: unknown }; position: { x: number; y: number } }>,
  label: string
): { position: { x: number; y: number } } | undefined {
  return nodes.find((node) => String(node.data?.label ?? '').includes(label));
}

function expectLabelsPresent(
  nodes: Array<{ data?: { label?: unknown }; position: { x: number; y: number } }>,
  labels: string[],
  fixtureName: string,
  direction: 'row' | 'column'
): Array<{ position: { x: number; y: number } }> {
  return labels.map((label) => {
    const node = findNodeByLabel(nodes, label);
    expect(
      node,
      `${fixtureName} should include label "${label}" for ${direction} alignment`
    ).toBeDefined();
    return node!;
  });
}

describe('Mermaid layout corpus invariants', () => {
  it(
    'keeps representative imported diagrams compact and structurally clear',
    async () => {
      const fixtures = (MERMAID_COMPAT_FIXTURES as MermaidLayoutFixture[]).filter(
        (fixture) => fixture.layoutAssertions
      );

    for (const fixture of fixtures) {
      const parsed = parseMermaidByType(fixture.source);
      expect(parsed.importState, fixture.name).toBe(fixture.expectedImportState);
      expect(parsed.error, fixture.name).toBeUndefined();

      const layouted = await composeDiagramForDisplay(parsed.nodes, parsed.edges, {
        direction: parsed.direction ?? 'TB',
        spacing: 'compact',
        diagramType: parsed.diagramType,
        source: 'import',
      });

      const visibleNodes = layouted.nodes.filter((node) => !node.hidden);
      const bounds = getBounds(visibleNodes);
      const assertions = fixture.layoutAssertions!;

      if (typeof assertions.maxBoundingWidth === 'number') {
        expect(bounds.width, fixture.name).toBeLessThanOrEqual(assertions.maxBoundingWidth);
      }
      if (typeof assertions.maxBoundingHeight === 'number') {
        expect(bounds.height, fixture.name).toBeLessThanOrEqual(assertions.maxBoundingHeight);
      }
      if (assertions.requireUniquePositions) {
        const uniquePositions = new Set(
          visibleNodes.map((node) => `${Math.round(node.position.x)}:${Math.round(node.position.y)}`)
        );
        expect(uniquePositions.size, fixture.name).toBeGreaterThan(1);
      }
      if (typeof assertions.minSections === 'number') {
        expect(
          layouted.nodes.filter((node) => node.type === 'section').length,
          fixture.name
        ).toBeGreaterThanOrEqual(assertions.minSections);
      }
      if (typeof assertions.minParticipants === 'number') {
        const participants = layouted.nodes.filter((node) => node.type === 'sequence_participant');
        expect(participants.length, fixture.name).toBeGreaterThanOrEqual(assertions.minParticipants);

        if (assertions.requireSequenceLaneAlignment) {
          const yValues = new Set(participants.map((node) => Math.round(node.position.y)));
          expect(yValues.size, fixture.name).toBeLessThanOrEqual(2);
          const xValues = participants.map((node) => node.position.x);
          expect([...xValues].sort((a, b) => a - b), fixture.name).toEqual(xValues);
        }
      }
      if (assertions.requireNotesBelowParticipants) {
        const participants = layouted.nodes.filter((node) => node.type === 'sequence_participant');
        const notes = layouted.nodes.filter((node) => node.type === 'sequence_note');
        const participantBottom = Math.max(...participants.map((node) => node.position.y));
        expect(notes.length, fixture.name).toBeGreaterThan(0);
        expect(notes.every((node) => node.position.y >= participantBottom), fixture.name).toBe(true);
      }
      if (Array.isArray(assertions.orderedLabelsLeftToRight)) {
        const orderedNodes = assertions.orderedLabelsLeftToRight.map((label) => {
          const node = findNodeByLabel(visibleNodes, label);
          expect(node, `${fixture.name} should include label "${label}" for left-to-right order`).toBeDefined();
          return node!;
        });
        for (let index = 1; index < orderedNodes.length; index += 1) {
          expect(
            orderedNodes[index - 1].position.x,
            `${fixture.name} should keep "${assertions.orderedLabelsLeftToRight[index - 1]}" left of "${assertions.orderedLabelsLeftToRight[index]}"`
          ).toBeLessThanOrEqual(orderedNodes[index].position.x);
        }
      }
      if (Array.isArray(assertions.orderedLabelsTopToBottom)) {
        const orderedNodes = expectLabelsPresent(
          visibleNodes,
          assertions.orderedLabelsTopToBottom,
          fixture.name,
          'column'
        );
        for (let index = 1; index < orderedNodes.length; index += 1) {
          expect(
            orderedNodes[index - 1].position.y,
            `${fixture.name} should keep "${assertions.orderedLabelsTopToBottom[index - 1]}" above "${assertions.orderedLabelsTopToBottom[index]}"`
          ).toBeLessThanOrEqual(orderedNodes[index].position.y);
        }
      }
      if (Array.isArray(assertions.sameRowLabels)) {
        const alignedNodes = expectLabelsPresent(
          visibleNodes,
          assertions.sameRowLabels,
          fixture.name,
          'row'
        );
        const referenceY = Math.round(alignedNodes[0].position.y);
        expect(
          alignedNodes.every((node) => Math.abs(Math.round(node.position.y) - referenceY) <= 8),
          `${fixture.name} should keep ${assertions.sameRowLabels.join(', ')} on the same row`
        ).toBe(true);
      }
      if (Array.isArray(assertions.sameColumnLabels)) {
        const alignedNodes = expectLabelsPresent(
          visibleNodes,
          assertions.sameColumnLabels,
          fixture.name,
          'column'
        );
        const referenceX = Math.round(alignedNodes[0].position.x);
        expect(
          alignedNodes.every((node) => Math.abs(Math.round(node.position.x) - referenceX) <= 8),
          `${fixture.name} should keep ${assertions.sameColumnLabels.join(', ')} in the same column`
        ).toBe(true);
      }
      if (Array.isArray(assertions.verticalFlowLabels)) {
        const orderedNodes = expectLabelsPresent(
          visibleNodes,
          assertions.verticalFlowLabels,
          fixture.name,
          'column'
        );
        for (let index = 1; index < orderedNodes.length; index += 1) {
          const deltaX = Math.abs(orderedNodes[index].position.x - orderedNodes[index - 1].position.x);
          const deltaY = orderedNodes[index].position.y - orderedNodes[index - 1].position.y;
          expect(
            deltaY,
            `${fixture.name} should keep "${assertions.verticalFlowLabels[index]}" below "${assertions.verticalFlowLabels[index - 1]}"`
          ).toBeGreaterThanOrEqual(0);
          expect(
            Math.abs(deltaY),
            `${fixture.name} should move more vertically than horizontally between "${assertions.verticalFlowLabels[index - 1]}" and "${assertions.verticalFlowLabels[index]}"`
          ).toBeGreaterThanOrEqual(deltaX);
        }
      }
      if (Array.isArray(assertions.horizontalFlowLabels)) {
        const orderedNodes = expectLabelsPresent(
          visibleNodes,
          assertions.horizontalFlowLabels,
          fixture.name,
          'row'
        );
        for (let index = 1; index < orderedNodes.length; index += 1) {
          const deltaX = orderedNodes[index].position.x - orderedNodes[index - 1].position.x;
          const deltaY = Math.abs(orderedNodes[index].position.y - orderedNodes[index - 1].position.y);
          expect(
            deltaX,
            `${fixture.name} should keep "${assertions.horizontalFlowLabels[index]}" right of "${assertions.horizontalFlowLabels[index - 1]}"`
          ).toBeGreaterThanOrEqual(0);
          expect(
            Math.abs(deltaX),
            `${fixture.name} should move more horizontally than vertically between "${assertions.horizontalFlowLabels[index - 1]}" and "${assertions.horizontalFlowLabels[index]}"`
          ).toBeGreaterThanOrEqual(deltaY);
        }
      }
    }
    },
    60_000
  );
});
