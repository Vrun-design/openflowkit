import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HomePage } from './HomePage';
import { useFlowStore } from '@/store';
import type { FlowTab } from '@/lib/types';
import type { FlowDocument } from '@/services/storage/flowDocumentModel';
import {
  WELCOME_MODAL_ENABLED_STORAGE_KEY,
  WELCOME_SEEN_STORAGE_KEY,
} from './home/welcomeModalState';
import { recordOnboardingEvent } from '@/services/onboarding/events';

vi.mock('react-i18next', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-i18next')>();
  return {
    ...actual,
    useTranslation: () => ({
      t: (
        key: string,
        fallbackOrOptions?: string | Record<string, unknown>,
        interpolation?: Record<string, unknown>
      ) => {
        const template =
          typeof fallbackOrOptions === 'string'
            ? fallbackOrOptions
            : typeof fallbackOrOptions?.defaultValue === 'string'
              ? fallbackOrOptions.defaultValue
              : key;
        const values = typeof fallbackOrOptions === 'string' ? interpolation : fallbackOrOptions;
        return template.replace(/{{(\w+)}}/g, (_match, name: string) =>
          String(values?.[name] ?? `{{${name}}}`)
        );
      },
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
  function setEmptyHomeState(): void {
    useFlowStore.setState({
      documents: [],
      activeDocumentId: '',
      tabs: [],
      activeTabId: null,
      nodes: [],
      edges: [],
    });
  }

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(WELCOME_MODAL_ENABLED_STORAGE_KEY, 'false');
    localStorage.setItem(WELCOME_SEEN_STORAGE_KEY, 'true');
    useFlowStore.setState({});
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:pre-delete-backup');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
  });

  afterEach(() => vi.restoreAllMocks());

  async function renderHomePage(
    props?: Partial<React.ComponentProps<typeof HomePage>>
  ): Promise<void> {
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
    expect(await screen.findByText('Estimate complete.')).toBeTruthy();
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
    setEmptyHomeState();

    await renderHomePage({ onLaunchWithTemplates, onLaunchWithAI });

    fireEvent.click(await screen.findByTestId('home-open-templates'));
    fireEvent.click(screen.getByTestId('home-generate-with-ai'));

    expect(onLaunchWithTemplates).toHaveBeenCalledTimes(1);
    expect(onLaunchWithAI).toHaveBeenCalledTimes(1);
  });

  it('keeps the empty dashboard focused on the primary actions', async () => {
    setEmptyHomeState();
    recordOnboardingEvent('welcome_prompt_selected', { source: 'welcome-modal' });
    recordOnboardingEvent('welcome_template_selected', { source: 'welcome-modal' });

    await renderHomePage();

    expect(screen.queryByText('Continue with a recent action')).toBeNull();
    expect(screen.getByTestId('home-generate-with-ai')).toBeTruthy();
    expect(screen.getByTestId('home-open-templates')).toBeTruthy();
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
    fireEvent.click(
      await within(deleteDialog).findByRole('button', {
        name: 'Download backup & delete',
      })
    );
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(useFlowStore.getState().tabs.some((tab) => tab.id === 'tab-1')).toBe(false);
  });

  it('downloads one canonical workspace bundle before atomic bulk deletion', async () => {
    const firstPage: FlowTab = {
      id: 'page-1',
      name: 'First',
      diagramType: 'flowchart',
      nodes: [
        {
          id: 'node-1',
          type: 'process',
          position: { x: 0, y: 0 },
          data: { label: 'First node' },
        },
      ],
      edges: [],
      history: { past: [], future: [] },
    };
    const secondPage: FlowTab = {
      id: 'page-2',
      name: 'Second',
      diagramType: 'flowchart',
      nodes: [
        {
          id: 'node-2',
          type: 'process',
          position: { x: 0, y: 0 },
          data: { label: 'Second node' },
        },
      ],
      edges: [],
      history: { past: [], future: [] },
    };
    useFlowStore.setState({
      documents: [
        createDocumentFromPages('document-1', 'First flow', [firstPage]),
        createDocumentFromPages('document-2', 'Second flow', [secondPage]),
      ],
      activeDocumentId: 'document-1',
      tabs: [firstPage],
      activeTabId: firstPage.id,
      nodes: firstPage.nodes,
      edges: [],
    });
    await renderHomePage();

    fireEvent.click(screen.getByRole('button', { name: 'Select all' }));
    expect(screen.getByRole('checkbox', { name: 'Select First flow' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Select Second flow' })).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: /Delete selected/ }));
    const dialog = screen.getByRole('dialog', { name: 'Delete selected flows' });
    fireEvent.click(
      await within(dialog).findByRole('button', {
        name: /Download backup & delete/,
      })
    );

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(useFlowStore.getState()).toMatchObject({
      documents: [],
      tabs: [],
      nodes: [],
      edges: [],
      activeDocumentId: '',
      activeTabId: '',
    });
    expect(screen.getByTestId('home-create-new-main')).toBeTruthy();
  });

  it('keeps every selected flow when one flow cannot be backed up safely', async () => {
    const validPage: FlowTab = {
      id: 'valid-page',
      name: 'Valid',
      diagramType: 'flowchart',
      nodes: [],
      edges: [],
      history: { past: [], future: [] },
    };
    const unsafePage: FlowTab = {
      id: 'unsafe-page',
      name: 'Unsafe',
      diagramType: 'flowchart',
      nodes: [],
      edges: [
        {
          id: 'dangling-edge',
          source: 'missing-source',
          target: 'missing-target',
        },
      ],
      history: { past: [], future: [] },
    };
    useFlowStore.setState({
      documents: [
        createDocumentFromPages('valid-document', 'Valid flow', [validPage]),
        createDocumentFromPages('unsafe-document', 'Unsafe flow', [unsafePage]),
      ],
      activeDocumentId: 'valid-document',
      tabs: [validPage],
      activeTabId: validPage.id,
      nodes: [],
      edges: [],
    });
    await renderHomePage();

    fireEvent.click(screen.getByRole('button', { name: 'Select all' }));
    fireEvent.click(screen.getByRole('button', { name: /Delete selected/ }));
    const dialog = screen.getByRole('dialog', { name: 'Delete selected flows' });

    expect(
      await within(dialog).findByRole('alert', {
        name: '',
      })
    ).toHaveTextContent('A complete workspace backup could not be prepared. Nothing was deleted.');
    expect(within(dialog).getByRole('button', { name: /Download backup & delete/ })).toBeDisabled();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(useFlowStore.getState().documents.map((document) => document.id)).toEqual([
      'valid-document',
      'unsafe-document',
    ]);
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
    fireEvent.click(
      await within(deleteDialog).findByRole('button', {
        name: 'Download backup & delete',
      })
    );

    const { tabs, activeTabId, nodes, edges } = useFlowStore.getState();
    expect(tabs).toHaveLength(0);
    expect(activeTabId).toBe('');
    expect(nodes).toHaveLength(0);
    expect(edges).toHaveLength(0);
    expect(screen.queryByText('Solo Flow')).toBeNull();
    expect(screen.getByTestId('home-create-new-main')).toBeTruthy();
  });

  it('fails closed when a portable backup cannot be prepared', async () => {
    const protectedNode = {
      id: 'protected-node',
      type: 'process',
      position: { x: 0, y: 0 },
      data: { label: 'Must survive' },
    } as FlowTab['nodes'][number];
    const danglingEdge = {
      id: 'dangling-edge',
      source: 'missing-node',
      target: protectedNode.id,
    } as FlowTab['edges'][number];
    const page: FlowTab = {
      id: 'tab-1',
      name: 'Protected Flow',
      diagramType: 'flowchart',
      nodes: [protectedNode],
      edges: [danglingEdge],
      history: { past: [], future: [] },
    };
    useFlowStore.setState({
      documents: [createDocumentFromPages('tab-1', 'Protected Flow', [page])],
      activeDocumentId: 'tab-1',
      tabs: [page],
      activeTabId: 'tab-1',
      nodes: [protectedNode],
      edges: [danglingEdge],
    });

    await renderHomePage();
    const flowCard = screen.getByText('Protected Flow').closest('.group') as HTMLElement;
    fireEvent.click(within(flowCard).getByLabelText('Delete'));

    const dialog = screen.getByRole('dialog', { name: 'Delete flow' });
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'A safe backup could not be prepared. The flow was not deleted.'
    );
    expect(
      within(dialog).getByRole('button', {
        name: 'Download backup & delete',
      })
    ).toBeDisabled();
    expect(useFlowStore.getState().documents.some(({ id }) => id === 'tab-1')).toBe(true);
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
});
