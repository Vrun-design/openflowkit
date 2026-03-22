import { describe, expect, it } from 'vitest';
import { resolveFlowExportViewport } from './flowExportViewport';

describe('resolveFlowExportViewport', () => {
  it('reports when the canvas wrapper is unavailable', () => {
    expect(resolveFlowExportViewport(null)).toEqual({
      viewport: null,
      message: 'The canvas is not mounted yet. Try again after the editor finishes loading.',
    });
  });

  it('reports when the viewport element is missing', () => {
    const root = document.createElement('div');

    expect(resolveFlowExportViewport(root)).toEqual({
      viewport: null,
      message: 'The canvas viewport could not be found. Try fitting the view or reopening the diagram.',
    });
  });

  it('returns the viewport element when present', () => {
    const root = document.createElement('div');
    const viewport = document.createElement('div');
    viewport.className = 'react-flow__viewport';
    root.appendChild(viewport);

    expect(resolveFlowExportViewport(root)).toEqual({ viewport });
  });
});
