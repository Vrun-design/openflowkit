import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RouteLoadingFallback } from './RouteLoadingFallback';

describe('RouteLoadingFallback', () => {
  it('renders branded route-loading copy', () => {
    render(<RouteLoadingFallback />);

    expect(screen.getByRole('status')).toBeTruthy();
    expect(screen.getByText('Opening workspace')).toBeTruthy();
    expect(screen.getByText('Loading the next screen and restoring the current workspace context.')).toBeTruthy();
  });

  it('renders custom loading copy when provided', () => {
    render(<RouteLoadingFallback title="Opening docs" description="Loading documentation content." />);

    expect(screen.getByText('Opening docs')).toBeTruthy();
    expect(screen.getByText('Loading documentation content.')).toBeTruthy();
  });
});
