export interface FlowEditorRouteState {
  openImportDialog?: boolean;
}

export function createFlowEditorImportRouteState(): FlowEditorRouteState {
  return { openImportDialog: true };
}

export function shouldOpenFlowEditorImportDialog(state: unknown): boolean {
  if (!state || typeof state !== 'object') {
    return false;
  }

  return (state as FlowEditorRouteState).openImportDialog === true;
}
