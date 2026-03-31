import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CinematicExportRequest } from '@/services/export/cinematicExport';
import { useExportMenu } from './useExportMenu';

const addToast = vi.fn();
const cinematicRequest: CinematicExportRequest = {
  format: 'cinematic-video',
  speed: 'normal',
  resolution: '1080p',
  themeMode: 'light',
};

vi.mock('./ui/ToastContext', () => ({
  useToast: () => ({
    addToast,
  }),
}));

const baseProps = {
  onExportPNG: vi.fn(),
  onCopyImage: vi.fn(),
  onExportSVG: vi.fn(),
  onCopySVG: vi.fn(),
  onExportPDF: vi.fn(),
  onExportCinematic: vi.fn(),
  getCinematicExportRequest: vi.fn(() => cinematicRequest),
  onExportJSON: vi.fn(),
  onCopyJSON: vi.fn(),
  onExportMermaid: vi.fn(),
  onDownloadMermaid: vi.fn(),
  onExportPlantUML: vi.fn(),
  onDownloadPlantUML: vi.fn(),
  onExportOpenFlowDSL: vi.fn(),
  onDownloadOpenFlowDSL: vi.fn(),
  onExportFigma: vi.fn(),
  onDownloadFigma: vi.fn(),
  onShare: vi.fn(),
};

function Harness(): React.ReactElement {
  const { isOpen, menuRef, toggleMenu, handleSelect } = useExportMenu(baseProps);

  return (
    <div>
      <div ref={menuRef}>
        <button type="button" onClick={toggleMenu}>
          Toggle export
        </button>
        <button type="button" onClick={() => void handleSelect('figma', 'copy')}>
          Run export
        </button>
        {isOpen ? <div data-testid="export-menu-open">Export menu</div> : null}
      </div>
      <button type="button">Outside target</button>
    </div>
  );
}

describe('useExportMenu', () => {
  beforeEach(() => {
    addToast.mockReset();
    Object.values(baseProps).forEach((handler) => {
      if (typeof handler === 'function' && 'mockReset' in handler) {
        handler.mockReset();
      }
    });
  });

  it('closes when clicking outside the menu', () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole('button', { name: 'Toggle export' }));
    expect(screen.getByTestId('export-menu-open')).toBeTruthy();

    fireEvent.mouseDown(screen.getByRole('button', { name: 'Outside target' }));

    expect(screen.queryByTestId('export-menu-open')).toBeNull();
  });

  it('closes on Escape', () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole('button', { name: 'Toggle export' }));
    expect(screen.getByTestId('export-menu-open')).toBeTruthy();

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(screen.queryByTestId('export-menu-open')).toBeNull();
  });

  it('shows toast feedback when an export action rejects', async () => {
    baseProps.onExportFigma.mockRejectedValueOnce(new Error('copy failed'));
    render(<Harness />);

    fireEvent.click(screen.getByRole('button', { name: 'Run export' }));

    await waitFor(() => {
      expect(addToast).toHaveBeenCalledWith(
        'Failed to complete figma copy: copy failed',
        'error',
        5000
      );
    });
  });
});
