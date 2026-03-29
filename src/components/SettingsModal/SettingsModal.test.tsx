import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SettingsModal } from './SettingsModal';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
  }),
}));

vi.mock('./GeneralSettings', () => ({
  GeneralSettings: () => <div>General content</div>,
}));

vi.mock('./CanvasSettings', () => ({
  CanvasSettings: () => <div>Canvas settings content</div>,
}));

vi.mock('./AISettings', () => ({
  AISettings: () => <div>AI settings content</div>,
}));

vi.mock('./ShortcutsSettings', () => ({
  ShortcutsSettings: () => <div>Shortcuts content</div>,
}));

vi.mock('../ui/SidebarItem', () => ({
  SidebarItem: ({ children, onClick, isActive }: { children: React.ReactNode; onClick: () => void; isActive?: boolean }) => (
    <button type="button" data-active={isActive ? 'true' : 'false'} onClick={onClick}>
      {children}
    </button>
  ),
}));

describe('SettingsModal', () => {
  it('renders with dialog semantics and initial focus on the close button', () => {
    render(<SettingsModal isOpen onClose={vi.fn()} />);

    expect(screen.getByRole('dialog').getAttribute('aria-describedby')).toBe('settings-modal-description');
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close settings' }));
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();

    render(<SettingsModal isOpen onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders the AI settings tab when opened with the ai tab selected', () => {
    render(<SettingsModal isOpen onClose={vi.fn()} initialTab="ai" />);

    expect(screen.getByText('AI settings content')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'AI' })).toBeInTheDocument();
  });

  it('renders the canvas settings tab when opened with the canvas tab selected', () => {
    render(<SettingsModal isOpen onClose={vi.fn()} initialTab="canvas" />);

    expect(screen.getByText('Canvas settings content')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Canvas' })).toBeInTheDocument();
  });
});
