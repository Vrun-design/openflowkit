import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HomePage } from './HomePage';
import { useFlowStore } from '@/store';
import type { FlowSnapshot } from '@/lib/types';

vi.mock('react-i18next', async (importOriginal) => {
    const actual = await importOriginal<typeof import('react-i18next')>();
    return {
        ...actual,
        useTranslation: () => ({
            t: (_key: string, fallback?: string) => fallback ?? _key,
        }),
    };
});

vi.mock('./LanguageSelector', () => ({
    LanguageSelector: () => null,
}));

function createSnapshot(id: string, name: string): FlowSnapshot {
    return {
        id,
        name,
        timestamp: '2026-03-02T00:00:00.000Z',
        nodes: [],
        edges: [],
    };
}

describe('HomePage integration flows', () => {
    beforeEach(() => {
        localStorage.clear();
        useFlowStore.setState({
            brandConfig: {
                appName: 'OpenFlowKit',
                logoUrl: null,
                faviconUrl: '/favicon.svg',
                logoStyle: 'both',
                colors: {
                    primary: '#E95420',
                    secondary: '#64748b',
                    background: '#f8fafc',
                    surface: '#ffffff',
                    text: '#0f172a',
                },
                typography: { fontFamily: 'Inter' },
                shape: { radius: 8, borderWidth: 1 },
                ui: { glassmorphism: true, buttonStyle: 'beveled', showBeta: true },
            },
        });
    });

    function renderHomePage(props?: Partial<React.ComponentProps<typeof HomePage>>): void {
        render(
            <MemoryRouter>
                <HomePage
                    onLaunch={vi.fn()}
                    onImportJSON={vi.fn()}
                    onRestoreSnapshot={vi.fn()}
                    {...props}
                />
            </MemoryRouter>
        );
    }

    it('switches from home to settings view via sidebar', () => {
        renderHomePage();

        fireEvent.click(screen.getByText('Settings'));
        expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
        expect(screen.getByText('Flowpilot AI')).toBeInTheDocument();
    });

    it('restores a snapshot and launches editor when a snapshot card is clicked', () => {
        const onLaunch = vi.fn();
        const onRestoreSnapshot = vi.fn();
        localStorage.setItem('flowmind_snapshots', JSON.stringify([createSnapshot('snap-1', 'My Snapshot')]));

        renderHomePage({ onLaunch, onRestoreSnapshot });

        fireEvent.click(screen.getByText('My Snapshot'));
        expect(onRestoreSnapshot).toHaveBeenCalledTimes(1);
        expect(onLaunch).toHaveBeenCalledTimes(1);
    });
});
