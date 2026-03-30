import { describe, expect, it } from 'vitest';
import {
  getDiagramNodeProperties,
  getDiagramPlugin,
  listDiagramPlugins,
  resetDiagramNodePropertiesRegistryForTests,
  resetDiagramPluginRegistryForTests,
} from '@/diagram-types/core';
import {
  initializeDiagramTypeRuntime,
  resetDiagramTypeRuntimeForTests,
} from './bootstrap';

describe('diagram type bootstrap', () => {
  it('registers built-in plugins and property panels together', () => {
    resetDiagramTypeRuntimeForTests();
    resetDiagramPluginRegistryForTests();
    resetDiagramNodePropertiesRegistryForTests();

    initializeDiagramTypeRuntime();

    expect(getDiagramPlugin('flowchart')?.id).toBe('flowchart');
    expect(getDiagramPlugin('sequence')?.id).toBe('sequence');
    expect(getDiagramNodeProperties('classDiagram')).toBeDefined();
    expect(getDiagramNodeProperties('sequence')).toBeDefined();
  });

  it('is idempotent across repeated initialization', () => {
    resetDiagramTypeRuntimeForTests();
    resetDiagramPluginRegistryForTests();
    resetDiagramNodePropertiesRegistryForTests();

    initializeDiagramTypeRuntime();
    initializeDiagramTypeRuntime();

    expect(
      listDiagramPlugins().filter((plugin) => plugin.id === 'flowchart')
    ).toHaveLength(1);
  });
});
