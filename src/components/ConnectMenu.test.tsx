import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConnectMenu } from './ConnectMenu';

const mockStoreState: { nodes: Array<{ id: string; data: Record<string, unknown> }> } = {
  nodes: [
    {
      id: 'asset-1',
      data: {
        label: 'Analytics Athena',
        assetPresentation: 'icon',
        assetProvider: 'aws',
        assetCategory: 'Analytics',
        archIconPackId: 'aws-official-starter-v1',
        archIconShapeId: 'analytics-athena',
      },
    },
  ],
};

vi.mock('@/store', () => ({
  useFlowStore: (selector: (state: { nodes: Array<{ id: string; data: Record<string, unknown> }> }) => unknown) => selector(mockStoreState),
}));

vi.mock('@/services/shapeLibrary/providerCatalog', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/shapeLibrary/providerCatalog')>();
  return {
    ...actual,
    loadProviderShapePreview: vi.fn(async () => ({
      previewUrl: '/mock/glue.svg',
    })),
  };
});

vi.mock('@/services/assetCatalog', () => ({
  loadDomainAssetSuggestions: vi.fn(async () => [
    {
      id: 'aws-official-starter-v1:analytics-glue',
      category: 'aws',
      label: 'Analytics Glue',
      description: 'AWS Analytics',
      icon: 'Box',
      color: 'amber',
      nodeType: 'custom',
      assetPresentation: 'icon',
      providerShapeCategory: 'Analytics',
      archIconPackId: 'aws-official-starter-v1',
      archIconShapeId: 'analytics-glue',
    },
  ]),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
  }),
}));

describe('ConnectMenu', () => {
  it('shows only topic creation for mindmap sources', () => {
    render(
      <ConnectMenu
        position={{ x: 100, y: 100 }}
        sourceId="mind-1"
        sourceType="mindmap"
        onSelect={vi.fn()}
        onSelectAsset={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('Topic')).toBeTruthy();
    expect(screen.queryByText('connectMenu.process')).toBeNull();
  });

  it('calls onSelect with mindmap when choosing a topic from a mindmap source', () => {
    const onSelect = vi.fn();
    render(
      <ConnectMenu
        position={{ x: 100, y: 100 }}
        sourceId="mind-1"
        sourceType="mindmap"
        onSelect={onSelect}
        onSelectAsset={vi.fn()}
        onClose={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Topic'));

    expect(onSelect).toHaveBeenCalledWith('mindmap', undefined, undefined);
  });

  it('shows provider suggestions for asset nodes instead of generic shapes', async () => {
    mockStoreState.nodes = [
      {
        id: 'asset-1',
        data: {
          label: 'Analytics Athena',
          assetPresentation: 'icon',
          assetProvider: 'aws',
          assetCategory: 'Analytics',
          archIconPackId: 'aws-official-starter-v1',
          archIconShapeId: 'analytics-athena',
        },
      },
    ];

    render(
      <ConnectMenu
        position={{ x: 100, y: 100 }}
        sourceId="asset-1"
        sourceType="custom"
        onSelect={vi.fn()}
        onSelectAsset={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(await screen.findByRole('menuitem', { name: /Analytics Glue/i })).toBeTruthy();
    expect(screen.queryByText('connectMenu.process')).toBeNull();
  });

  it('derives asset provider from pack metadata for older icon nodes', async () => {
    mockStoreState.nodes = [
      {
        id: 'asset-legacy',
        data: {
          label: 'Lambda',
          assetPresentation: 'icon',
          archIconPackId: 'aws-official-starter-v1',
          archIconShapeId: 'compute-lambda',
        },
      },
    ];

    render(
      <ConnectMenu
        position={{ x: 100, y: 100 }}
        sourceId="asset-legacy"
        sourceType="custom"
        onSelect={vi.fn()}
        onSelectAsset={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(await screen.findByRole('menuitem', { name: /Analytics Glue/i })).toBeTruthy();
  });

  it('surfaces contextual class creation first for class connectors', () => {
    const onSelect = vi.fn();
    render(
      <ConnectMenu
        position={{ x: 100, y: 100 }}
        sourceId="class-1"
        sourceType="class"
        onSelect={onSelect}
        onSelectAsset={vi.fn()}
        onClose={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Class Node'));

    expect(onSelect).toHaveBeenCalledWith('class', undefined, undefined);
  });

  it('passes yes-branch edge metadata for decision sources', () => {
    const onSelect = vi.fn();
    render(
      <ConnectMenu
        position={{ x: 100, y: 100 }}
        sourceId="decision-1"
        sourceType="decision"
        onSelect={onSelect}
        onSelectAsset={vi.fn()}
        onClose={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Yes Branch'));

    expect(onSelect).toHaveBeenCalledWith('process', undefined, {
      label: 'Yes',
      data: { condition: 'yes' },
    });
  });

  it('exposes a keyboard-navigable menu and closes on escape', () => {
    const onClose = vi.fn();

    render(
      <ConnectMenu
        position={{ x: 100, y: 100 }}
        sourceId="decision-1"
        sourceType="decision"
        onSelect={vi.fn()}
        onSelectAsset={vi.fn()}
        onClose={onClose}
      />
    );

    const menu = screen.getByRole('menu', { name: 'Connect node menu' });
    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    fireEvent.keyDown(menu, { key: 'Escape' });

    expect(onClose).toHaveBeenCalled();
  });
});
