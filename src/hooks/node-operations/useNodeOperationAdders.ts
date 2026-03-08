import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { trackEvent } from '@/lib/analytics';
import { createId } from '@/lib/id';
import type { FlowNode, NodeData } from '@/lib/types';
import {
  createDomainLibraryNode,
  type DomainLibraryItem,
} from '@/services/domainLibrary';
import { useFlowStore } from '@/store';
import { queueNodeLabelEditRequest } from '@/hooks/nodeLabelEditRequest';
import {
    createAnnotationNode,
    createGenericShapeNode,
    createImageNode,
    createProcessNode,
    createSectionNode,
    createTextNode,
  getDefaultNodePosition,
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

  const handleAddShape = useCallback((shape: NodeData['shape'], position?: { x: number; y: number }) => {
    recordHistory();
    const id = createId();
    const { activeLayerId } = useFlowStore.getState();
    const newNode = createGenericShapeNode(
      id,
      position || getDefaultNodePosition(nodesLength, 100, 100),
      {
        type: 'process',
        color: 'white',
        shape,
        layerId: activeLayerId,
      }
    );
    setNodes((nds) => nds.concat(newNode));
    setSelectedNodeId(id);
    queueNodeLabelEditRequest(id, { replaceExisting: true });
    trackEvent('add_node', { node_type: 'process', shape });
  }, [nodesLength, recordHistory, setNodes, setSelectedNodeId]);

  const handleAddNode = useCallback((position?: { x: number; y: number }) => {
    handleAddShape('rounded', position);
  }, [handleAddShape]);

  const handleAddAnnotation = useCallback((position?: { x: number; y: number }) => {
    recordHistory();
    const id = createId();
    const { activeLayerId } = useFlowStore.getState();
    const newNode = createAnnotationNode(
      id,
      position || getDefaultNodePosition(nodesLength, 100, 100),
      { label: t('nodes.note'), subLabel: t('nodes.addCommentsHere') }
    );
    newNode.data = {
      ...newNode.data,
      layerId: activeLayerId,
    };
    setNodes((nds) => nds.concat(newNode));
    setSelectedNodeId(id);
    trackEvent('add_node', { node_type: 'annotation' });
  }, [nodesLength, recordHistory, setNodes, setSelectedNodeId, t]);

  const handleAddJourneyNode = useCallback((position?: { x: number; y: number }) => {
    recordHistory();
    const id = createId('journey');
    const { activeLayerId } = useFlowStore.getState();
    const newNode: FlowNode = {
      id,
      type: 'journey',
      position: position || getDefaultNodePosition(nodesLength, 120, 120),
      data: {
        label: 'User Journey',
        subLabel: 'User',
        color: 'violet',
        shape: 'rounded',
        journeySection: 'General',
        journeyTask: 'User Journey',
        journeyActor: 'User',
        journeyScore: 3,
        layerId: activeLayerId,
      },
      selected: true,
    };
    setNodes((nds) => nds.concat(newNode));
    setSelectedNodeId(id);
    trackEvent('add_node', { node_type: 'journey' });
  }, [nodesLength, recordHistory, setNodes, setSelectedNodeId]);

  const handleAddMindmapNode = useCallback((position?: { x: number; y: number }) => {
    recordHistory();
    const id = createId('mindmap');
    const { activeLayerId } = useFlowStore.getState();
    const newNode: FlowNode = {
      id,
      type: 'mindmap',
      position: position || getDefaultNodePosition(nodesLength, 120, 120),
      data: {
        label: 'Central Topic',
        color: 'slate',
        shape: 'rounded',
        mindmapDepth: 0,
        mindmapBranchStyle: 'curved',
        layerId: activeLayerId,
      },
      selected: true,
    };
    setNodes((nds) => nds.concat(newNode));
    setSelectedNodeId(id);
    queueNodeLabelEditRequest(id, { replaceExisting: true });
    trackEvent('add_node', { node_type: 'mindmap' });
  }, [nodesLength, recordHistory, setNodes, setSelectedNodeId]);

  const handleAddArchitectureNode = useCallback((position?: { x: number; y: number }) => {
    recordHistory();
    const id = createId('arch');
    const { activeLayerId } = useFlowStore.getState();
    const newNode: FlowNode = {
      id,
      type: 'architecture',
      position: position || getDefaultNodePosition(nodesLength, 120, 120),
      data: {
        label: 'New Service',
        color: 'slate',
        shape: 'rectangle',
        icon: 'Server',
        archProvider: 'custom',
        archResourceType: 'service',
        archEnvironment: 'default',
        layerId: activeLayerId,
      },
      selected: true,
    };
    setNodes((nds) => nds.concat(newNode));
    setSelectedNodeId(id);
    trackEvent('add_node', { node_type: 'architecture' });
  }, [nodesLength, recordHistory, setNodes, setSelectedNodeId]);

  const handleAddSection = useCallback((position?: { x: number; y: number }) => {
    recordHistory();
    const id = createId('section');
    const { activeLayerId } = useFlowStore.getState();
    const newNode = createSectionNode(
      id,
      position || getDefaultNodePosition(nodesLength, 50, 50),
      t('nodes.newSection')
    );
    newNode.data = {
      ...newNode.data,
      layerId: activeLayerId,
    };
    setNodes((nds) => nds.concat(newNode));
    setSelectedNodeId(id);
    trackEvent('add_node', { node_type: 'section' });
  }, [nodesLength, recordHistory, setNodes, setSelectedNodeId, t]);

  const handleAddTextNode = useCallback((position?: { x: number; y: number }) => {
    recordHistory();
    const id = createId('text');
    const { activeLayerId } = useFlowStore.getState();
    const newNode = createTextNode(
      id,
      position || getDefaultNodePosition(nodesLength, 100, 100),
      t('nodes.text')
    );
    newNode.data = {
      ...newNode.data,
      layerId: activeLayerId,
    };
    setNodes((nds) => nds.concat(newNode));
    setSelectedNodeId(id);
    trackEvent('add_node', { node_type: 'text' });
  }, [nodesLength, recordHistory, setNodes, setSelectedNodeId, t]);

  const handleAddImage = useCallback((imageUrl: string, position?: { x: number; y: number }) => {
    recordHistory();
    const id = createId('image');
    const { activeLayerId } = useFlowStore.getState();
    const newNode = createImageNode(
      id,
      imageUrl,
      position || getDefaultNodePosition(nodesLength, 100, 100),
      t('nodes.image')
    );
    newNode.data = {
      ...newNode.data,
      layerId: activeLayerId,
    };
    setNodes((nds) => nds.concat(newNode));
    setSelectedNodeId(id);
    trackEvent('add_node', { node_type: 'image' });
  }, [nodesLength, recordHistory, setNodes, setSelectedNodeId, t]);

  const handleAddWireframe = useCallback((type: 'browser' | 'mobile', position?: { x: number; y: number }) => {
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
    setNodes((nds) => nds.concat(newNode));
    setSelectedNodeId(id);
    trackEvent('add_node', { node_type: type });
  }, [nodesLength, recordHistory, setNodes, setSelectedNodeId]);

  const handleAddDomainLibraryItem = useCallback((item: DomainLibraryItem, position?: { x: number; y: number }) => {
    recordHistory();
    const id = createId('lib');
    const { activeLayerId } = useFlowStore.getState();
    const newNode = createDomainLibraryNode(
      item,
      id,
      position || getDefaultNodePosition(nodesLength, 100, 100),
      activeLayerId
    );
    setNodes((nds) => nds.concat(newNode));
    setSelectedNodeId(id);
    trackEvent('add_node', { node_type: 'domain_library', category: item.category, item_id: item.id });
  }, [nodesLength, recordHistory, setNodes, setSelectedNodeId]);

  return {
    handleAddShape,
    handleAddNode,
    handleAddAnnotation,
    handleAddJourneyNode,
    handleAddMindmapNode,
    handleAddArchitectureNode,
    handleAddSection,
    handleAddTextNode,
    handleAddImage,
    handleAddWireframe,
    handleAddDomainLibraryItem,
  };
}
