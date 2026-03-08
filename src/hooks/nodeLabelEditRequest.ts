import { useEffect } from 'react';
import { useFlowStore } from '@/store';
import { useNodeLabelEditRequestActions, usePendingNodeLabelEditRequest } from '@/store/selectionHooks';

const NODE_LABEL_EDIT_REQUEST_EVENT = 'flowmind:node-label-edit-request';

interface NodeLabelEditRequestDetail {
  nodeId: string;
  seedText?: string;
  replaceExisting?: boolean;
}

type RequestNodeLabelEditOptions = {
  seedText?: string;
  replaceExisting?: boolean;
};

export function requestNodeLabelEdit(nodeId: string, options?: RequestNodeLabelEditOptions): void {
  window.dispatchEvent(
    new CustomEvent<NodeLabelEditRequestDetail>(NODE_LABEL_EDIT_REQUEST_EVENT, {
      detail: {
        nodeId,
        seedText: options?.seedText,
        replaceExisting: options?.replaceExisting,
      },
    })
  );
}

export function queueNodeLabelEditRequest(nodeId: string, options?: RequestNodeLabelEditOptions): void {
  useFlowStore.getState().queuePendingNodeLabelEditRequest({
    nodeId,
    seedText: options?.seedText,
    replaceExisting: options?.replaceExisting,
  });
}

export function useNodeLabelEditRequest(
  nodeId: string,
  onRequest: (detail?: RequestNodeLabelEditOptions) => void
): void {
  const pendingRequest = usePendingNodeLabelEditRequest();
  const { clearPendingNodeLabelEditRequest } = useNodeLabelEditRequestActions();

  useEffect(() => {
    if (pendingRequest?.nodeId !== nodeId) {
      return;
    }

    onRequest({
      seedText: pendingRequest.seedText,
      replaceExisting: pendingRequest.replaceExisting,
    });
    clearPendingNodeLabelEditRequest();
  }, [clearPendingNodeLabelEditRequest, nodeId, onRequest, pendingRequest]);

  useEffect(() => {
    const handleRequest = (event: Event): void => {
      const customEvent = event as CustomEvent<NodeLabelEditRequestDetail>;
      if (customEvent.detail?.nodeId === nodeId) {
        onRequest({
          seedText: customEvent.detail.seedText,
          replaceExisting: customEvent.detail.replaceExisting,
        });
      }
    };

    window.addEventListener(NODE_LABEL_EDIT_REQUEST_EVENT, handleRequest as EventListener);
    return () => {
      window.removeEventListener(NODE_LABEL_EDIT_REQUEST_EVENT, handleRequest as EventListener);
    };
  }, [nodeId, onRequest]);
}
