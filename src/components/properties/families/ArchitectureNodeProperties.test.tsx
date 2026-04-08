import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useFlowStore } from '@/store';
import { ArchitectureNodeProperties } from './ArchitectureNodeProperties';

vi.mock('@/services/shapeLibrary/providerCatalog', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/shapeLibrary/providerCatalog')>();

  return {
    ...actual,
    loadProviderCatalog: vi.fn().mockImplementation(() => new Promise(() => {})),
    loadProviderShapePreview: vi.fn().mockResolvedValue(null),
    listProviderCatalogProviders: vi.fn().mockReturnValue([]),
  };
});

const baseHandlers = {
  onChange: vi.fn(),
  onDuplicate: vi.fn(),
  onDelete: vi.fn(),
  onAddArchitectureService: vi.fn(),
  onCreateArchitectureBoundary: vi.fn(),
  onApplyArchitectureTemplate: vi.fn(),
  onSuggestArchitectureNode: vi.fn(),
};

function createSelectedNode() {
  return {
    id: 'arch-1',
    type: 'architecture',
    position: { x: 0, y: 0 },
    data: {
      label: 'API',
      archProvider: 'aws',
      archEnvironment: 'production',
      archResourceType: 'service',
      archBoundaryId: '',
    },
  } as const;
}

describe('ArchitectureNodeProperties', () => {
  beforeEach(() => {
    useFlowStore.setState({
      nodes: [
        createSelectedNode() as never,
        {
          id: 'section-1',
          type: 'section',
          position: { x: 0, y: 0 },
          data: { label: 'Public Edge' },
        } as never,
      ],
      edges: [],
    });
  });

  it('removes AI/template shortcuts from the default service editor', () => {
    render(
      <ArchitectureNodeProperties
        selectedNode={createSelectedNode()}
        {...baseHandlers}
      />
    );

    expect(screen.queryByText('Suggest with AI')).toBeNull();
    expect(screen.queryByText('Starter Layouts')).toBeNull();
  });

  it('uses custom inspector selects instead of native selects', () => {
    const { container } = render(
      <ArchitectureNodeProperties
        selectedNode={createSelectedNode()}
        {...baseHandlers}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Deployment' }));

    expect(container.querySelector('select')).toBeNull();
    expect(screen.getByText('Production')).toBeTruthy();
    expect(screen.getAllByText('Service').length).toBeGreaterThan(0);
    expect(screen.queryByText('Boundary')).toBeNull();
    expect(screen.queryByText('Add Connected Service')).toBeNull();
    expect(screen.queryByText('Create Boundary Around Node')).toBeNull();
  });

  it('shows editable custom provider controls instead of a disabled library', () => {
    render(
      <ArchitectureNodeProperties
        selectedNode={{
          ...createSelectedNode(),
          data: {
            ...createSelectedNode().data,
            archProvider: 'custom',
            archProviderLabel: 'Hetzner',
          },
        }}
        {...baseHandlers}
      />
    );

    expect(screen.getByDisplayValue('Hetzner')).toBeTruthy();
    expect(screen.getByText('Add provider icon')).toBeTruthy();
    expect(screen.queryByPlaceholderText('Select a provider to search')).toBeNull();
  });
});
