import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HomePage } from './HomePage';
import { useFlowStore } from '@/store';

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

    async function renderHomePage(props?: Partial<React.ComponentProps<typeof HomePage>>): Promise<void> {
        await act(async () => {
            render(
                <MemoryRouter>
                    <HomePage
                        onLaunch={vi.fn()}
                        onImportJSON={vi.fn()}
                        onRestoreSnapshot={vi.fn()}
                        onOpenFlow={vi.fn()}
                        {...props}
                    />
                </MemoryRouter>
            );
        });
    }

    it('switches from home to settings view via sidebar', async () => {
        await renderHomePage();

        fireEvent.click(screen.getByText('Settings'));
        expect(screen.getByRole('heading', { name: 'Settings' })).toBeTruthy();
        expect(screen.getByText('Flowpilot AI')).toBeTruthy();
    });

    it('opens persisted flows from the dashboard list', async () => {
        const onOpenFlow = vi.fn();
        useFlowStore.setState({
            tabs: [
                {
                    id: 'tab-1',
                    name: 'My Flow',
                    diagramType: 'flowchart',
                    nodes: [],
                    edges: [],
                    history: { past: [], future: [] },
                },
            ],
            activeTabId: 'tab-1',
            nodes: [],
            edges: [],
        });

        await renderHomePage({ onOpenFlow });

        fireEvent.click(await screen.findByText('My Flow'));
        expect(onOpenFlow).toHaveBeenCalledWith('tab-1');
    });

    it('duplicates and deletes flows from the dashboard actions', async () => {
        const onOpenFlow = vi.fn();
        useFlowStore.setState({
            tabs: [
                {
                    id: 'tab-1',
                    name: 'Flow One',
                    diagramType: 'flowchart',
                    updatedAt: '2026-03-07T00:00:00.000Z',
                    nodes: [],
                    edges: [],
                    history: { past: [], future: [] },
                },
                {
                    id: 'tab-2',
                    name: 'Flow Two',
                    diagramType: 'flowchart',
                    updatedAt: '2026-03-06T00:00:00.000Z',
                    nodes: [],
                    edges: [],
                    history: { past: [], future: [] },
                },
            ],
            activeTabId: 'tab-1',
            nodes: [],
            edges: [],
        });

        await renderHomePage({ onOpenFlow });

        fireEvent.click(screen.getAllByLabelText('Duplicate')[0]);
        expect(onOpenFlow).toHaveBeenCalledTimes(1);

        const flowOneCard = screen.getByText('Flow One').closest('.group') as HTMLElement;
        fireEvent.click(within(flowOneCard).getByLabelText('Delete'));
        const deleteDialog = screen.getByRole('dialog', { name: 'Delete flow' });
        fireEvent.click(within(deleteDialog).getByRole('button', { name: 'Delete' }));
        expect(useFlowStore.getState().tabs.some((tab) => tab.id === 'tab-1')).toBe(false);
    });

    it('renames flows from the dashboard actions with an app-native dialog', async () => {
        useFlowStore.setState({
            tabs: [
                {
                    id: 'tab-1',
                    name: 'Flow One',
                    diagramType: 'flowchart',
                    updatedAt: '2026-03-07T00:00:00.000Z',
                    nodes: [],
                    edges: [],
                    history: { past: [], future: [] },
                },
            ],
            activeTabId: 'tab-1',
            nodes: [],
            edges: [],
        });

        await renderHomePage();

        const flowCard = screen.getByText('Flow One').closest('.group') as HTMLElement;
        fireEvent.click(within(flowCard).getByLabelText('Rename'));

        const renameDialog = screen.getByRole('dialog', { name: 'Rename flow' });
        const renameInput = within(renameDialog).getByLabelText('Flow name');
        fireEvent.change(renameInput, { target: { value: '  Renamed Flow  ' } });
        fireEvent.click(within(renameDialog).getByRole('button', { name: 'Save' }));

        expect(useFlowStore.getState().tabs[0]?.name).toBe('Renamed Flow');
        expect(screen.getByText('Renamed Flow')).toBeTruthy();
    });
});
