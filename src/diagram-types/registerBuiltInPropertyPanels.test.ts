import { describe, expect, it } from 'vitest';
import {
  getDiagramNodeProperties,
  resetDiagramNodePropertiesRegistryForTests,
} from '@/diagram-types/core';
import {
  registerBuiltInPropertyPanels,
  resetBuiltInPropertyPanelRegistrationForTests,
} from './registerBuiltInPropertyPanels';

describe('registerBuiltInPropertyPanels', () => {
  it('registers classDiagram node properties component', () => {
    resetBuiltInPropertyPanelRegistrationForTests();
    resetDiagramNodePropertiesRegistryForTests();
    registerBuiltInPropertyPanels();
    expect(getDiagramNodeProperties('classDiagram')).toBeDefined();
    expect(getDiagramNodeProperties('erDiagram')).toBeDefined();
    expect(getDiagramNodeProperties('mindmap')).toBeDefined();
    expect(getDiagramNodeProperties('journey')).toBeDefined();
    expect(getDiagramNodeProperties('architecture')).toBeDefined();
  });
});
