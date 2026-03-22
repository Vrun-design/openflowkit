import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ShareModal } from './ShareModal';

vi.mock('react-i18next', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-i18next')>();
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string, options?: string | { defaultValue?: string }) => {
        if (typeof options === 'string') {
          return options;
        }
        return options?.defaultValue ?? key;
      },
    }),
  };
});

describe('ShareModal', () => {
  it('renders the invite URL and fallback guidance for local-only mode', () => {
    render(
      <ShareModal
        isOpen
        onClose={vi.fn()}
        onCopyInvite={vi.fn()}
        roomId="room-123"
        inviteUrl="https://example.com/flow?room=room-123"
        status="fallback"
        viewerCount={2}
        participants={[
          { clientId: 'local', name: 'You', color: '#000', isLocal: true },
          { clientId: 'peer', name: 'Peer', color: '#fff', isLocal: false },
        ]}
      />
    );

    expect(screen.getByTestId('share-panel')).toBeTruthy();
    expect(screen.getByRole('dialog', { name: 'Share live canvas' }).getAttribute('aria-describedby')).toBe('share-modal-description');
    expect(screen.getByText('https://example.com/flow?room=room-123')).toBeTruthy();
    expect(screen.getByText(/local-only mode/i)).toBeTruthy();
    expect(screen.getByText(/copy the invite link above manually/i)).toBeTruthy();
  });

  it('invokes copy and close actions', () => {
    const onClose = vi.fn();
    const onCopyInvite = vi.fn();

    render(
      <ShareModal
        isOpen
        onClose={onClose}
        onCopyInvite={onCopyInvite}
        roomId="room-123"
        inviteUrl="https://example.com/flow?room=room-123"
        status="realtime"
        viewerCount={1}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /copy invite link/i }));
    fireEvent.click(screen.getByLabelText('Close'));

    expect(onCopyInvite).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
