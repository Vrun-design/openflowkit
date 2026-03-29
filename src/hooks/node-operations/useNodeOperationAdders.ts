import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { createId } from '@/lib/id';
import type { FlowNode, NodeData } from '@/lib/types';
import { createDomainLibraryNode, type DomainLibraryItem } from '@/services/domainLibrary';
import { useFlowStore } from '@/store';
import { queueNodeLabelEditRequest } from '@/hooks/nodeLabelEditRequest';
import {
  createAnnotationNode,
  createGenericShapeNode,
  createImageNode,
  createSectionNode,
  createTextNode,
  getDefaultNodePosition,
  getNextSectionOrder,
  getSectionInsertPosition,
  insertNodeIntoNearestSection,
  wrapSelectionInSection,
} from './utils';

interface UseNodeOperationAddersParams {
  recordHistory: () => void;
  nodesLength: number;
  setNodes: (updater: (nodes: FlowNode[]) => FlowNode[]) => void;
  setSelectedNodeId: (nodeId: string | null) => void;
}

export function useNodeOperationAdders({
  recordHistory,
  nodesLength,
  setNodes,
  setSelectedNodeId,
}: UseNodeOperationAddersParams) {
  const { t } = useTranslation();

  const commitAddedNode = useCallback(
    (
      id: string,
      createNode: (resolvedPosition?: { x: number; y: number }) => FlowNode,
      explicitPosition?: { x: number; y: number }
    ) => {
      const { activeLayerId, selectedNodeId } = useFlowStore.getState();

      setNodes((nds) => {
        const selectedSection =
          selectedNodeId
            ? nds.find((node) => node.id === selectedNodeId && node.type === 'section')
            : null;
        const fallbackPosition =
          explicitPosition
            ?? (selectedSection ? getSectionInsertPosition(selectedSection, nds) : undefined)
            ?? getDefaultNodePosition(nds.length, 100, 100);

        const createdNode = createNode(fallbackPosition);
        const baseNode: FlowNode = {
          ...createdNode,
          data: {
            ...createdNode.data,
            layerId: createdNode.data?.layerId ?? activeLayerId,
          },
        };

        const parentedNode = insertNodeIntoNearestSection(
          nds,
          baseNode,
          explicitPosition ? fallbackPosition : undefined,
          selectedSection?.id ?? null
        );

        return nds.concat(parentedNode);
      });
      setSelectedNodeId(id);
    },
    [setNodes, setSelectedNodeId]
  );

  const handleAddShape = useCallback(
    (shape: NodeData['shape'], position?: { x: number; y: number }) => {
      recordHistory();
      const id = createId();
      commitAddedNode(
        id,
        (resolvedPosition) =>
          createGenericShapeNode(id, resolvedPosition ?? getDefaultNodePosition(nodesLength, 100, 100), {
            type: 'process',
            color: 'white',
            shape,
          }),
        position
      );
      queueNodeLabelEditRequest(id, { replaceExisting: true });
    },
    [commitAddedNode, nodesLength, recordHistory]
  );

  const handleAddNode = useCallback(
    (position?: { x: number; y: number }) => {
      handleAddShape('rounded', position);
    },
    [handleAddShape]
  );

  const handleAddAnnotation = useCallback(
    (position?: { x: number; y: number }) => {
      recordHistory();
      const id = createId();
      commitAddedNode(
        id,
        (resolvedPosition) => createAnnotationNode(
          id,
          resolvedPosition || getDefaultNodePosition(nodesLength, 100, 100),
          { label: t('nodes.note'), subLabel: t('nodes.addCommentsHere') }
        ),
        position
      );
    },
    [commitAddedNode, nodesLength, recordHistory, t]
  );

  const handleAddJourneyNode = useCallback(
    (position?: { x: number; y: number }) => {
      recordHistory();
      const id = createId('journey');
      commitAddedNode(
        id,
        (resolvedPosition) => ({
          id,
          type: 'journey',
          position: resolvedPosition || getDefaultNodePosition(nodesLength, 120, 120),
          data: {
            label: 'User Journey',
            subLabel: 'User',
            color: 'violet',
            shape: 'rounded',
            journeySection: 'General',
            journeyTask: 'User Journey',
            journeyActor: 'User',
            journeyScore: 3,
          },
          selected: true,
        }),
        position
      );
    },
    [commitAddedNode, nodesLength, recordHistory]
  );

  const handleAddMindmapNode = useCallback(
    (position?: { x: number; y: number }) => {
      recordHistory();
      const id = createId('mindmap');
      commitAddedNode(
        id,
        (resolvedPosition) => ({
          id,
          type: 'mindmap',
          position: resolvedPosition || getDefaultNodePosition(nodesLength, 120, 120),
          data: {
            label: 'Central Topic',
            color: 'slate',
            shape: 'rounded',
            mindmapDepth: 0,
            mindmapBranchStyle: 'curved',
          },
          selected: true,
        }),
        position
      );
      queueNodeLabelEditRequest(id, { replaceExisting: true });
    },
    [commitAddedNode, nodesLength, recordHistory]
  );

  const handleAddArchitectureNode = useCallback(
    (position?: { x: number; y: number }) => {
      recordHistory();
      const id = createId('arch');
      commitAddedNode(
        id,
        (resolvedPosition) => ({
          id,
          type: 'architecture',
          position: resolvedPosition || getDefaultNodePosition(nodesLength, 120, 120),
          data: {
            label: 'New Service',
            color: 'slate',
            shape: 'rectangle',
            icon: 'Server',
            archProvider: 'custom',
            archResourceType: 'service',
            archEnvironment: 'default',
          },
          selected: true,
        }),
        position
      );
    },
    [commitAddedNode, nodesLength, recordHistory]
  );

  const handleAddSection = useCallback(
    (position?: { x: number; y: number }) => {
      recordHistory();
      const id = createId('section');
      const { activeLayerId } = useFlowStore.getState();
      setNodes((nds) => {
        const nextSectionOrder = getNextSectionOrder(nds);
        const createdSection = createSectionNode(id, position ?? getDefaultNodePosition(nds.length, 50, 50), t('nodes.newSection'));
        const nextNodes = position
          ? nds.concat({
              ...createdSection,
              data: {
                ...createdSection.data,
                sectionOrder: nextSectionOrder,
              },
            })
          : wrapSelectionInSection(nds, id, t('nodes.newSection'));

        return nextNodes.map((node) =>
          node.id === id
            ? {
                ...node,
                data: {
                  ...node.data,
                  layerId: activeLayerId,
                  sectionOrder:
                    typeof node.data?.sectionOrder === 'number'
                      ? node.data.sectionOrder
                      : nextSectionOrder,
                },
              }
            : node
        );
      });
      setSelectedNodeId(id);
    },
    [recordHistory, setNodes, setSelectedNodeId, t]
  );

  const handleAddTextNode = useCallback(
    (position?: { x: number; y: number }) => {
      recordHistory();
      const id = createId('text');
      commitAddedNode(
        id,
        (resolvedPosition) => createTextNode(
          id,
          resolvedPosition || getDefaultNodePosition(nodesLength, 100, 100),
          t('nodes.text')
        ),
        position
      );
    },
    [commitAddedNode, nodesLength, recordHistory, t]
  );

  const handleAddImage = useCallback(
    (imageUrl: string, position?: { x: number; y: number }) => {
      recordHistory();
      const id = createId('image');
      commitAddedNode(
        id,
        (resolvedPosition) => createImageNode(
          id,
          imageUrl,
          resolvedPosition || getDefaultNodePosition(nodesLength, 100, 100),
          t('nodes.image')
        ),
        position
      );
    },
    [commitAddedNode, nodesLength, recordHistory, t]
  );

  const handleAddClassNode = useCallback(
    (position?: { x: number; y: number }) => {
      recordHistory();
      const id = createId('class');
      commitAddedNode(
        id,
        (resolvedPosition) => ({
          id,
          type: 'class',
          position: resolvedPosition || getDefaultNodePosition(nodesLength, 120, 120),
          data: {
            label: 'ClassName',
            color: 'white',
            shape: 'rectangle',
            classAttributes: ['+ attribute: Type'],
            classMethods: ['+ method(): void'],
          },
          selected: true,
        }),
        position
      );
    },
    [commitAddedNode, nodesLength, recordHistory]
  );

  const handleAddSequenceParticipant = useCallback(
    (position?: { x: number; y: number }) => {
      recordHistory();
      const id = createId('seq');
      const { activeLayerId, nodes: currentNodes } = useFlowStore.getState();

      // Align with the existing participant row — place to the right of the last participant.
      const seqNodes = currentNodes.filter((n) => n.type === 'sequence_participant');
      const rowY = seqNodes.length > 0 ? seqNodes[0].position.y : 0;
      const rowX = seqNodes.length > 0 ? Math.max(...seqNodes.map((n) => n.position.x)) + 220 : 0;

      const newNode: FlowNode = {
        id,
        type: 'sequence_participant',
        position: position ? { ...position, y: rowY } : { x: rowX, y: rowY },
        data: {
          label: 'Participant',
          seqParticipantKind: 'participant',
          layerId: activeLayerId,
        },
        selected: true,
      };
      setNodes((nds) => {
        const selectedSectionId = useFlowStore.getState().selectedNodeId;
        return nds.concat(
          insertNodeIntoNearestSection(nds, newNode, position, selectedSectionId)
        );
      });
      setSelectedNodeId(id);
      queueNodeLabelEditRequest(id, { replaceExisting: true });
    },
    [recordHistory, setNodes, setSelectedNodeId]
  );

  const handleAddEntityNode = useCallback(
    (position?: { x: number; y: number }) => {
      recordHistory();
      const id = createId('er');
      commitAddedNode(
        id,
        (resolvedPosition) => ({
          id,
          type: 'er_entity',
          position: resolvedPosition || getDefaultNodePosition(nodesLength, 120, 120),
          data: {
            label: 'EntityName',
            color: 'white',
            shape: 'rectangle',
            erFields: ['id: INT PK', 'name: VARCHAR'],
          },
          selected: true,
        }),
        position
      );
    },
    [commitAddedNode, nodesLength, recordHistory]
  );

  const handleAddWireframe = useCallback(
    (type: 'browser' | 'mobile', position?: { x: number; y: number }) => {
      recordHistory();
      const id = createId(type);
      const { activeLayerId } = useFlowStore.getState();
      const label = type === 'browser' ? 'New Window' : 'Mobile App';
      const newNode: FlowNode = {
        id,
        type,
        position: position || getDefaultNodePosition(nodesLength, 100, 100),
        data: {
          label,
          color: 'slate',
          variant: 'default',
          layerId: activeLayerId,
        },
        selected: true,
      };
      setNodes((nds) => {
        const selectedSectionId = useFlowStore.getState().selectedNodeId;
        return nds.concat(
          insertNodeIntoNearestSection(nds, newNode, position, selectedSectionId)
        );
      });
      setSelectedNodeId(id);
    },
    [nodesLength, recordHistory, setNodes, setSelectedNodeId]
  );

  const handleAddDomainLibraryItem = useCallback(
    (item: DomainLibraryItem, position?: { x: number; y: number }) => {
      recordHistory();
      const id = createId('lib');
      const { activeLayerId } = useFlowStore.getState();
      const newNode = createDomainLibraryNode(
        item,
        id,
        position || getDefaultNodePosition(nodesLength, 100, 100),
        activeLayerId
      );
      setNodes((nds) => {
        const selectedSectionId = useFlowStore.getState().selectedNodeId;
        return nds.concat(
          insertNodeIntoNearestSection(nds, newNode, position, selectedSectionId)
        );
      });
      setSelectedNodeId(id);
    },
    [nodesLength, recordHistory, setNodes, setSelectedNodeId]
  );

  return {
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
  };
}
