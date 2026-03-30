import { describe, expect, it } from 'vitest';
import {
  createFlowEditorAIRouteState,
  createFlowEditorImportRouteState,
  shouldOpenFlowEditorAI,
  shouldOpenFlowEditorImportDialog,
  shouldOpenFlowEditorTemplates,
} from './routeState';

describe('routeState', () => {
  it('creates route state that requests the flow editor import dialog', () => {
    expect(createFlowEditorImportRouteState()).toEqual({ openImportDialog: true });
  });

  it('creates route state that requests templates and studio ai entry points', () => {
    expect(createFlowEditorAIRouteState()).toEqual({ openStudioAI: true });
    expect(shouldOpenFlowEditorTemplates({ openTemplates: true })).toBe(true);
  });

  it('detects only valid import-dialog route state payloads', () => {
    expect(shouldOpenFlowEditorImportDialog({ openImportDialog: true })).toBe(true);
    expect(shouldOpenFlowEditorImportDialog({ openImportDialog: false })).toBe(false);
    expect(shouldOpenFlowEditorImportDialog(null)).toBe(false);
    expect(shouldOpenFlowEditorImportDialog('import')).toBe(false);
  });

  it('detects template and studio-ai route state payloads', () => {
    expect(shouldOpenFlowEditorTemplates({ openTemplates: true })).toBe(true);
    expect(shouldOpenFlowEditorTemplates({ openTemplates: false })).toBe(false);
    expect(shouldOpenFlowEditorAI({ openStudioAI: true })).toBe(true);
    expect(shouldOpenFlowEditorAI({ openStudioAI: false })).toBe(false);
  });
});
