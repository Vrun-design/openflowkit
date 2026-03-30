import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SnapshotsPanel } from './SnapshotsPanel';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallbackOrOptions?: string | Record<string, unknown>) =>
      typeof fallbackOrOptions === 'string' ? fallbackOrOptions : _key,
  }),
}));

describe('SnapshotsPanel', () => {
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
  });
});
