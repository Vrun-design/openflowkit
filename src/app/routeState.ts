export interface FlowEditorRouteState {
  openImportDialog?: boolean;
  openTemplates?: boolean;
}

export function createFlowEditorImportRouteState(): FlowEditorRouteState {
  return { openImportDialog: true };
}

export function createFlowEditorTemplatesRouteState(): FlowEditorRouteState {
  return { openTemplates: true };
}

export function shouldOpenFlowEditorImportDialog(state: unknown): boolean {
  if (!state || typeof state !== 'object') return false;
  return (state as FlowEditorRouteState).openImportDialog === true;
}

export function shouldOpenFlowEditorTemplates(state: unknown): boolean {
  if (!state || typeof state !== 'object') return false;
  return (state as FlowEditorRouteState).openTemplates === true;
}
