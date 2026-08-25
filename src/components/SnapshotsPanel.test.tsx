import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SnapshotsPanel } from './SnapshotsPanel';
import type { FlowSnapshot } from '@/lib/types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallbackOrOptions?: string | Record<string, unknown>) =>
      typeof fallbackOrOptions === 'string' ? fallbackOrOptions : _key,
  }),
}));

describe('SnapshotsPanel', () => {
  afterEach(() => vi.restoreAllMocks());

  it('renders a history scrubber and scrubs to the requested step', () => {
    const onScrubHistoryTo = vi.fn();

    render(
      <SnapshotsPanel
        isOpen={true}
        onClose={vi.fn()}
        snapshots={[]}
        manualSnapshots={[]}
        autoSnapshots={[]}
        onSaveSnapshot={vi.fn()}
        onRestoreSnapshot={vi.fn()}
        onDeleteSnapshot={vi.fn()}
        historyPastCount={2}
        historyFutureCount={1}
        onScrubHistoryTo={onScrubHistoryTo}
      />
    );

    fireEvent.change(
      screen.getByRole('slider', { name: 'Scrub through recent undo history' }),
      { target: { value: '1' } }
    );

    expect(screen.getByText('Undo Timeline')).toBeInTheDocument();
    expect(onScrubHistoryTo).toHaveBeenCalledWith(1);
    expect(screen.getByRole('slider')).toHaveAttribute(
      'aria-describedby',
      'snapshot-history-position'
    );
  });

  it('downloads a portable backup before deleting a snapshot', async () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:snapshot-backup');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    const snapshot: FlowSnapshot = {
      id: 'snapshot-1',
      name: 'Before change',
      timestamp: '2026-08-25T00:00:00.000Z',
      kind: 'manual',
      nodes: [],
      edges: [],
    };
    const onDeleteSnapshot = vi.fn();
    render(
      <SnapshotsPanel
        isOpen={true}
        onClose={vi.fn()}
        snapshots={[snapshot]}
        manualSnapshots={[snapshot]}
        autoSnapshots={[]}
        onSaveSnapshot={vi.fn()}
        onRestoreSnapshot={vi.fn()}
        onDeleteSnapshot={onDeleteSnapshot}
        historyPastCount={0}
        historyFutureCount={0}
        onScrubHistoryTo={vi.fn()}
      />
    );

    const deleteButton = screen.getByTestId('snapshot-delete-snapshot-1');
    fireEvent.click(deleteButton);
    expect(onDeleteSnapshot).not.toHaveBeenCalled();
    await waitFor(() => expect(deleteButton).toHaveAttribute('data-backup-status', 'ready'));
    fireEvent.click(deleteButton);

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(onDeleteSnapshot).toHaveBeenCalledWith(snapshot.id);
  });

  it('fails closed when snapshot backup validation fails', async () => {
    const snapshot: FlowSnapshot = {
      id: 'snapshot-invalid',
      name: 'Invalid snapshot',
      timestamp: '2026-08-25T00:00:00.000Z',
      kind: 'manual',
      nodes: [],
      edges: [{ id: 'edge-1', source: 'missing', target: 'also-missing' }],
    };
    const onDeleteSnapshot = vi.fn();
    render(
      <SnapshotsPanel
        isOpen={true}
        onClose={vi.fn()}
        snapshots={[snapshot]}
        manualSnapshots={[snapshot]}
        autoSnapshots={[]}
        onSaveSnapshot={vi.fn()}
        onRestoreSnapshot={vi.fn()}
        onDeleteSnapshot={onDeleteSnapshot}
        historyPastCount={0}
        historyFutureCount={0}
        onScrubHistoryTo={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('snapshot-delete-snapshot-invalid'));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(onDeleteSnapshot).not.toHaveBeenCalled();
  });
});
