import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StoragePressureBanner } from './StoragePressureBanner';

describe('StoragePressureBanner', () => {
  it('reports critical capacity and exposes explicit backup/dismiss actions', () => {
    const downloadBackup = vi.fn();
    const dismiss = vi.fn();
    const requestPersistence = vi.fn();
    render(<StoragePressureBanner state={{
      snapshot: {
        level: 'critical',
        usageBytes: 950_000_000,
        quotaBytes: 1_000_000_000,
        ratio: 0.95,
        persisted: false,
        source: 'storage-estimate',
      },
      downloadBackup,
      dismiss,
      persistenceRequestStatus: 'idle',
      requestPersistence,
    }} />);

    expect(screen.getByRole('alert', { name: 'Browser storage pressure' })).toBeTruthy();
    expect(screen.getByText(/95% used/)).toBeTruthy();
    expect(screen.getByText(/not granted persistent storage/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Download JSON backup' }));
    fireEvent.click(screen.getByRole('button', { name: 'Protect local data' }));
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss storage warning' }));
    expect(downloadBackup).toHaveBeenCalledTimes(1);
    expect(requestPersistence).toHaveBeenCalledTimes(1);
    expect(dismiss).toHaveBeenCalledTimes(1);
  });

  it('describes write-time exhaustion without inventing a usage percentage', () => {
    render(<StoragePressureBanner state={{
      snapshot: {
        level: 'critical',
        usageBytes: null,
        quotaBytes: null,
        ratio: null,
        persisted: null,
        source: 'write-failure',
      },
      downloadBackup: vi.fn(),
      dismiss: vi.fn(),
      persistenceRequestStatus: 'idle',
      requestPersistence: vi.fn(),
    }} />);
    expect(screen.getByText(/storage write reached the browser quota/i)).toBeTruthy();
    expect(screen.queryByText(/0% used/)).toBeNull();
  });
});
