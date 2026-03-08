import { useEffect } from 'react';

export type MindmapTopicActionType = 'child' | 'sibling';
export type MindmapTopicSide = 'left' | 'right' | null;

const MINDMAP_TOPIC_ACTION_REQUEST_EVENT = 'flowmind:mindmap-topic-action-request';

interface MindmapTopicActionRequestDetail {
  nodeId: string;
  action: MindmapTopicActionType;
  side?: MindmapTopicSide;
}

export function requestMindmapTopicAction(
  nodeId: string,
  action: MindmapTopicActionType,
  side?: MindmapTopicSide
): void {
  window.dispatchEvent(
    new CustomEvent<MindmapTopicActionRequestDetail>(MINDMAP_TOPIC_ACTION_REQUEST_EVENT, {
      detail: {
        nodeId,
        action,
        side,
      },
    })
  );
}

export function useMindmapTopicActionRequest(
  onRequest: (detail: MindmapTopicActionRequestDetail) => void
): void {
  useEffect(() => {
    const handleRequest = (event: Event): void => {
      const customEvent = event as CustomEvent<MindmapTopicActionRequestDetail>;
      if (!customEvent.detail?.nodeId || !customEvent.detail.action) {
        return;
      }
      onRequest(customEvent.detail);
    };

    window.addEventListener(MINDMAP_TOPIC_ACTION_REQUEST_EVENT, handleRequest as EventListener);
    return () => {
      window.removeEventListener(MINDMAP_TOPIC_ACTION_REQUEST_EVENT, handleRequest as EventListener);
    };
  }, [onRequest]);
}
