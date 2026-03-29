import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GeneralSettings } from './GeneralSettings';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
  }),
}));

vi.mock('@/hooks/useAnalyticsPreference', () => ({
  useAnalyticsPreference: () => [true, vi.fn()],
}));

vi.mock('@/context/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'system',
    setTheme: vi.fn(),
  }),
}));

vi.mock('@/components/LanguageSelector', () => ({
  LanguageSelector: ({ variant }: { variant?: string }) => (
    <div data-testid="language-selector">{variant}</div>
  ),
}));

describe('GeneralSettings', () => {
  it('renders the language selector inside the general settings panel', () => {
    render(<GeneralSettings />);

    expect(screen.getByText('Language')).toBeInTheDocument();
    expect(screen.getByText('Select Language')).toBeInTheDocument();
    expect(screen.getByTestId('language-selector')).toHaveTextContent('compact');
  });
});
