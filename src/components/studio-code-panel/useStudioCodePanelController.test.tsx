import { act, renderHook } from '@testing-library/react';
import type { TFunction } from 'i18next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useStudioCodePanelController } from './useStudioCodePanelController';

const applyCodeChangesMock = vi.fn();
const parseOpenFlowDSLMock = vi.fn();
const parseMermaidByTypeMock = vi.fn();
const toOpenFlowDSLMock = vi.fn();
const toMermaidMock = vi.fn();

vi.mock('@/components/command-bar/applyCodeChanges', () => ({
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

function createTranslator(fn: (key: string, options?: Record<string, unknown>) => string): TFunction {
  return fn as unknown as TFunction;
}

function createBaseProps(overrides: Partial<Parameters<typeof useStudioCodePanelController>[0]> = {}) {
  return {
    nodes: [],
    edges: [],
    mode: 'openflow' as const,
    onApply: vi.fn(),
    onModeChange: vi.fn(),
    activeTabId: 'tab-1',
    updateTab: vi.fn(),
    architectureStrictMode: false,
    setMermaidDiagnostics: vi.fn(),
    clearMermaidDiagnostics: vi.fn(),
    addToast: vi.fn(),
    t: createTranslator((key: string) => key),
    ...overrides,
  };
}

describe('useStudioCodePanelController', () => {
  beforeEach(() => {
    applyCodeChangesMock.mockReset();
    parseOpenFlowDSLMock.mockReset();
    parseMermaidByTypeMock.mockReset();
    toOpenFlowDSLMock.mockReset();
    toMermaidMock.mockReset();

    toOpenFlowDSLMock.mockReturnValue('flow: "Test"\ndirection: TB');
    toMermaidMock.mockReturnValue('flowchart TD\nA-->B');
    parseOpenFlowDSLMock.mockImplementation((input: string) => {
      if (input.includes('broken')) {
        return { nodes: [], edges: [], error: 'Line 1: Invalid DSL' };
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

  it('derives invalid preview state from broken drafts and resets cleanly', () => {
    const props = createBaseProps();
    const { result } = renderHook(() => useStudioCodePanelController(props));

    act(() => {
      result.current.handleCodeChange('broken dsl');
    });

    expect(result.current.draftPreview.state).toBe('error');
    expect(result.current.hasDraftChanges).toBe(true);

    act(() => {
      result.current.handleReset();
    });

    expect(result.current.code).toBe('flow: "Test"\ndirection: TB');
    expect(props.clearMermaidDiagnostics).toHaveBeenCalled();
  });

  it('applies valid drafts and clears the unsaved state', async () => {
    const props = createBaseProps();
    const { result } = renderHook(() => useStudioCodePanelController(props));

    act(() => {
      result.current.handleCodeChange('flow: "Updated"\ndirection: TB');
    });

    await act(async () => {
      await result.current.handleApply();
    });

    expect(applyCodeChangesMock).toHaveBeenCalledTimes(1);
    expect(result.current.hasDraftChanges).toBe(false);
    expect(result.current.draftPreview.state).toBe('ready');
  });

  it('surfaces partially editable Mermaid drafts as ready with warnings', () => {
    const props = createBaseProps({ mode: 'mermaid' });
    parseMermaidByTypeMock.mockReturnValue({
      nodes: [{ id: 'a' }],
      edges: [{ id: 'e' }],
      diagramType: 'flowchart',
      importState: 'editable_partial',
    });

    const { result } = renderHook(() => useStudioCodePanelController(props));

    expect(result.current.draftPreview.state).toBe('ready');
    expect(result.current.draftPreview.label).toBe('Ready with warnings');
    expect(result.current.draftPreview.detail).toContain('partial editability');
  });

  it('surfaces unsupported Mermaid families with fallback guidance', () => {
    const props = createBaseProps({ mode: 'mermaid' });
    parseMermaidByTypeMock.mockReturnValue({
      nodes: [],
      edges: [],
      diagramType: undefined,
      importState: 'unsupported_family',
      error: 'Mermaid "gitGraph" is not supported yet in editable mode.',
    });

    const { result } = renderHook(() => useStudioCodePanelController(props));

    expect(result.current.draftPreview.state).toBe('error');
    expect(result.current.draftPreview.label).toBe('Unsupported Mermaid family');
    expect(result.current.draftPreview.detail).toContain('not editable yet');
  });
});
