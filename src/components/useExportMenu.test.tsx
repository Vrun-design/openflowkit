import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useExportMenu } from './useExportMenu';

const baseProps = {
  onExportPNG: vi.fn(),
  onCopyImage: vi.fn(),
  onExportSVG: vi.fn(),
  onCopySVG: vi.fn(),
  onExportPDF: vi.fn(),
  onExportCinematic: vi.fn(),
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
  const { isOpen, menuRef, toggleMenu } = useExportMenu(baseProps);

  return (
    <div>
      <div ref={menuRef}>
        <button type="button" onClick={toggleMenu}>
          Toggle export
        </button>
        {isOpen ? <div data-testid="export-menu-open">Export menu</div> : null}
      </div>
      <button type="button">Outside target</button>
    </div>
  );
}

describe('useExportMenu', () => {
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
});
