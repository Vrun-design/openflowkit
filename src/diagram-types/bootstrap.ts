import { BUILT_IN_DIAGRAM_PLUGINS } from './builtInPlugins';
import { BUILT_IN_DIAGRAM_PROPERTY_PANELS } from './builtInPropertyPanels';
import {
  registerDiagramNodeProperties,
  registerDiagramPlugin,
} from './core';

let didInitializeDiagramTypeRuntime = false;

export function initializeDiagramTypeRuntime(): void {
  if (didInitializeDiagramTypeRuntime) {
    return;
  }

  for (const plugin of BUILT_IN_DIAGRAM_PLUGINS) {
    registerDiagramPlugin(plugin);
  }

  for (const panel of BUILT_IN_DIAGRAM_PROPERTY_PANELS) {
    registerDiagramNodeProperties(panel.diagramType, panel.component);
  }

  didInitializeDiagramTypeRuntime = true;
}

export function resetDiagramTypeRuntimeForTests(): void {
  didInitializeDiagramTypeRuntime = false;
}
