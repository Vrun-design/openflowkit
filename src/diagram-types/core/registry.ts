import type { DiagramType } from '@/lib/types';
import type { DiagramPlugin } from './contracts';

const pluginRegistry = new Map<DiagramType, DiagramPlugin>();

export function registerDiagramPlugin(plugin: DiagramPlugin): void {
  pluginRegistry.set(plugin.id, plugin);
}

export function getDiagramPlugin(diagramType: DiagramType): DiagramPlugin | undefined {
  return pluginRegistry.get(diagramType);
}

export function listDiagramPlugins(): DiagramPlugin[] {
  return Array.from(pluginRegistry.values());
}

export function resetDiagramPluginRegistryForTests(): void {
  pluginRegistry.clear();
}
