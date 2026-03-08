import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AssetsView } from './AssetsView';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (_key: string, fallback?: string) => fallback ?? _key,
    }),
}));

describe('AssetsView', () => {
    it('shows general assets by default and switches to cloud tabs', () => {
        render(
            <AssetsView
                onClose={vi.fn()}
                handleBack={vi.fn()}
                onAddAnnotation={vi.fn()}
                onAddSection={vi.fn()}
                onAddText={vi.fn()}
                onAddJourney={vi.fn()}
                onAddMindmap={vi.fn()}
                onAddArchitecture={vi.fn()}
                onAddImage={vi.fn()}
                onAddBrowserWireframe={vi.fn()}
                onAddMobileWireframe={vi.fn()}
                onAddDomainLibraryItem={vi.fn()}
            />
        );

        expect(screen.getByText('Sticky Note')).toBeTruthy();
        expect(screen.getByText('Architecture')).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: /AWS/i }));

        expect(screen.getByText('EC2 Instance')).toBeTruthy();
        expect(screen.queryByText('Sticky Note')).toBeNull();
    });

    it('filters assets when search is opened', () => {
        render(
            <AssetsView
                onClose={vi.fn()}
                handleBack={vi.fn()}
                onAddAnnotation={vi.fn()}
                onAddSection={vi.fn()}
                onAddText={vi.fn()}
                onAddJourney={vi.fn()}
                onAddMindmap={vi.fn()}
                onAddArchitecture={vi.fn()}
                onAddImage={vi.fn()}
                onAddBrowserWireframe={vi.fn()}
                onAddMobileWireframe={vi.fn()}
                onAddDomainLibraryItem={vi.fn()}
            />
        );

        fireEvent.click(screen.getByLabelText('Toggle asset search'));
        fireEvent.change(screen.getByPlaceholderText('Search assets...'), {
            target: { value: 'mobile' },
        });

        expect(screen.getByText('Mobile')).toBeTruthy();
        expect(screen.queryByText('Sticky Note')).toBeNull();
    });
});
