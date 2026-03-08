import { describe, expect, it } from 'vitest';
import { createFlowEditorImportRouteState, shouldOpenFlowEditorImportDialog } from './routeState';

describe('routeState', () => {
  it('creates route state that requests the flow editor import dialog', () => {
    expect(createFlowEditorImportRouteState()).toEqual({ openImportDialog: true });
  });

  it('detects only valid import-dialog route state payloads', () => {
    expect(shouldOpenFlowEditorImportDialog({ openImportDialog: true })).toBe(true);
    expect(shouldOpenFlowEditorImportDialog({ openImportDialog: false })).toBe(false);
    expect(shouldOpenFlowEditorImportDialog(null)).toBe(false);
    expect(shouldOpenFlowEditorImportDialog('import')).toBe(false);
  });
});
