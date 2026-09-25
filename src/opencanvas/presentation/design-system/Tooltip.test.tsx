import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { IconButton } from './Button';
import { Tooltip } from './Tooltip';

it('removes the native title from a custom tooltip trigger', () => {
  render(
    <Tooltip content="Zoom to fit">
      <IconButton label="Zoom to fit" title="Browser tooltip" icon={<span />} />
    </Tooltip>
  );

  expect(screen.getByRole('button', { name: 'Zoom to fit' })).not.toHaveAttribute('title');
});
