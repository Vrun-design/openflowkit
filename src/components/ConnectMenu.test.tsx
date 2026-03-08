import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConnectMenu } from './ConnectMenu';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
  }),
}));

describe('ConnectMenu', () => {
  it('shows only topic creation for mindmap sources', () => {
    render(
      <ConnectMenu
        position={{ x: 100, y: 100 }}
        sourceType="mindmap"
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('Topic')).toBeTruthy();
    expect(screen.queryByText('connectMenu.process')).toBeNull();
  });

  it('calls onSelect with mindmap when choosing a topic from a mindmap source', () => {
    const onSelect = vi.fn();
    render(
      <ConnectMenu
        position={{ x: 100, y: 100 }}
        sourceType="mindmap"
        onSelect={onSelect}
        onClose={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Topic'));

    expect(onSelect).toHaveBeenCalledWith('mindmap', undefined);
  });
});
