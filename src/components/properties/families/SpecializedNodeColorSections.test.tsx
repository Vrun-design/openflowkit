import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ClassDiagramNodeProperties } from './ClassDiagramNodeProperties';
import { ERDiagramNodeProperties } from './ERDiagramNodeProperties';
import { JourneyNodeProperties } from './JourneyNodeProperties';
import { SequenceNodeProperties } from './SequenceNodeProperties';

const baseHandlers = {
  onChange: vi.fn(),
  onDuplicate: vi.fn(),
  onDelete: vi.fn(),
  onGenerateEntityFields: vi.fn(),
  onConvertEntitySelectionToClassDiagram: vi.fn(),
  onOpenMermaidCodeEditor: vi.fn(),
};

function expectSharedColorSection(title: string): void {
  fireEvent.click(screen.getByRole('button', { name: title }));
  expect(screen.getByRole('button', { name: 'Custom' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Filled' })).toBeTruthy();
}

describe('specialized node property panels', () => {
  it('shows the shared color section for journey nodes', () => {
    render(
      <JourneyNodeProperties
        selectedNode={{
          id: 'journey-1',
          type: 'journey',
          position: { x: 0, y: 0 },
          data: { label: 'Checkout', subLabel: 'Customer' },
        }}
        {...baseHandlers}
      />
    );

    expectSharedColorSection('Color');
  });

  it('shows the shared color section for sequence participants', () => {
    render(
      <SequenceNodeProperties
        selectedNode={{
          id: 'seq-1',
          type: 'sequence_participant',
          position: { x: 0, y: 0 },
          data: { label: 'API' },
        }}
        {...baseHandlers}
      />
    );

    expectSharedColorSection('Color');
  });

  it('shows the shared color section for class nodes', () => {
    render(
      <ClassDiagramNodeProperties
        selectedNode={{
          id: 'class-1',
          type: 'class',
          position: { x: 0, y: 0 },
          data: { label: 'User', classAttributes: [], classMethods: [] },
        }}
        {...baseHandlers}
      />
    );

    expectSharedColorSection('Color');
  });

  it('shows the shared color section for ER nodes', () => {
    render(
      <ERDiagramNodeProperties
        selectedNode={{
          id: 'entity-1',
          type: 'er_entity',
          position: { x: 0, y: 0 },
          data: { label: 'Orders', erFields: [] },
        }}
        {...baseHandlers}
      />
    );

    expectSharedColorSection('Color');
  });
});
