import { useCallback } from 'react';
import type { FlowNode } from '@/lib/types';
import { useFlowStore } from '../../store';
import { createId } from '../../lib/id';
import { createDefaultEdge } from '@/constants';
import { assignSmartHandlesWithOptions, getSmartRoutingOptionsFromViewSettings } from '../../services/smartEdgeRouting';
import { buildArchitectureTemplate, type ArchitectureTemplateId } from '@/lib/architectureTemplates';
import { convertSelectedErNodesToClassDiagram } from '@/lib/erToClassConversion';
import { createArchitectureServiceNode } from './utils';

export const useArchitectureNodeOperations = (recordHistory: () => void) => {
    const { setNodes, setEdges, setSelectedNodeId } = useFlowStore();

    const handleAddArchitectureService = useCallback((sourceId: string): boolean => {
        const state = useFlowStore.getState();
        const sourceNode = state.nodes.find((node) => node.id === sourceId);
        if (!sourceNode || sourceNode.type !== 'architecture') {
            return false;
        }

        const id = createId('arch');
        const { activeLayerId, viewSettings } = state;
        const sameBoundaryNodes = state.nodes.filter(
            (node) => node.type === 'architecture' && node.data?.archBoundaryId === sourceNode.data?.archBoundaryId
        );
        const yOffset = sameBoundaryNodes.length * 90;

        const newNode = createArchitectureServiceNode({
            id,
            position: {
                x: sourceNode.position.x + 260,
                y: sourceNode.position.y + yOffset,
            },
            sourceNode,
            layerId: activeLayerId,
        });

        recordHistory();
        setNodes((existingNodes) => [
            ...existingNodes.map((node) => ({ ...node, selected: false })),
            newNode,
        ]);
        setEdges((existingEdges) => {
            const insertedEdges = existingEdges.concat(createDefaultEdge(sourceId, id));
            if (!viewSettings.smartRoutingEnabled) {
                return insertedEdges;
            }
            return assignSmartHandlesWithOptions(
                useFlowStore.getState().nodes.concat(newNode),
                insertedEdges,
                getSmartRoutingOptionsFromViewSettings(viewSettings)
            );
        });
        setSelectedNodeId(id);
        return true;
    }, [recordHistory, setNodes, setEdges, setSelectedNodeId]);

    const handleCreateArchitectureBoundary = useCallback((sourceId: string): boolean => {
        void sourceId;
        return false;
    }, []);

    const handleApplyArchitectureTemplate = useCallback((sourceId: string, templateId: ArchitectureTemplateId): boolean => {
        const state = useFlowStore.getState();
        const sourceNode = state.nodes.find((node) => node.id === sourceId);
        if (!sourceNode || sourceNode.type !== 'architecture') {
            return false;
        }

        const template = buildArchitectureTemplate(
            templateId,
            sourceNode,
            (key) => createId(`arch-${key}`),
            (key) => createId(`edge-${key}`),
        );
        if (!template) {
            return false;
        }

        const nextNodes: FlowNode[] = state.nodes.map((node) => {
            if (node.id === sourceId) {
                return {
                    ...node,
                    selected: true,
                    data: {
                        ...node.data,
                        ...template.sourceData,
                    },
                };
            }
            return { ...node, selected: false };
        });
        nextNodes.push(...template.nodes);
        const nextEdges = state.edges.concat(template.edges);

        recordHistory();
        setNodes(() => nextNodes);
        setEdges(() => {
            if (!state.viewSettings.smartRoutingEnabled) {
                return nextEdges;
            }

            return assignSmartHandlesWithOptions(
                nextNodes,
                nextEdges,
                getSmartRoutingOptionsFromViewSettings(state.viewSettings),
            );
        });
        setSelectedNodeId(sourceId);
        return true;
    }, [recordHistory, setEdges, setNodes, setSelectedNodeId]);

    const handleConvertEntitySelectionToClassDiagram = useCallback((): boolean => {
        const state = useFlowStore.getState();
        const result = convertSelectedErNodesToClassDiagram(state.nodes, state.edges);
        if (result.changedNodeIds.length === 0) {
            return false;
        }

        recordHistory();
        setNodes(() => result.nodes);
        setEdges(() => result.edges);

        if (state.activeTabId) {
            state.updateTab(state.activeTabId, { diagramType: 'classDiagram' });
        }

        return true;
    }, [recordHistory, setEdges, setNodes]);

    return {
        handleAddArchitectureService,
        handleCreateArchitectureBoundary,
        handleApplyArchitectureTemplate,
        handleConvertEntitySelectionToClassDiagram,
    };
};
