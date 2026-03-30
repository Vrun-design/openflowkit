import { registerDiagramPlugin } from '@/diagram-types/core';
import { BUILT_IN_DIAGRAM_PLUGINS } from './builtInPlugins';

let didRegisterBuiltIns = false;

export function registerBuiltInDiagramPlugins(): void {
  if (didRegisterBuiltIns) {
    return;
  }

  for (const plugin of BUILT_IN_DIAGRAM_PLUGINS) {
    registerDiagramPlugin(plugin);
  }

  didRegisterBuiltIns = true;
}

export function resetBuiltInDiagramPluginRegistrationForTests(): void {
  didRegisterBuiltIns = false;
}
