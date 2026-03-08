import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ColorPicker } from './ColorPicker';

describe('ColorPicker', () => {
  it('shows a visible selected color label and supports custom color mode', () => {
    const onChange = vi.fn();
    const onColorModeChange = vi.fn();
    const onCustomColorChange = vi.fn();

    render(
      <ColorPicker
        selectedColor="white"
        selectedColorMode="subtle"
        onChange={onChange}
        onColorModeChange={onColorModeChange}
        onCustomColorChange={onCustomColorChange}
        allowModes={true}
        allowCustom={true}
      />
    );

    expect(screen.getByText('White')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Filled' }));
    expect(onColorModeChange).toHaveBeenCalledWith('filled');

    fireEvent.click(screen.getByRole('button', { name: 'Custom' }));
    fireEvent.change(screen.getByDisplayValue('4F46E5'), {
      target: { value: '14B8A6' },
    });

    expect(onChange).toHaveBeenCalledWith('custom');
    expect(onCustomColorChange).toHaveBeenCalledWith('#14b8a6');
  });

  it('closes the custom picker when clicking outside', () => {
    render(
      <ColorPicker
        selectedColor="custom"
        selectedColorMode="subtle"
        selectedCustomColor="#4f46e5"
        onChange={vi.fn()}
        onColorModeChange={vi.fn()}
        onCustomColorChange={vi.fn()}
        allowModes={true}
        allowCustom={true}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Custom' }));
    expect(screen.getByLabelText('Close custom color picker')).toBeTruthy();

    fireEvent.pointerDown(document.body);
    expect(screen.queryByLabelText('Close custom color picker')).toBeNull();
  });

  it('closes the custom picker when selecting a preset swatch', () => {
    const onChange = vi.fn();

    render(
      <ColorPicker
        selectedColor="custom"
        selectedColorMode="subtle"
        selectedCustomColor="#4f46e5"
        onChange={onChange}
        onColorModeChange={vi.fn()}
        onCustomColorChange={vi.fn()}
        allowModes={true}
        allowCustom={true}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Custom' }));
    expect(screen.getByLabelText('Close custom color picker')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Blue' }));
    expect(onChange).toHaveBeenCalledWith('blue');
    expect(screen.queryByLabelText('Close custom color picker')).toBeNull();
  });
});
