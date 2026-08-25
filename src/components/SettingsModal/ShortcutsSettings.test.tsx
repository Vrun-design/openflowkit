import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../config/rolloutFlags', () => ({
  ROLLOUT_FLAGS: { openCanvasCustomShortcutsV1: true },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options && typeof options === 'object'
        ? `${key}:${Object.values(options).join(',')}`
        : key,
  }),
}));

import { ShortcutsSettings } from './ShortcutsSettings';
import {
  DEFAULT_KEYBOARD_BINDINGS,
  KEYBOARD_BINDINGS_STORAGE_KEY,
  loadKeyboardBindings,
} from '../../services/keyboardBindings';

function startRecording(actionLabelKey: string): void {
  fireEvent.click(
    screen.getByLabelText(`settingsModal.shortcutsRecord: ${actionLabelKey}`)
  );
}

describe('ShortcutsSettings customization', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('records and persists a new chord for an action', () => {
    render(<ShortcutsSettings />);
    startRecording('common.handTool');

    expect(screen.getByText('settingsModal.shortcutsRecording')).toBeTruthy();

    fireEvent.keyDown(window, { key: 'j', code: 'KeyJ', ctrlKey: true, altKey: true });

    expect(loadKeyboardBindings().panMode).toEqual(['mod+alt+j']);
    expect(JSON.parse(localStorage.getItem(KEYBOARD_BINDINGS_STORAGE_KEY) ?? '{}')).toEqual({
      panMode: ['mod+alt+j'],
    });
  });

  it('refuses a chord already owned by another action and keeps the old binding', () => {
    render(<ShortcutsSettings />);
    startRecording('common.handTool');

    fireEvent.keyDown(window, { key: 'k', code: 'KeyK', ctrlKey: true });

    expect(screen.getByRole('alert').textContent).toBe(
      'settingsModal.shortcutsConflict:common.commandBar'
    );
    expect(loadKeyboardBindings().panMode).toEqual(DEFAULT_KEYBOARD_BINDINGS.panMode);
    expect(localStorage.getItem(KEYBOARD_BINDINGS_STORAGE_KEY)).toBeNull();
  });

  it('ignores a modifier-only keypress and keeps recording', () => {
    render(<ShortcutsSettings />);
    startRecording('common.handTool');

    fireEvent.keyDown(window, { key: 'Shift', code: 'ShiftLeft', shiftKey: true });

    expect(screen.getByText('settingsModal.shortcutsRecording')).toBeTruthy();
    expect(localStorage.getItem(KEYBOARD_BINDINGS_STORAGE_KEY)).toBeNull();
  });

  it('cancels recording on Escape without changing the binding', () => {
    render(<ShortcutsSettings />);
    startRecording('common.handTool');

    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });

    expect(screen.queryByText('settingsModal.shortcutsRecording')).toBeNull();
    expect(localStorage.getItem(KEYBOARD_BINDINGS_STORAGE_KEY)).toBeNull();
  });

  it('resets one customized action back to its default', () => {
    render(<ShortcutsSettings />);
    startRecording('common.handTool');
    fireEvent.keyDown(window, { key: 'j', code: 'KeyJ', ctrlKey: true, altKey: true });

    fireEvent.click(screen.getByLabelText('settingsModal.shortcutsResetOne: common.handTool'));

    expect(loadKeyboardBindings().panMode).toEqual(DEFAULT_KEYBOARD_BINDINGS.panMode);
    expect(localStorage.getItem(KEYBOARD_BINDINGS_STORAGE_KEY)).toBeNull();
  });

  it('resets every customized action at once', () => {
    render(<ShortcutsSettings />);
    startRecording('common.handTool');
    fireEvent.keyDown(window, { key: 'j', code: 'KeyJ', ctrlKey: true, altKey: true });

    fireEvent.click(screen.getByText('settingsModal.shortcutsResetAll'));

    expect(loadKeyboardBindings()).toEqual(DEFAULT_KEYBOARD_BINDINGS);
    expect(localStorage.getItem(KEYBOARD_BINDINGS_STORAGE_KEY)).toBeNull();
  });

  it('offers the printable reference sheet', () => {
    const print = vi.fn();
    vi.stubGlobal('print', print);
    render(<ShortcutsSettings />);

    fireEvent.click(screen.getByText('settingsModal.shortcutsPrint'));

    expect(print).toHaveBeenCalledTimes(1);
    expect(document.getElementById('shortcut-reference-sheet')).toBeTruthy();
    vi.unstubAllGlobals();
  });
});
