import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HomePage } from './HomePage';
import { useFlowStore } from '@/store';
import type { FlowTab } from '@/lib/types';
import type { FlowDocument } from '@/services/storage/flowDocumentModel';
import { WELCOME_MODAL_ENABLED_STORAGE_KEY, WELCOME_SEEN_STORAGE_KEY } from './home/welcomeModalState';

vi.mock('react-i18next', async (importOriginal) => {
    const actual = await importOriginal<typeof import('react-i18next')>();
    return {
        ...actual,
        useTranslation: () => ({
            t: (_key: string, fallback?: string) => fallback ?? _key,
            i18n: {
                language: 'en',
                changeLanguage: vi.fn(),
            },
        }),
    };
});

vi.mock('./LanguageSelector', () => ({
    LanguageSelector: () => null,
}));

describe('HomePage integration flows', () => {
    beforeEach(() => {
        localStorage.clear();
        localStorage.setItem(WELCOME_MODAL_ENABLED_STORAGE_KEY, 'false');
        localStorage.setItem(WELCOME_SEEN_STORAGE_KEY, 'true');
        useFlowStore.setState({});
    });

    async function renderHomePage(props?: Partial<React.ComponentProps<typeof HomePage>>): Promise<void> {
        await act(async () => {
            render(
                <MemoryRouter>
                    <HomePage
                        onLaunch={vi.fn()}
                        onLaunchWithTemplates={vi.fn()}
                        onLaunchWithTemplate={vi.fn()}
                        onLaunchWithAI={vi.fn()}
                        onImportJSON={vi.fn()}
                        onOpenFlow={vi.fn()}
                        {...props}
                    />
                </MemoryRouter>
            );
        });
    }

    function createDocumentFromPages(id: string, name: string, pages: FlowTab[]): FlowDocument {
        return {
            id,
            name,
            createdAt: '2026-03-27T00:00:00.000Z',
            updatedAt: pages[0]?.updatedAt ?? '2026-03-27T00:00:00.000Z',
            activePageId: pages[0]?.id ?? '',
            pages,
        };
    }

    it('switches between home, templates, and settings views via sidebar', async () => {
        await renderHomePage();

        fireEvent.click(screen.getByTestId('sidebar-templates'));
        expect(screen.getByRole('heading', { name: 'Templates' })).toBeTruthy();
        expect(screen.getByText('Featured Templates')).toBeTruthy();

        fireEvent.click(screen.getByTestId('sidebar-settings'));
        expect(screen.getByRole('heading', { name: 'Settings' })).toBeTruthy();
        expect(screen.getByText('Flowpilot')).toBeTruthy();
    });

    it('opens the selected template flow from the homepage templates tab', async () => {
        const onLaunchWithTemplate = vi.fn();

        await renderHomePage({ onLaunchWithTemplate });

        fireEvent.click(screen.getByTestId('sidebar-templates'));
        fireEvent.click(screen.getByRole('button', { name: /AWS Event-Driven SaaS Platform/i }));
        fireEvent.click(screen.getByRole('button', { name: 'Use Template' }));

        expect(onLaunchWithTemplate).toHaveBeenCalledTimes(1);
        expect(onLaunchWithTemplate).toHaveBeenCalledWith('aws-event-driven-saas-platform');
    });

    it('shows only explicitly featured templates on the homepage templates tab', async () => {
        await renderHomePage();

        fireEvent.click(screen.getByTestId('sidebar-templates'));

        expect(screen.getByRole('button', { name: /AWS Event-Driven SaaS Platform/i })).toBeTruthy();
        expect(screen.queryByRole('button', { name: /Product Discovery Workshop Map/i })).toBeNull();
    });

    it('exposes template and flowpilot entry points in the empty dashboard state', async () => {
        const onLaunchWithTemplates = vi.fn();
        const onLaunchWithAI = vi.fn();
        useFlowStore.setState({
            documents: [],
            activeDocumentId: '',
            tabs: [],
            activeTabId: null,
            nodes: [],
            edges: [],
        });

        await renderHomePage({ onLaunchWithTemplates, onLaunchWithAI });

        fireEvent.click(await screen.findByTestId('home-open-templates'));
        fireEvent.click(screen.getByTestId('home-generate-with-ai'));

        expect(onLaunchWithTemplates).toHaveBeenCalledTimes(1);
        expect(onLaunchWithAI).toHaveBeenCalledTimes(1);
    });

    it('opens persisted flows from the dashboard list', async () => {
        const onOpenFlow = vi.fn();
        useFlowStore.setState({
            documents: [
                createDocumentFromPages('tab-1', 'My Flow', [
                    {
                        id: 'tab-1',
                        name: 'My Flow',
                        diagramType: 'flowchart',
                        nodes: [],
                        edges: [],
                        history: { past: [], future: [] },
                    },
                ]),
            ],
            activeDocumentId: 'tab-1',
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
            documents: [
                createDocumentFromPages('tab-1', 'Flow One', [
                    {
                        id: 'tab-1',
                        name: 'Flow One',
                        diagramType: 'flowchart',
                        updatedAt: '2026-03-07T00:00:00.000Z',
                        nodes: [],
                        edges: [],
                        history: { past: [], future: [] },
                    },
                ]),
                createDocumentFromPages('tab-2', 'Flow Two', [
                    {
                        id: 'tab-2',
                        name: 'Flow Two',
                        diagramType: 'flowchart',
                        updatedAt: '2026-03-06T00:00:00.000Z',
                        nodes: [],
                        edges: [],
                        history: { past: [], future: [] },
                    },
                ]),
            ],
            activeDocumentId: 'tab-1',
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
            documents: [
                createDocumentFromPages('tab-1', 'Flow One', [
                    {
                        id: 'tab-1',
                        name: 'Flow One',
                        diagramType: 'flowchart',
                        updatedAt: '2026-03-07T00:00:00.000Z',
                        nodes: [],
                        edges: [],
                        history: { past: [], future: [] },
                    },
                ]),
            ],
            activeDocumentId: 'tab-1',
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

    it('removes the final remaining flow and shows the empty dashboard state when deleted', async () => {
        useFlowStore.setState({
            documents: [
                createDocumentFromPages('tab-1', 'Solo Flow', [
                    {
                        id: 'tab-1',
                        name: 'Solo Flow',
                        diagramType: 'flowchart',
                        updatedAt: '2026-03-07T00:00:00.000Z',
                        nodes: [],
                        edges: [],
                        history: { past: [], future: [] },
                    },
                ]),
            ],
            activeDocumentId: 'tab-1',
            tabs: [
                {
                    id: 'tab-1',
                    name: 'Solo Flow',
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

        const flowCard = screen.getByText('Solo Flow').closest('.group') as HTMLElement;
        fireEvent.click(within(flowCard).getByLabelText('Delete'));

        const deleteDialog = screen.getByRole('dialog', { name: 'Delete flow' });
        fireEvent.click(within(deleteDialog).getByRole('button', { name: 'Delete' }));

        const { tabs, activeTabId, nodes, edges } = useFlowStore.getState();
        expect(tabs).toHaveLength(0);
        expect(activeTabId).toBe('');
        expect(nodes).toHaveLength(0);
        expect(edges).toHaveLength(0);
        expect(screen.queryByText('Solo Flow')).toBeNull();
        expect(screen.getByTestId('home-create-new')).toBeTruthy();
    });
});
