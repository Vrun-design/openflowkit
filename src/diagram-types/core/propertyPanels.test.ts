import { describe, expect, it } from 'vitest';
import type { DiagramNodePropertiesComponent } from './propertyPanels';
import {
  getDiagramNodeProperties,
  registerDiagramNodeProperties,
  resetDiagramNodePropertiesRegistryForTests,
} from './propertyPanels';

describe('diagram property panel registry', () => {
  it('registers and resolves a diagram-specific node properties component', () => {
    resetDiagramNodePropertiesRegistryForTests();
    const component = (() => null) as DiagramNodePropertiesComponent;
    registerDiagramNodeProperties('classDiagram', component);

    expect(getDiagramNodeProperties('classDiagram')).toBe(component);
  });

  it('returns undefined when no component is registered', () => {
    resetDiagramNodePropertiesRegistryForTests();
    expect(getDiagramNodeProperties('journey')).toBeUndefined();
  });
});
