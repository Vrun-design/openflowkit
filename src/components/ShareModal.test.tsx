import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ShareModal } from './ShareModal';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
  }),
}));

describe('ShareModal', () => {
  it('shows collaboration link details and cache recovery state', () => {
    render(
      <ShareModal
        isOpen
        onClose={vi.fn()}
        onCopyInvite={vi.fn()}
        roomId="https://flowmind.ai/editor?room=abc"
        cacheState="hydrated"
        status="fallback"
        viewerCount={1}
      />
    );

    expect(screen.getAllByText('Collaboration Link')).toHaveLength(2);
    expect(screen.getByText('Copy a collaboration link for this live canvas session. This does not package the diagram into the URL.')).toBeTruthy();
    expect(screen.getByText('Recovered from local cache')).toBeTruthy();
    expect(screen.getByText('Copy Link')).toBeTruthy();
  });

  it('copies the collaboration link', () => {
    const onCopyInvite = vi.fn();

    render(
      <ShareModal
        isOpen
        onClose={vi.fn()}
        onCopyInvite={onCopyInvite}
        roomId="https://flowmind.ai/editor?room=abc"
        cacheState="unavailable"
        status="realtime"
        viewerCount={2}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Copy Link/i }));

    expect(onCopyInvite).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Realtime sync active')).toBeTruthy();
  });
});
