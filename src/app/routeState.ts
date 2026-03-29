export interface FlowEditorRouteState {
  openImportDialog?: boolean;
  openTemplates?: boolean;
  openStudioAI?: boolean;
  initialTemplateId?: string;
}

export function createFlowEditorImportRouteState(): FlowEditorRouteState {
  return { openImportDialog: true };
}

export function createFlowEditorTemplatesRouteState(): FlowEditorRouteState {
  return { openTemplates: true };
}

export function createFlowEditorInitialTemplateRouteState(templateId: string): FlowEditorRouteState {
  return { initialTemplateId: templateId };
}

export function createFlowEditorAIRouteState(): FlowEditorRouteState {
  return { openStudioAI: true };
}

export function shouldOpenFlowEditorImportDialog(state: unknown): boolean {
  if (!state || typeof state !== 'object') return false;
  return (state as FlowEditorRouteState).openImportDialog === true;
}

export function shouldOpenFlowEditorTemplates(state: unknown): boolean {
  if (!state || typeof state !== 'object') return false;
  return (state as FlowEditorRouteState).openTemplates === true;
}

export function shouldOpenFlowEditorAI(state: unknown): boolean {
  if (!state || typeof state !== 'object') return false;
  return (state as FlowEditorRouteState).openStudioAI === true;
}

export function getInitialFlowEditorTemplateId(state: unknown): string | null {
  if (!state || typeof state !== 'object') return null;
  return typeof (state as FlowEditorRouteState).initialTemplateId === 'string'
    ? (state as FlowEditorRouteState).initialTemplateId as string
    : null;
}
