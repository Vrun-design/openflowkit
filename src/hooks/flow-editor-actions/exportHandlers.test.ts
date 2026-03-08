import type { TFunction } from 'i18next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FlowEdge, FlowNode } from '@/lib/types';
import {
  exportFigmaToClipboard,
  exportMermaidToClipboard,
  exportOpenFlowDSLToClipboard,
  exportPlantUMLToClipboard,
} from './exportHandlers';
import { getOpenFlowDSLExportDiagnostics, toOpenFlowDSL } from '@/services/openFlowDSLExporter';

vi.mock('@/services/exportService', () => ({
  toMermaid: vi.fn(() => 'mermaid-export'),
  toPlantUML: vi.fn(() => 'plantuml-export'),
}));

vi.mock('@/services/openFlowDSLExporter', () => ({
  toOpenFlowDSL: vi.fn(() => 'dsl-export'),
  getOpenFlowDSLExportDiagnostics: vi.fn(() => []),
}));

vi.mock('@/services/figmaExportService', () => ({
  toFigmaSVG: vi.fn(async () => '<svg />'),
}));

function createNode(id: string): FlowNode {
  return {
    id,
    type: 'process',
    position: { x: 0, y: 0 },
    data: { label: id, color: 'slate', shape: 'rounded' },
  };
}

function createEdge(id: string, source: string, target: string): FlowEdge {
  return { id, source, target };
}

function createTranslator(fn: (key: string, options?: Record<string, unknown>) => string): TFunction {
  return fn as unknown as TFunction;
}

describe('exportHandlers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('alert', vi.fn());
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('copies Mermaid and PlantUML exports and alerts success', async () => {
    const t = createTranslator((key: string) => key);
    const nodes = [createNode('n1')];
    const edges = [createEdge('e1', 'n1', 'n1')];

    await exportMermaidToClipboard({ nodes, edges, t });
    await exportPlantUMLToClipboard({ nodes, edges, t });

    expect(navigator.clipboard.writeText).toHaveBeenNthCalledWith(1, 'mermaid-export');
    expect(navigator.clipboard.writeText).toHaveBeenNthCalledWith(2, 'plantuml-export');
    expect(alert).toHaveBeenCalledWith('flowEditor.mermaidCopied');
    expect(alert).toHaveBeenCalledWith('flowEditor.plantUMLCopied');
  });

  it('copies OpenFlow DSL and emits warning toast for skipped edges', async () => {
    const addToast = vi.fn();
    vi.mocked(getOpenFlowDSLExportDiagnostics).mockReturnValueOnce([
      {
        edgeId: 'e-dangling',
        source: 'missing-a',
        target: 'missing-b',
        message: 'Edge skipped',
      },
    ]);

    await exportOpenFlowDSLToClipboard({
      nodes: [createNode('n1')],
      edges: [createEdge('e1', 'n1', 'n1')],
      addToast,
      t: createTranslator((key: string, options?: Record<string, unknown>) => {
        if (key === 'flowEditor.dslExportSkippedEdges') return `${String(options?.count)} skipped`;
        return key;
      }),
      exportSerializationMode: 'deterministic',
    });

    expect(toOpenFlowDSL).toHaveBeenCalledWith(
      expect.any(Array),
      expect.any(Array),
      { mode: 'deterministic' }
    );
    expect(addToast).toHaveBeenCalledWith('flowEditor.dslCopied', 'success');
    expect(addToast).toHaveBeenCalledWith('1 skipped', 'warning');
  });

  it('shows an error toast when Figma export copy fails', async () => {
    const addToast = vi.fn();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValueOnce(new Error('copy failed'));

    await exportFigmaToClipboard({
      nodes: [createNode('n1')],
      edges: [createEdge('e1', 'n1', 'n1')],
      addToast,
      t: createTranslator((key: string, options?: Record<string, unknown>) => options?.message ? `${key}:${String(options.message)}` : key),
    });

    expect(addToast).toHaveBeenCalledWith('flowEditor.figmaExportFailed:copy failed', 'error');
  });
});
