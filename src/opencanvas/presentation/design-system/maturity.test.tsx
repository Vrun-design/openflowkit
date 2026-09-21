import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  Dialog,
  Dropdown,
  ErrorState,
  NumberField,
  Panel,
  Progress,
  Skeleton,
  SkeletonLines,
  Spinner,
  Thinking,
  ToastRegion,
} from './index';

const options = [
  { value: 'center', label: 'Center' },
  { value: 'inside', label: 'Inside', disabled: true },
  { value: 'outside', label: 'Outside' },
];

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
});

describe('dropdown listbox', () => {
  it('opens from the trigger and commits with arrows, skipping disabled options', () => {
    const onChange = vi.fn();
    render(<Dropdown label="Align" value={null} onChange={onChange} options={options} />);
    fireEvent.click(screen.getByRole('button', { name: /align/i }));
    const list = screen.getByRole('listbox', { name: 'Align' });
    expect(list).toBeInTheDocument();
    fireEvent.keyDown(list, { key: 'ArrowDown' });
    expect(list).toHaveAttribute('aria-activedescendant', expect.stringContaining('outside'));
    fireEvent.keyDown(list, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('outside');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('supports typeahead and closes on Escape with focus back on the trigger', () => {
    const onChange = vi.fn();
    render(<Dropdown label="Align" value="center" onChange={onChange} options={options} />);
    const trigger = screen.getByRole('button', { name: /align/i });
    fireEvent.click(trigger);
    const list = screen.getByRole('listbox');
    fireEvent.keyDown(list, { key: 'o' });
    expect(list).toHaveAttribute('aria-activedescendant', expect.stringContaining('outside'));
    list.focus();
    fireEvent.keyDown(list, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});

describe('number field commits', () => {
  it('stacked steppers clamp and commit once per click', () => {
    const onCommit = vi.fn();
    render(<NumberField stepper="stacked" label="Opacity" value={95} min={0} max={100} step={10}
      onChange={() => {}} onCommit={onCommit} />);
    fireEvent.click(screen.getByRole('button', { name: 'Increase Opacity' }));
    expect(onCommit).toHaveBeenCalledExactlyOnceWith(100);
  });

  it('fields without visible steppers keep keyboard increments', () => {
    const onCommit = vi.fn();
    render(<NumberField stepper="none" label="X" value={20} step={1}
      onChange={() => {}} onCommit={onCommit} />);
    expect(screen.queryByRole('button', { name: 'Increase X' })).toBeNull();
    fireEvent.keyDown(screen.getByRole('spinbutton', { name: 'X' }), { key: 'ArrowUp', shiftKey: true });
    expect(onCommit).toHaveBeenCalledExactlyOnceWith(30);
  });

  it('exposes spinbutton semantics and reverts drafts on Escape', () => {
    const onChange = vi.fn();
    const onCommit = vi.fn();
    render(<NumberField label="Width" value={160} onChange={onChange} onCommit={onCommit} />);
    const input = screen.getByRole('spinbutton', { name: 'Width' });
    expect(input).toHaveAttribute('aria-valuenow', '160');
    fireEvent.change(input, { target: { value: '16' } });
    fireEvent.change(input, { target: { value: '16.' } });
    expect(input).toHaveValue('16.');
    expect(onChange).toHaveBeenLastCalledWith(16);
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(input).toHaveValue('160');
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('commits once on Enter', () => {
    const onCommit = vi.fn();
    render(<NumberField label="Width" value={160} onChange={() => {}} onCommit={onCommit} />);
    const input = screen.getByRole('spinbutton', { name: 'Width' });
    fireEvent.change(input, { target: { value: '200' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith(200);
  });
});

describe('loading language', () => {
  it('announces thinking and progress without faking completion', () => {
    render(
      <>
        <Thinking label="Drafting" detail="2 objects" />
        <Progress label="Export" value={2} max={4} />
        <Progress label="Resolving" />
      </>
    );
    expect(screen.getByRole('status')).toHaveTextContent('Drafting');
    const determinate = screen.getByRole('progressbar', { name: 'Export' });
    expect(determinate).toHaveAttribute('aria-valuenow', '2');
    expect(determinate).toHaveTextContent('');
    const indeterminate = screen.getByRole('progressbar', { name: 'Resolving' });
    expect(indeterminate).not.toHaveAttribute('aria-valuenow');
    expect(indeterminate).toHaveAttribute('aria-valuetext', 'In progress');
  });

  it('keeps skeletons decorative and spinners named', () => {
    render(
      <>
        <Skeleton width={120} height={72} />
        <Spinner label="Saving" />
      </>
    );
    expect(screen.getByRole('status', { name: 'Saving' })).toBeInTheDocument();
  });

  it('renders one placeholder per requested line with a short final line', () => {
    const { container } = render(<SkeletonLines rows={3} />);
    const lines = container.querySelectorAll('.ofk-skeleton-lines .ofk-skeleton');
    expect(lines).toHaveLength(3);
    expect((lines[2] as HTMLElement).style.width).toBe('62%');
  });

  it('announces errors with a recovery path', () => {
    const retry = vi.fn();
    render(<ErrorState title="Export failed" description="Work is safe." onRetry={retry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Export failed');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});

describe('layered surfaces', () => {
  it('gives every dialog unique title/description ids', () => {
    const { container } = render(
      <>
        <Dialog open={false} onClose={() => {}} title="First" description="One" />
        <Dialog open={false} onClose={() => {}} title="Second" description="Two" />
      </>
    );
    const headings = Array.from(container.querySelectorAll('.ofk-dialog-header h2'));
    expect(headings).toHaveLength(2);
    expect(headings[0].id).not.toBe(headings[1].id);
    const described = Array.from(container.querySelectorAll('.ofk-dialog-description'));
    expect(described[0].id).not.toBe(described[1].id);
  });

  it('dismisses panels on Escape and renders toast actions as system buttons', () => {
    const onClose = vi.fn();
    const action = vi.fn();
    render(
      <>
        <Panel title="Layers" onClose={onClose}>
          content
        </Panel>
        <ToastRegion
          items={[{ id: 't', tone: 'success', title: 'Saved', action: { label: 'Undo', onClick: action } }]}
          onDismiss={() => {}}
        />
      </>
    );
    fireEvent.keyDown(screen.getByLabelText('Layers'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(action).toHaveBeenCalledTimes(1);
  });
});
