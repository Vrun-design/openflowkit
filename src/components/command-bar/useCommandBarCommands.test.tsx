import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useCommandBarCommands } from './useCommandBarCommands';

describe('useCommandBarCommands', () => {
  it('exposes every wired editor action and every root navigation surface', () => {
    const callbacks = {
      onUndo: vi.fn(),
      onRedo: vi.fn(),
      onOpenStudioAI: vi.fn(),
      onOpenStudioOpenFlow: vi.fn(),
      onOpenStudioMermaid: vi.fn(),
      onOpenStudioPlayback: vi.fn(),
      onOpenArchitectureRules: vi.fn(),
      onAddAnnotation: vi.fn(),
      onAddSection: vi.fn(),
      onAddText: vi.fn(),
      onAddJourney: vi.fn(),
      onAddMindmap: vi.fn(),
      onAddArchitecture: vi.fn(),
      onAddSequence: vi.fn(),
      onAddClassNode: vi.fn(),
      onAddEntityNode: vi.fn(),
      onAddBrowserWireframe: vi.fn(),
      onAddMobileWireframe: vi.fn(),
    };
    const onToggleGrid = vi.fn();
    const onToggleSnap = vi.fn();
    const { result } = renderHook(() =>
      useCommandBarCommands({
        ...callbacks,
        settings: { showGrid: true, onToggleGrid, snapToGrid: false, onToggleSnap },
        hasImport: true,
      })
    );

    expect(result.current.map((command) => command.id)).toEqual([
      'studio-ai',
      'import',
      'templates',
      'assets',
      'search-nodes',
      'layout',
      'layers',
      'pages',
      'design-system',
      'studio-openflow',
      'studio-mermaid',
      'studio-playback',
      'architecture-rules',
      'add-annotation',
      'add-section',
      'add-text',
      'add-journey',
      'add-mindmap',
      'add-architecture',
      'add-sequence',
      'add-class',
      'add-entity',
      'add-browser-wireframe',
      'add-mobile-wireframe',
      'undo',
      'redo',
      'select-all-nodes',
      'select-all-edges',
      'clear-selection',
      'toggle-grid',
      'toggle-snap',
    ]);

    const callbackByCommandId: Record<string, ReturnType<typeof vi.fn>> = {
      'studio-ai': callbacks.onOpenStudioAI,
      'studio-openflow': callbacks.onOpenStudioOpenFlow,
      'studio-mermaid': callbacks.onOpenStudioMermaid,
      'studio-playback': callbacks.onOpenStudioPlayback,
      'architecture-rules': callbacks.onOpenArchitectureRules,
      'add-annotation': callbacks.onAddAnnotation,
      'add-section': callbacks.onAddSection,
      'add-text': callbacks.onAddText,
      'add-journey': callbacks.onAddJourney,
      'add-mindmap': callbacks.onAddMindmap,
      'add-architecture': callbacks.onAddArchitecture,
      'add-sequence': callbacks.onAddSequence,
      'add-class': callbacks.onAddClassNode,
      'add-entity': callbacks.onAddEntityNode,
      'add-browser-wireframe': callbacks.onAddBrowserWireframe,
      'add-mobile-wireframe': callbacks.onAddMobileWireframe,
      undo: callbacks.onUndo,
      redo: callbacks.onRedo,
      'toggle-grid': onToggleGrid,
      'toggle-snap': onToggleSnap,
    };

    for (const [id, callback] of Object.entries(callbackByCommandId)) {
      result.current.find((command) => command.id === id)?.action?.();
      expect(callback, id).toHaveBeenCalledTimes(1);
    }
  });

  it('omits optional actions without handlers instead of rendering inert commands', () => {
    const { result } = renderHook(() => useCommandBarCommands({}));
    const inertActions = result.current.filter(
      (command) => command.type === 'action' && !command.action
    );

    expect(inertActions).toEqual([]);
    expect(result.current.some((command) => command.id === 'studio-ai')).toBe(false);
    expect(result.current.some((command) => command.id === 'import')).toBe(false);
    expect(result.current.some((command) => command.id === 'pages')).toBe(true);
  });

  it('gives advanced commands semantic search aliases', () => {
    const { result } = renderHook(() =>
      useCommandBarCommands({
        onOpenStudioOpenFlow: vi.fn(),
        onAddMobileWireframe: vi.fn(),
      })
    );

    expect(result.current.find((command) => command.id === 'studio-openflow')?.keywords).toContain(
      'dsl'
    );
    expect(
      result.current.find((command) => command.id === 'add-mobile-wireframe')?.keywords
    ).toContain('phone');
  });
});
