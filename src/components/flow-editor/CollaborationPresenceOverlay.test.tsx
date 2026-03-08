import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CollaborationPresenceOverlay } from './CollaborationPresenceOverlay';

describe('CollaborationPresenceOverlay', () => {
  it('renders remote cursors across the full canvas overlay once peers have moved', () => {
    render(
      <CollaborationPresenceOverlay
        remotePresence={[
          {
            clientId: 'client-a',
            name: 'Alice',
            color: '#2563eb',
            cursor: { x: 320, y: 180 },
          },
        ]}
      />
    );

    const cursor = screen.getByTestId('remote-cursor-client-a');
    expect(cursor).toBeTruthy();
    expect(cursor instanceof HTMLElement ? cursor.style.left : '').toBe('320px');
    expect(cursor instanceof HTMLElement ? cursor.style.top : '').toBe('180px');
  });

  it('suppresses untouched ghost cursors at 0,0', () => {
    render(
      <CollaborationPresenceOverlay
        remotePresence={[
          {
            clientId: 'client-a',
            name: 'Alice',
            color: '#2563eb',
            cursor: { x: 0, y: 0 },
          },
        ]}
      />
    );

    expect(screen.queryByTestId('remote-cursor-client-a')).toBeNull();
  });
});
