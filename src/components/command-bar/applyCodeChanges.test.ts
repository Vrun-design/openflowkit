import { describe, expect, it, vi } from 'vitest';
import { applyCodeChanges } from './applyCodeChanges';

vi.mock('@/services/composeDiagramForDisplay', () => ({
  composeDiagramForDisplay: vi.fn(async (nodes, edges) => ({ nodes, edges })),
}));

describe('applyCodeChanges', () => {
  it('blocks Mermaid apply when official validation rejects invalid syntax', async () => {
    const setMermaidDiagnostics = vi.fn();
    const setError = vi.fn();
    const setDiagnostics = vi.fn();
    const addToast = vi.fn();

    const applied = await applyCodeChanges({
      mode: 'mermaid',
      code: 'flowchart TD\nA -->',
      architectureStrictMode: false,
      onApply: vi.fn(),
      onClose: vi.fn(),
      activeTabId: 'tab-1',
      updateTab: vi.fn(),
      setMermaidDiagnostics,
      clearMermaidDiagnostics: vi.fn(),
      addToast,
      setError,
      setDiagnostics,
      setIsApplying: vi.fn(),
      setLiveStatus: vi.fn(),
      isLiveRequestStale: vi.fn(() => false),
      options: {
        closeOnSuccess: false,
        source: 'manual',
      },
    });

    expect(applied).toBe(false);
    expect(setError).toHaveBeenCalledWith(expect.stringContaining('Parse error'));
    expect(setDiagnostics).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          message: expect.stringContaining('Parse error'),
        }),
      ])
    );
    expect(setMermaidDiagnostics).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringContaining('Parse error'),
        originalSource: 'flowchart TD\nA -->',
        statusLabel: 'Unsupported Mermaid construct',
      })
    );
    expect(addToast).toHaveBeenCalled();
  });

  it('adds fallback guidance for unsupported Mermaid families', async () => {
    const setMermaidDiagnostics = vi.fn();
    const setError = vi.fn();
    const setDiagnostics = vi.fn();
    const addToast = vi.fn();

    const applied = await applyCodeChanges({
      mode: 'mermaid',
      code: 'gitGraph\ncommit id: "A"',
      architectureStrictMode: false,
      onApply: vi.fn(),
      onClose: vi.fn(),
      activeTabId: 'tab-1',
      updateTab: vi.fn(),
      setMermaidDiagnostics,
      clearMermaidDiagnostics: vi.fn(),
      addToast,
      setError,
      setDiagnostics,
      setIsApplying: vi.fn(),
      setLiveStatus: vi.fn(),
      isLiveRequestStale: vi.fn(() => false),
      options: {
        closeOnSuccess: false,
        source: 'manual',
      },
    });

    expect(applied).toBe(false);
    expect(setError).toHaveBeenCalledWith(expect.stringContaining('not editable yet'));
    expect(setMermaidDiagnostics).toHaveBeenCalledWith(
      expect.objectContaining({
        originalSource: 'gitGraph\ncommit id: "A"',
        statusLabel: 'Unsupported Mermaid family',
      })
    );
    expect(
      addToast.mock.calls.some(
        ([message]) => typeof message === 'string' && message.includes('not editable yet')
      )
    ).toBe(true);
  });
});
