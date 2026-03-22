export interface FlowExportViewportResult {
  viewport: HTMLElement | null;
  message?: string;
}

export function resolveFlowExportViewport(root: HTMLDivElement | null): FlowExportViewportResult {
  if (!root) {
    return {
      viewport: null,
      message: 'The canvas is not mounted yet. Try again after the editor finishes loading.',
    };
  }

  const viewport = root.querySelector<HTMLElement>('.react-flow__viewport');
  if (!viewport) {
    return {
      viewport: null,
      message: 'The canvas viewport could not be found. Try fitting the view or reopening the diagram.',
    };
  }

  return { viewport };
}
