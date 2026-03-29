import { useCallback } from 'react';
import { useReactFlow } from '@/lib/reactflowCompat';
import type { FlowNode, NodeData } from '@/lib/types';
import { useFlowStore } from '../store';
import { useTranslation } from 'react-i18next';
import { createId } from '../lib/id';
import { relayoutMindmapComponent, syncMindmapEdges } from '@/lib/mindmapLayout';
import {
  applyMindmapVisibility,
  getMindmapChildrenById,
  getMindmapDescendantIds,
} from '@/lib/mindmapTree';
import {
  autoFitSectionsToChildren,
  bringContentsIntoSection,
  duplicateSectionWithChildren,
  fitSectionToChildren,
  reassignArchitectureNodeBoundary,
  releaseNodeFromSection,
  unparentSectionChildren,
} from './node-operations/utils';
import { useNodeOperationAdders } from './node-operations/useNodeOperationAdders';
import { useMindmapNodeOperations } from './node-operations/useMindmapNodeOperations';
import { useArchitectureNodeOperations } from './node-operations/useArchitectureNodeOperations';
import { useNodeDragOperations } from './node-operations/useNodeDragOperations';
import { syncSequenceEdgeParticipantKinds } from '@/services/sequence/sequenceMessage';
import { filterBulkUpdatesForNode } from '@/lib/nodeBulkEditing';

export const useNodeOperations = (recordHistory: () => void) => {
  useTranslation();
  const { nodes, setNodes, setEdges, setSelectedNodeId } = useFlowStore();
  useReactFlow();

  const mindmapOps = useMindmapNodeOperations(recordHistory);
  const archOps = useArchitectureNodeOperations(recordHistory);
  const dragOps = useNodeDragOperations(recordHistory);

  const applyMindmapBranchColor = useCallback(
    (nodesToUpdate: FlowNode[], nodeId: string, color: string) => {
      const childrenById = getMindmapChildrenById(nodesToUpdate, useFlowStore.getState().edges);
      const branchIds = new Set<string>([nodeId, ...getMindmapDescendantIds(nodeId, childrenById)]);
      return nodesToUpdate.map((node) =>
        branchIds.has(node.id)
          ? {
              ...node,
              data: {
                ...node.data,
                color,
                ...(color === 'custom' ? {} : { customColor: undefined }),
              },
            }
          : node
      );
    },
    []
  );

  // --- Node Data Updates ---
  const updateNodeData = useCallback(
    (id: string, data: Partial<NodeData>) => {
      const state = useFlowStore.getState();
      const existingNode = state.nodes.find((node) => node.id === id);
      if (!existingNode) {
        return;
      }

      if (existingNode.type === 'mindmap') {
        let nextNodes = state.nodes.map((node) =>
          node.id === id ? { ...node, data: { ...node.data, ...data } } : node
        );

        if (typeof data.color === 'string') {
          nextNodes = applyMindmapBranchColor(nextNodes, id, data.color);
        }

        if (
          typeof data.mindmapBranchStyle === 'string' ||
          typeof data.mindmapCollapsed === 'boolean' ||
          typeof data.color === 'string'
        ) {
          nextNodes = relayoutMindmapComponent(nextNodes, state.edges, id);
        }

        const nextEdges = syncMindmapEdges(nextNodes, state.edges);
        const visibilityState = applyMindmapVisibility(nextNodes, nextEdges);
        setNodes(() => visibilityState.nodes);
        setEdges(() => visibilityState.edges);
        return;
      }

      const updatesSequenceParticipantKind =
        existingNode.type === 'sequence_participant' &&
        typeof data.seqParticipantKind === 'string' &&
        data.seqParticipantKind !== existingNode.data.seqParticipantKind;

      setNodes((nds) => {
        return reassignArchitectureNodeBoundary({
          nodes: nds,
          nodeId: id,
          data,
        });
      });

      if (updatesSequenceParticipantKind) {
        setEdges((existingEdges) => {
          const nextNodes = state.nodes.map((node) =>
            node.id === id ? { ...node, data: { ...node.data, ...data } } : node
          );
          return syncSequenceEdgeParticipantKinds(nextNodes, existingEdges);
        });
      }
    },
    [applyMindmapBranchColor, setEdges, setNodes]
  );

  const applyBulkNodeData = useCallback(
    (
      updates: Partial<NodeData>,
      labelPrefix = '',
      labelSuffix = '',
      labelFindReplace?: { find: string; replace: string; useRegex: boolean }
    ) => {
      const hasFieldUpdates = Object.keys(updates).length > 0;
      const hasLabelUpdates = labelPrefix.length > 0 || labelSuffix.length > 0;
      const hasFindReplace = labelFindReplace !== undefined && labelFindReplace.find.length > 0;
      if (!hasFieldUpdates && !hasLabelUpdates && !hasFindReplace) {
        return 0;
      }

      const selectedNodes = useFlowStore.getState().nodes.filter((node) => node.selected);
      if (selectedNodes.length === 0) {
        return 0;
      }

      const selectedIds = new Set(selectedNodes.map((node) => node.id));
      recordHistory();
      setNodes((nds) =>
        nds.reduce<typeof nds>((nextNodes, node) => {
          if (!selectedIds.has(node.id)) {
            nextNodes.push(node);
            return nextNodes;
          }

          const filteredUpdates = filterBulkUpdatesForNode(node, updates);
          const nextData: NodeData = { ...node.data, ...filteredUpdates };
          if (hasLabelUpdates) {
            const baseLabel = node.data?.label ?? '';
            nextData.label = `${labelPrefix}${baseLabel}${labelSuffix}`;
          }
          if (hasFindReplace && labelFindReplace) {
            const baseLabel = node.data?.label ?? '';
            try {
              if (labelFindReplace.useRegex) {
                const regex = new RegExp(labelFindReplace.find, 'g');
                nextData.label = baseLabel.replace(regex, labelFindReplace.replace);
              } else {
                nextData.label = baseLabel
                  .split(labelFindReplace.find)
                  .join(labelFindReplace.replace);
              }
            } catch {
              // Invalid regex - skip this node
            }
          }

          if (
            Object.keys(filteredUpdates).length === 0 &&
            !hasLabelUpdates &&
            !hasFindReplace
          ) {
            nextNodes.push(node);
            return nextNodes;
          }

          nextNodes.push({ ...node, data: nextData });
          return nextNodes;
        }, [])
      );

      return selectedNodes.filter((node) => {
        return (
          Object.keys(filterBulkUpdatesForNode(node, updates)).length > 0 ||
          hasLabelUpdates ||
          hasFindReplace
        );
      }).length;
    },
    [recordHistory, setNodes]
  );

  const updateNodeType = useCallback(
    (id: string, type: string) => {
      recordHistory();
      setNodes((nds) => nds.map((node) => (node.id === id ? { ...node, type } : node)));
    },
    [setNodes, recordHistory]
  );

  const updateNodeZIndex = useCallback(
    (id: string, action: 'front' | 'back') => {
      recordHistory();
      setNodes((nds) => {
        const node = nds.find((n) => n.id === id);
        if (!node) return nds;

        const zIndices = nds.map((n) => n.zIndex || 0);
        const maxZ = Math.max(...zIndices, 0);
        const minZ = Math.min(...zIndices, 0);

        const newZ = action === 'front' ? maxZ + 1 : minZ - 1;

        return nds.map((n) => (n.id === id ? { ...n, zIndex: newZ } : n));
      });
    },
    [setNodes, recordHistory]
  );

  // --- Delete ---
  const deleteNode = useCallback(
    (id: string) => {
      recordHistory();
      setNodes((nds) => {
        const targetNode = nds.find((node) => node.id === id);
        if (!targetNode) {
          return nds;
        }

        if (targetNode.type !== 'section') {
          return autoFitSectionsToChildren(nds.filter((node) => node.id !== id));
        }

        const releasedNodes = unparentSectionChildren(id, nds).filter((node) => node.id !== id);
        return autoFitSectionsToChildren(releasedNodes);
      });
      setSelectedNodeId(null);
    },
    [setNodes, recordHistory, setSelectedNodeId]
  );

  // --- Duplicate ---
  const duplicateNode = useCallback(
    (id: string) => {
      const nodeToDuplicate = nodes.find((n) => n.id === id);
      if (!nodeToDuplicate) return;
      recordHistory();

      if (nodeToDuplicate.type === 'section') {
        setNodes((nds) => duplicateSectionWithChildren(nds, id));
        setSelectedNodeId(null);
        return;
      }

      const newNodeId = createId();
      const newNode: FlowNode = {
        ...nodeToDuplicate,
        id: newNodeId,
        position: { x: nodeToDuplicate.position.x + 50, y: nodeToDuplicate.position.y + 50 },
        selected: true,
      };
      setNodes((nds) => [...nds.map((n) => ({ ...n, selected: false })), newNode]);
      setSelectedNodeId(newNodeId);
    },
    [nodes, recordHistory, setNodes, setSelectedNodeId]
  );

  const fitSectionToContents = useCallback(
    (id: string) => {
      recordHistory();
      setNodes((nds) => {
        const section = nds.find((node) => node.id === id && node.type === 'section');
        if (!section) {
          return nds;
        }

        return fitSectionToChildren(
          {
            ...section,
            data: {
              ...section.data,
              sectionSizingMode: 'manual',
            },
          },
          nds
        );
      });
    },
    [recordHistory, setNodes]
  );

  const releaseFromSection = useCallback(
    (id: string) => {
      recordHistory();
      setNodes((nds) => releaseNodeFromSection(nds, id));
    },
    [recordHistory, setNodes]
  );

  const handleBringContentsIntoSection = useCallback(
    (id: string) => {
      recordHistory();
      setNodes((nds) => bringContentsIntoSection(nds, id));
    },
    [recordHistory, setNodes]
  );

  // --- Add Nodes ---
  const {
    handleAddShape,
    handleAddNode,
    handleAddAnnotation,
    handleAddJourneyNode,
    handleAddMindmapNode,
    handleAddArchitectureNode,
    handleAddSequenceParticipant,
    handleAddClassNode,
    handleAddEntityNode,
    handleAddSection,
    handleAddTextNode,
    handleAddImage,
    handleAddWireframe,
    handleAddDomainLibraryItem,
  } = useNodeOperationAdders({
    recordHistory,
    nodesLength: nodes.length,
    setNodes,
    setSelectedNodeId,
  });

  return {
    updateNodeData,
    applyBulkNodeData,
    updateNodeType,
    updateNodeZIndex,
    deleteNode,
    duplicateNode,
    fitSectionToContents,
    releaseFromSection,
    handleBringContentsIntoSection,
    handleAddShape,
    handleAddNode,
    handleAddAnnotation,
    handleAddJourneyNode,
    handleAddMindmapNode,
    handleAddArchitectureNode,
    handleAddSequenceParticipant,
    handleAddClassNode,
    handleAddEntityNode,
    handleAddSection,
    handleAddTextNode,
    handleAddImage,
    handleAddWireframe,
    handleAddDomainLibraryItem,
    ...mindmapOps,
    ...archOps,
    ...dragOps,
  };
};
