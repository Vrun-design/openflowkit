import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { createArchIndex } from '../../../dsl/model/model';
import type { ArchModel } from '../../../dsl/model/types';
import { V2ModelElementCard, type ElementCardProps } from './V2ModelElementCard';

// jsdom has no ResizeObserver; the menu popover places itself with one.
vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });

const el = (id: string, name: string, kind: string, parent: string | null = null, extra: object = {}) => ({ id, name, kind, parent, tags: [], links: [], ...extra });
const rel = (id: string, from: string, to: string, label: string) => ({ id, from, to, label, tags: [] });
const model = {
  elements: [
    el('shop', 'Shop', 'system'), el('shop.api', 'API', 'container', 'shop', { tech: 'Go', desc: 'Orders', tags: ['core'] }),
    el('shop.web', 'Web', 'container', 'shop'), el('shop.api.orders', 'Orders', 'component', 'shop.api'), el('shop.db', 'DB', 'store', 'shop'),
  ],
  relations: [rel('r1', 'shop.web', 'shop.api', 'submits orders'), rel('r2', 'shop.api', 'shop.db', 'stores orders')],
  views: [], flows: [],
} as unknown as ArchModel;
const index = createArchIndex(model);

function setup(overrides: Partial<ElementCardProps> = {}, id = 'shop.api') {
  const props: ElementCardProps = {
    element: index.byId.get(id)!, index, readOnly: false, inCurrentView: true, childView: null, adrs: [],
    focusName: false, focusBack: false, onBack: vi.fn(), onInspect: vi.fn(), onEdit: vi.fn(), onRemove: vi.fn(),
    onAddInside: vi.fn(), onOpenView: vi.fn(), onCreateView: vi.fn(), ...overrides,
  };
  const view = render(<V2ModelElementCard {...props} />);
  return { props, ...view };
}
const type = (label: string | RegExp, value: string) => {
  const field = screen.getByLabelText(label);
  fireEvent.focus(field);
  fireEvent.change(field, { target: { value } });
  return field;
};

describe('V2ModelElementCard saves as you leave a field', () => {
  it('commits once on blur, with only the changed field', () => {
    const { props } = setup();
    const field = type('Technology', 'Rust');
    expect(props.onEdit).not.toHaveBeenCalled();
    fireEvent.blur(field);
    expect(props.onEdit).toHaveBeenCalledTimes(1);
    expect(props.onEdit).toHaveBeenCalledWith({ tech: 'Rust' });
  });

  it('commits on Enter, not again on the blur after it', () => {
    const { props } = setup();
    const field = type('Name', 'Orders API');
    fireEvent.keyDown(field, { key: 'Enter' });
    fireEvent.blur(field);
    expect(props.onEdit).toHaveBeenCalledTimes(1);
    expect(props.onEdit).toHaveBeenCalledWith({ name: 'Orders API' });
  });

  it('Enter in a textarea is a newline; Cmd+Enter commits', () => {
    const { props } = setup();
    const field = type('Description', 'Line one\nline two');
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(props.onEdit).not.toHaveBeenCalled();
    fireEvent.keyDown(field, { key: 'Enter', metaKey: true });
    expect(props.onEdit).toHaveBeenCalledWith({ desc: 'Line one\nline two' });
  });

  it('does not commit an unchanged field', () => {
    const { props } = setup();
    fireEvent.blur(type('Technology', '  Go '));
    expect(props.onEdit).not.toHaveBeenCalled();
  });

  it('Escape reverts a dirty field and is kept from closing the panel; a clean one lets Escape through', () => {
    const { props } = setup();
    const field = type('Technology', 'Rust') as HTMLInputElement;
    const outer = vi.fn();
    document.addEventListener('keydown', outer);
    fireEvent.keyDown(field, { key: 'Escape' });
    expect(field.value).toBe('Go');
    expect(outer).not.toHaveBeenCalled();
    fireEvent.keyDown(field, { key: 'Escape' });
    expect(outer).toHaveBeenCalledTimes(1);
    document.removeEventListener('keydown', outer);
    fireEvent.blur(field);
    expect(props.onEdit).not.toHaveBeenCalled();
  });

  it('an empty Name reverts instead of committing', () => {
    const { props } = setup();
    const field = type('Name', '   ') as HTMLInputElement;
    fireEvent.blur(field);
    expect(field.value).toBe('API');
    expect(props.onEdit).not.toHaveBeenCalled();
  });

  it('an untouched focused field follows an outside edit and does not write it back on blur', () => {
    const { props, rerender } = setup();
    const field = screen.getByLabelText('Technology') as HTMLInputElement;
    fireEvent.focus(field);
    rerender(<V2ModelElementCard {...props} element={{ ...props.element, tech: 'Zig' }} />);
    expect(field.value).toBe('Zig');
    fireEvent.blur(field);
    expect(props.onEdit).not.toHaveBeenCalled();
  });

  it('an untouched Tags field does not rewrite case on blur', () => {
    const { props } = setup({ element: { ...index.byId.get('shop.api')!, tags: ['Core'] } });
    const field = screen.getByLabelText('Tags');
    fireEvent.focus(field);
    fireEvent.blur(field);
    expect(props.onEdit).not.toHaveBeenCalled();
  });

  it('commits a dirty field when the card unmounts', () => {
    const { props, unmount } = setup();
    type('Tags', 'Core, Payments');
    unmount();
    expect(props.onEdit).toHaveBeenCalledWith({ tags: ['core', 'payments'] });
  });

  it('shows an outside edit in a field that is not being edited, and keeps the draft of one that is', () => {
    const { props, rerender } = setup();
    const next = { ...props, element: { ...props.element, tech: 'Zig', desc: 'Changed elsewhere' } };
    type('Technology', 'Mine');
    rerender(<V2ModelElementCard {...next} />);
    expect((screen.getByLabelText('Technology') as HTMLInputElement).value).toBe('Mine');
    expect((screen.getByLabelText('Description') as HTMLTextAreaElement).value).toBe('Changed elsewhere');
  });
});

describe('V2ModelElementCard content', () => {
  it('splits relationships into Talks to and Used by, and lists what is inside', () => {
    setup();
    expect(screen.getByRole('list', { name: 'API talks to' })).toHaveTextContent('DB');
    expect(screen.getByRole('list', { name: 'API talks to' })).toHaveTextContent('stores orders');
    expect(screen.getByRole('list', { name: 'API is used by' })).toHaveTextContent('Web');
    expect(screen.getByRole('list', { name: 'API is used by' })).not.toHaveTextContent('stores orders');
    expect(screen.getByRole('list', { name: 'Inside API' })).toHaveTextContent('Orders');
  });

  it('inspects the other end of a relation, an ancestor and a child', () => {
    const { props } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Inspect DB' }));
    fireEvent.click(screen.getByRole('button', { name: 'Shop' }));
    fireEvent.click(screen.getByRole('button', { name: /Orders/ }));
    expect((props.onInspect as ReturnType<typeof vi.fn>).mock.calls.map(([id]) => id)).toEqual(['shop.db', 'shop', 'shop.api.orders']);
  });

  it('All elements calls back', () => {
    const { props } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'All elements' }));
    expect(props.onBack).toHaveBeenCalled();
  });

  it('read-only: fields cannot be edited and there is no Add, Remove or menu', () => {
    setup({ readOnly: true });
    expect(screen.getByLabelText('Name')).toHaveAttribute('readonly');
    expect(screen.getByLabelText('Technology')).toHaveAttribute('readonly');
    expect(screen.queryByRole('button', { name: 'Add inside' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'More actions' })).toBeNull();
  });

  it('removing asks first, in the card', () => {
    const { props } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'More actions' }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Remove from model/ }));
    expect(screen.getByRole('alert')).toHaveTextContent('Remove API and 1 inside from every view?');
    expect(props.onRemove).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Remove from model' }));
    expect(props.onRemove).toHaveBeenCalledTimes(1);
  });

  it('a person cannot contain anything: Add inside is disabled', () => {
    const personModel = { ...model, elements: [el('c', 'Customer', 'person')], relations: [] } as unknown as ArchModel;
    const personIndex = createArchIndex(personModel);
    setup({ element: personIndex.byId.get('c')!, index: personIndex }, 'c');
    expect(screen.getByRole('button', { name: 'Add inside' })).toBeDisabled();
    expect(screen.getByText(/No relationships yet/)).toBeInTheDocument();
  });
});

describe('relationships of an element with things inside', () => {
  const nested = {
    elements: [el('c', 'Customer', 'person'), el('shop', 'Shop', 'system'), el('shop.web', 'Web', 'container', 'shop'), el('shop.api', 'API', 'container', 'shop'), el('pay', 'Payments', 'external')],
    relations: [rel('r1', 'c', 'shop.web', 'shops'), rel('r2', 'shop.web', 'shop.api', 'calls'), rel('r3', 'shop.api', 'pay', 'charges'), rel('r4', 'shop.web', 'pay', 'charges')],
    views: [], flows: [],
  } as unknown as ArchModel;
  const nestedIndex = createArchIndex(nested);

  it('shows the rows with "via" and no empty-state note', () => {
    render(<V2ModelElementCard {...{ element: nestedIndex.byId.get('shop')!, index: nestedIndex, readOnly: false, inCurrentView: true, childView: null, adrs: [],
      focusName: false, focusBack: false, onBack: vi.fn(), onInspect: vi.fn(), onEdit: vi.fn(), onRemove: vi.fn(), onAddInside: vi.fn(), onOpenView: vi.fn(), onCreateView: vi.fn() }} />);
    expect(screen.getByRole('list', { name: 'Shop is used by' })).toHaveTextContent('Customer');
    expect(screen.getByRole('list', { name: 'Shop is used by' })).toHaveTextContent('via Web');
    expect(screen.getByRole('list', { name: 'Shop talks to' })).toHaveTextContent('via API');
    expect(screen.queryByText(/No relationships yet/)).toBeNull();
  });
});

describe('an element this view does not show', () => {
  it('offers Add to this view, and only asks for a connector when the element is drawn', () => {
    const personModel = { ...model, elements: [el('c', 'Customer', 'person')], relations: [] } as unknown as ArchModel;
    const personIndex = createArchIndex(personModel);
    const onAddToView = vi.fn();
    setup({ element: personIndex.byId.get('c')!, index: personIndex, inCurrentView: false, onAddToView }, 'c');
    expect(screen.getByText('Not shown in this view.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add to this view' }));
    expect(onAddToView).toHaveBeenCalledTimes(1);
    expect(screen.getByText('No relationships yet.')).toBeInTheDocument();
    expect(screen.queryByText(/Draw a connector/)).toBeNull();
  });

  it('names a container by what it is drawn as', () => {
    const dbModel = { ...model, elements: [el('db', 'Ledger DB', 'container', null, { attrs: [{ value: 'cylinder' }] })], relations: [] } as unknown as ArchModel;
    const dbIndex = createArchIndex(dbModel);
    setup({ element: dbIndex.byId.get('db')!, index: dbIndex }, 'db');
    expect(screen.getByText('Database')).toBeInTheDocument();
  });
});
