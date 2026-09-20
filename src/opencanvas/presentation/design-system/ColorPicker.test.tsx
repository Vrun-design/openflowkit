import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { ColorPicker } from './ColorPicker';

it('commits the range input value used by a keyboard gesture', () => {
  const commit = vi.fn();
  render(<ColorPicker value="#ff0000" onChange={() => undefined} onCommit={commit} />);

  const hue = screen.getByRole('slider', { name: 'Hue' });
  fireEvent.keyDown(hue, { key: 'ArrowRight' });

  expect(commit).toHaveBeenLastCalledWith('#ff0400ff');
});
