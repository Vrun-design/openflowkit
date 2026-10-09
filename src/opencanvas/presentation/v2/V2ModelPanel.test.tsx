import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { compile } from '@/dsl/compile';
import { dslFrameRaw } from '@/dsl/sceneMeta';
import { archModelFromJson, createArchIndex } from '@/dsl/model/model';
import type { ArchModel } from '@/dsl/model/types';
import { ElementLinks, RelationNote } from './V2ModelElementCard';
import { V2ModelPanel, type V2ModelPanelProps } from './V2ModelPanel';
import type { V2Architecture } from './useV2Architecture';

const relation = (link: string) => ({ label: 'Reads', link });

describe('RelationNote', () => {
  it('links an https evidence URL, opened safely in a new tab', () => {
    render(<RelationNote relation={relation('https://github.com/acme/shop/blob/main/web/app.ts#L3')} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'https://github.com/acme/shop/blob/main/web/app.ts#L3');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it.each(['javascript:alert(1)', 'data:text/html,x', 'http://example.com', ' https://x.com', 'web/app.ts:3', '//evil.com'])('shows %s as plain text, never a link', (value) => {
    render(<RelationNote relation={relation(value)} />);
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText(value, { exact: false })).toBeInTheDocument();
  });
});

describe('ElementLinks', () => {
  it('renders an https link as an anchor and anything else as plain text', () => {
    render(<ElementLinks links={['https://example.com/adr/1.md', 'javascript:alert(1)']} />);
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://example.com/adr/1.md');
    expect(screen.getByText('javascript:alert(1)')).toBeInTheDocument();
  });

  it('renders no anchor for a javascript: link', () => {
    render(<ElementLinks links={['javascript:alert(1)']} />);
    expect(screen.queryByRole('link')).toBeNull();
  });
});

describe('RelationNote on a parsed relation', () => {
  it('shows the anchor for a link written in the DSL', async () => {
    const text = 'architecture\nmodel {\n  system A\n  system B\n  A -> B : uses [link: https://github.com/x/y/blob/HEAD/f#L1]\n}\nviews { view landscape }\n';
    const model = archModelFromJson((dslFrameRaw((await compile(text)).frame).arch as { model: unknown }).model)!;
    render(<RelationNote relation={model.relations[0]!} />);
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://github.com/x/y/blob/HEAD/f#L1');
  });
});

describe('V2ModelPanel outline and card', () => {
  const el = (id: string, name: string, kind: string, parent: string | null = null, tech?: string) => ({ id, name, kind, parent, tech, tags: [], links: [] });
  const model = {
    elements: [el('shop', 'Shop', 'system'), el('shop.api', 'API', 'container', 'shop', 'Go'), el('shop.db', 'DB', 'store', 'shop')],
    relations: [{ id: 'r1', from: 'shop.api', to: 'shop.db', label: 'stores orders', tags: [] }],
    views: [], flows: [],
  } as unknown as ArchModel;
  const architecture = { model, index: createArchIndex(model), view: null, breadcrumb: [], parent: null, childViewOf: () => null } as unknown as V2Architecture;
  const props = (over: Partial<V2ModelPanelProps> = {}): V2ModelPanelProps => ({
    architecture, elementPageIds: new Map(), selectedElementId: null, placedElementIds: new Set(['shop', 'shop.api', 'shop.db']),
    perspectiveTags: [], onPerspectiveChange: vi.fn(), onNavigate: vi.fn(), onSelectElement: vi.fn(), onCreateChildView: vi.fn(),
    onDrillInto: vi.fn(), onEditElement: vi.fn(), onRemoveElement: vi.fn(), onAddElement: vi.fn(), onCreateFlow: vi.fn(),
    onPlayFlow: vi.fn(), onClose: vi.fn(), onOpenCode: vi.fn(), onCreateWorkspace: vi.fn(), onClearSelection: vi.fn(), readOnly: false, ...over,
  });

  it('opens an element from the outline on click and returns with All elements, clearing the selection', () => {
    const p = props();
    render(<V2ModelPanel {...p} />);
    expect(screen.getByRole('tree', { name: 'Model elements' })).toBeInTheDocument();
    expect(screen.getByText('3 elements · 1 relationship')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('treeitem', { name: /API/ }));
    expect(p.onSelectElement).toHaveBeenCalledWith('shop.api');
    expect(screen.getByLabelText('Name')).toHaveValue('API');
    expect(screen.queryByRole('tree')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'All elements' }));
    expect(p.onClearSelection).toHaveBeenCalled();
    expect(screen.getByRole('tree', { name: 'Model elements' })).toBeInTheDocument();
  });

  it('a later selection from the canvas does not pull focus into the panel, and an empty canvas click returns to the outline', () => {
    const p = props();
    const { rerender } = render(<V2ModelPanel {...p} />);
    fireEvent.click(screen.getByRole('treeitem', { name: /API/ }));
    expect(screen.getByRole('button', { name: 'All elements' })).toHaveFocus();
    rerender(<V2ModelPanel {...p} selectedElementId="shop.api" />);
    rerender(<V2ModelPanel {...p} selectedElementId="shop.db" />);
    expect(screen.getByLabelText('Name')).toHaveValue('DB');
    expect(screen.getByRole('button', { name: 'All elements' })).not.toHaveFocus();
    rerender(<V2ModelPanel {...p} selectedElementId={null} />);
    expect(screen.getByRole('tree', { name: 'Model elements' })).toBeInTheDocument();
  });

  it('shows the card straight away for an element selected on the canvas', () => {
    render(<V2ModelPanel {...props({ selectedElementId: 'shop.db' })} />);
    expect(screen.getByLabelText('Name')).toHaveValue('DB');
  });

  it('filters the outline and keeps the ancestors of a match', () => {
    render(<V2ModelPanel {...props()} />);
    fireEvent.change(screen.getByLabelText('Search architecture'), { target: { value: 'go' } });
    expect(screen.getByRole('treeitem', { name: /Shop/ })).toBeInTheDocument();
    expect(screen.getByRole('treeitem', { name: /API/ })).toBeInTheDocument();
    expect(screen.queryByRole('treeitem', { name: /DB/ })).toBeNull();
  });

  it('read-only has no Add element', () => {
    render(<V2ModelPanel {...props({ readOnly: true })} />);
    expect(screen.queryByRole('button', { name: 'Add element' })).toBeNull();
  });
});
