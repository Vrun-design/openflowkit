import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PersistedWorkspaceRepairDialog } from './PersistedWorkspaceRepairDialog';

const backup = { fileName: 'backup.json', json: '{}' };

describe('PersistedWorkspaceRepairDialog', () => {
  it('describes repairs and resolves only after backup-first repair succeeds', async () => {
    const onRepair = vi.fn().mockResolvedValue(true);
    const onResolved = vi.fn();
    render(
      <PersistedWorkspaceRepairDialog
        report={{
          status: 'repairable',
          plan: {
            original: {
              document: null,
              documents: [],
              workspaceMeta: {
                id: 'workspace',
                activeDocumentId: null,
                documentOrder: [],
                lastOpenedAt: '',
              },
            },
            repairedDocuments: [],
            actions: [
              {
                kind: 'remove-connector',
                pageId: 'page-1',
                objectId: 'edge-1',
                detail: 'Removed connector with a missing endpoint.',
              },
            ],
            backup,
          },
        }}
        onRepair={onRepair}
        onContinueWithoutRepair={vi.fn()}
        onDownloadBackup={vi.fn()}
        onResolved={onResolved}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Download backup & repair' }));
    await vi.waitFor(() => expect(onRepair).toHaveBeenCalledTimes(1));
    expect(onResolved).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/page-1\/edge-1/)).toBeTruthy();
  });

  it('keeps unrepairable data blocked while allowing raw backup download', () => {
    const onDownloadBackup = vi.fn(() => true);
    render(
      <PersistedWorkspaceRepairDialog
        report={{ status: 'unrepairable', issues: ['bad structure'], backup }}
        onRepair={vi.fn()}
        onContinueWithoutRepair={vi.fn()}
        onDownloadBackup={onDownloadBackup}
        onResolved={vi.fn()}
      />
    );

    expect(screen.queryByRole('button', { name: 'Download backup & repair' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Continue without repair' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Download original backup' }));
    expect(onDownloadBackup).toHaveBeenCalledTimes(1);
  });

  it('surfaces repair failure and does not resolve', async () => {
    const onResolved = vi.fn();
    render(
      <PersistedWorkspaceRepairDialog
        report={{
          status: 'repairable',
          plan: {
            original: {
              document: null,
              documents: [],
              workspaceMeta: {
                id: 'workspace',
                activeDocumentId: null,
                documentOrder: [],
                lastOpenedAt: '',
              },
            },
            repairedDocuments: [],
            actions: [],
            backup,
          },
        }}
        onRepair={vi.fn().mockRejectedValue(new Error('Backup download failed.'))}
        onContinueWithoutRepair={vi.fn()}
        onDownloadBackup={vi.fn()}
        onResolved={onResolved}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Download backup & repair' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Backup download failed.');
    expect(onResolved).not.toHaveBeenCalled();
  });
});
