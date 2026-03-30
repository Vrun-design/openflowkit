import { registerDiagramNodeProperties } from '@/diagram-types/core';
import { BUILT_IN_DIAGRAM_PROPERTY_PANELS } from './builtInPropertyPanels';

let didRegisterBuiltInPropertyPanels = false;

export function registerBuiltInPropertyPanels(): void {
  if (didRegisterBuiltInPropertyPanels) {
    return;
  }

  for (const panel of BUILT_IN_DIAGRAM_PROPERTY_PANELS) {
    registerDiagramNodeProperties(panel.diagramType, panel.component);
  }

  didRegisterBuiltInPropertyPanels = true;
}

export function resetBuiltInPropertyPanelRegistrationForTests(): void {
  didRegisterBuiltInPropertyPanels = false;
}
