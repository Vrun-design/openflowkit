import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ImportRecoveryDialog } from './ImportRecoveryDialog';
import type { ImportFidelityReport } from '@/services/importFidelity';

function createReport(): ImportFidelityReport {
  return {
    id: 'import-1',
    source: 'json',
    timestamp: '2026-03-30T00:00:00.000Z',
    status: 'failed',
    nodeCount: 0,
    edgeCount: 0,
    elapsedMs: 42,
    issues: [
      {
        code: 'DOC-001',
        severity: 'error',
        message: 'Invalid flow file: missing nodes or edges arrays.',
        hint: 'Re-export the file from OpenFlowKit or supply both arrays.',
      },
      {
        code: 'FMT-001',
        severity: 'error',
        message: 'Unexpected metadata block.',
        line: 12,
        snippet: '"metadata": { "broken": true }',
      },
    ],
    summary: {
      warningCount: 0,
      errorCount: 2,
    },
  };
}

describe('ImportRecoveryDialog', () => {
  it('renders import issues and invokes retry/close actions', () => {
    const onRetry = vi.fn();
    const onClose = vi.fn();

    render(
      <ImportRecoveryDialog
        fileName="broken-flow.json"
        report={createReport()}
        onRetry={onRetry}
        onClose={onClose}
      />
    );

    expect(screen.getByRole('dialog', { name: 'Import needs attention' })).toBeTruthy();
    expect(screen.getByText(/broken-flow\.json could not be loaded cleanly/i)).toBeTruthy();
    expect(screen.getByText(/missing nodes or edges arrays/i)).toBeTruthy();
    expect(screen.getByText(/Unexpected metadata block/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Try another file/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /Dismiss/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
