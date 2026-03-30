import { useEffect } from 'react';
import { APP_EVENT_NAMES } from '@/lib/legacyBranding';

const NODE_QUICK_CREATE_REQUEST_EVENT = APP_EVENT_NAMES.nodeQuickCreateRequest;

export type QuickCreateDirection = 'up' | 'right' | 'down' | 'left';

interface NodeQuickCreateRequestDetail {
  nodeId: string;
  direction: QuickCreateDirection;
}

export function requestNodeQuickCreate(nodeId: string, direction: QuickCreateDirection): void {
  window.dispatchEvent(
    new CustomEvent<NodeQuickCreateRequestDetail>(NODE_QUICK_CREATE_REQUEST_EVENT, {
      detail: { nodeId, direction },
    })
  );
}

export function useNodeQuickCreateRequest(
  onRequest: (nodeId: string, direction: QuickCreateDirection) => void
): void {
  useEffect(() => {
    const handleRequest = (event: Event): void => {
      const customEvent = event as CustomEvent<NodeQuickCreateRequestDetail>;
      if (!customEvent.detail?.nodeId) {
        return;
      }
      onRequest(customEvent.detail.nodeId, customEvent.detail.direction);
    };

    window.addEventListener(NODE_QUICK_CREATE_REQUEST_EVENT, handleRequest as EventListener);
    return () => {
      window.removeEventListener(NODE_QUICK_CREATE_REQUEST_EVENT, handleRequest as EventListener);
    };
  }, [onRequest]);
}
