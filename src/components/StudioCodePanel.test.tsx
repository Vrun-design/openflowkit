import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StudioCodePanel } from './StudioCodePanel';
import { useFlowStore } from '@/store';

const applyCodeChangesMock = vi.fn();
const parseOpenFlowDSLMock = vi.fn();
const parseMermaidByTypeMock = vi.fn();
const toOpenFlowDSLMock = vi.fn();
const toMermaidMock = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (key === 'commandBar.code.dslPlaceholder') return `Paste ${(options?.appName as string) || 'App'} DSL code here...`;
      if (key === 'commandBar.code.mermaidPlaceholder') return 'Paste Mermaid code here...';
      if (key === 'commandBar.code.syntaxGuide') return 'Syntax Guide';
      if (key === 'commandBar.code.linePrefix') return `Line ${options?.line as number}: `;
      return key;
    },
  }),
}));

vi.mock('./ui/ToastContext', () => ({
  useToast: () => ({
    addToast: vi.fn(),
  }),
}));

vi.mock('./command-bar/applyCodeChanges', () => ({
  applyCodeChanges: (...args: unknown[]) => applyCodeChangesMock(...args),
}));

vi.mock('@/lib/openFlowDSLParser', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/openFlowDSLParser')>();
  return {
    ...actual,
    parseOpenFlowDSL: (...args: unknown[]) => parseOpenFlowDSLMock(...args),
  };
});

vi.mock('@/services/mermaid/parseMermaidByType', () => ({
  parseMermaidByType: (...args: unknown[]) => parseMermaidByTypeMock(...args),
}));

vi.mock('@/services/openFlowDSLExporter', () => ({
  toOpenFlowDSL: (...args: unknown[]) => toOpenFlowDSLMock(...args),
}));

vi.mock('@/services/exportService', () => ({
  toMermaid: (...args: unknown[]) => toMermaidMock(...args),
}));

describe('StudioCodePanel', () => {
  beforeEach(() => {
    applyCodeChangesMock.mockReset();
    parseOpenFlowDSLMock.mockReset();
    parseMermaidByTypeMock.mockReset();
    toOpenFlowDSLMock.mockReset();
    toMermaidMock.mockReset();

    useFlowStore.setState({
      activeTabId: 'tab-1',
      viewSettings: {
        ...useFlowStore.getState().viewSettings,
        architectureStrictMode: false,
      },
      mermaidDiagnostics: null,
      setMermaidDiagnostics: vi.fn(),
      clearMermaidDiagnostics: vi.fn(),
    });

    toOpenFlowDSLMock.mockReturnValue('flow: "Test"\ndirection: TB');
    toMermaidMock.mockReturnValue('flowchart TD\nA-->B');
    parseOpenFlowDSLMock.mockImplementation((input: string) => {
      if (input.includes('broken')) {
        return { nodes: [], edges: [], error: 'Line 1: Invalid DSL', diagnostics: [{ message: 'Invalid DSL', line: 1 }] };
      }
      return { nodes: [{ id: 'a' }], edges: [{ id: 'e' }] };
    });
    parseMermaidByTypeMock.mockImplementation((input: string) => {
      if (input.includes('broken')) {
        return { nodes: [], edges: [], error: 'Invalid Mermaid' };
      }
      return { nodes: [{ id: 'a' }], edges: [{ id: 'e' }], diagramType: 'flowchart' };
    });
    applyCodeChangesMock.mockResolvedValue(true);
  });

  it('disables apply when the draft is invalid', () => {
    render(<StudioCodePanel nodes={[]} edges={[]} onApply={vi.fn()} mode="openflow" onModeChange={vi.fn()} />);

    const textbox = screen.getByRole('textbox');
    fireEvent.change(textbox, { target: { value: 'broken dsl' } });

    expect(screen.getByText('Needs fixes')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Apply to canvas' }).hasAttribute('disabled')).toBe(true);
  });

  it('applies valid changed drafts and marks them applied', async () => {
    render(<StudioCodePanel nodes={[]} edges={[]} onApply={vi.fn()} mode="openflow" onModeChange={vi.fn()} />);

    const textbox = screen.getByRole('textbox');
    fireEvent.change(textbox, { target: { value: 'flow: "Updated"\ndirection: TB' } });

    const applyButton = screen.getByRole('button', { name: 'Apply to canvas' });
    expect(applyButton.hasAttribute('disabled')).toBe(false);

    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(applyCodeChangesMock).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.queryByText('Unsaved')).toBeNull();
    });
  });

  it('shows partially editable Mermaid drafts as ready with warnings', () => {
    parseMermaidByTypeMock.mockReturnValue({
      nodes: [{ id: 'a' }],
      edges: [{ id: 'e' }],
      diagramType: 'flowchart',
      importState: 'editable_partial',
    });

    render(<StudioCodePanel nodes={[]} edges={[]} onApply={vi.fn()} mode="mermaid" onModeChange={vi.fn()} />);

    expect(screen.getByText('Ready with warnings')).not.toBeNull();
    expect(screen.getByText(/partial editability/)).not.toBeNull();
  });

  it('renders stored Mermaid diagnostics status as a visible banner', () => {
    useFlowStore.setState({
      mermaidDiagnostics: {
        source: 'code',
        diagramType: 'flowchart',
        importState: 'editable_partial',
        statusLabel: 'Ready with warnings',
        statusDetail: '2 nodes, 1 edges, partial editability',
        diagnostics: [{ message: 'Diagnostic warning' }],
        updatedAt: 1,
      },
    });

    render(<StudioCodePanel nodes={[]} edges={[]} onApply={vi.fn()} mode="mermaid" onModeChange={vi.fn()} />);

    expect(screen.getAllByText('Ready with warnings').length).toBeGreaterThan(0);
    expect(screen.getByText('2 nodes, 1 edges, partial editability')).toBeTruthy();
  });
});
