import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { Checkbox } from './Controls';

it('checkbox keeps native semantics under the drawn box and shows a minus when indeterminate', () => {
  const { rerender } = render(<Checkbox label="Grid" indeterminate onChange={() => undefined} />);
  const input = screen.getByRole('checkbox', { name: 'Grid' }) as HTMLInputElement;
  expect(input.indeterminate).toBe(true);
  expect(input.nextElementSibling?.querySelector('.tabler-icon-minus')).not.toBeNull();

  rerender(<Checkbox label="Grid" checked onChange={() => undefined} />);
  expect(input.indeterminate).toBe(false);
  expect(input.nextElementSibling?.querySelector('.tabler-icon-check')).not.toBeNull();
  fireEvent.click(input);
});
