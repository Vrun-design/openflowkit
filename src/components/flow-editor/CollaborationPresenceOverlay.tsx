import React, { useEffect, useRef } from 'react';
import type { CollaborationRemotePresence } from '@/hooks/useFlowEditorCollaboration';

interface CollaborationPresenceOverlayProps {
  remotePresence: CollaborationRemotePresence[];
  nodePositions?: Map<string, { x: number; y: number; width: number; height: number }>;
}

const IDLE_TIMEOUT_MS = 30_000;

function RemoteCursor({
  presence,
  nodePositions,
}: {
  presence: CollaborationRemotePresence;
  nodePositions?: Map<string, { x: number; y: number; width: number; height: number }>;
}): React.ReactElement {
  const cursorRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLSpanElement>(null);
  const timerRef = useRef<number | null>(null);
  const prevCursorRef = useRef(presence.cursor);
  const selectedNodeIds = presence.selectedNodeIds ?? [];

  useEffect(() => {
    const moved =
      presence.cursor.x !== prevCursorRef.current.x ||
      presence.cursor.y !== prevCursorRef.current.y;
    prevCursorRef.current = presence.cursor;

    if (!moved) return;

    cursorRef.current?.style.setProperty('opacity', '1');
    dotRef.current?.style.setProperty('background-color', presence.color);

    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      cursorRef.current?.style.setProperty('opacity', '0.4');
      dotRef.current?.style.setProperty('background-color', '#94a3b8');
    }, IDLE_TIMEOUT_MS);

    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, [presence.cursor, presence.color]);

  return (
    <>
      <div
        ref={cursorRef}
        className="pointer-events-none absolute left-0 top-0 will-change-transform"
        style={{
          transform: `translate(${presence.cursor.x + 10}px, ${presence.cursor.y + 10}px)`,
          transition: 'transform 80ms linear, opacity 300ms ease',
        }}
        data-testid={`remote-cursor-${presence.clientId}`}
      >
        <div className="flex items-start gap-2">
          <svg
            aria-hidden="true"
            viewBox="0 0 20 24"
            className="h-6 w-5 drop-shadow-[0_4px_10px_rgba(15,23,42,0.22)]"
          >
            <path
              d="M3 2.5L16.5 11.25L10.25 12.75L13 20.5L9.5 21.75L6.75 14L2.5 18.5Z"
              fill={presence.color}
              stroke="white"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
          <div
            className="inline-flex items-center gap-2 rounded-full border bg-[var(--brand-surface)]/95 px-3 py-1 text-[11px] font-medium text-[var(--brand-text)] shadow-[0_8px_24px_rgba(15,23,42,0.12)] backdrop-blur"
            style={{
              borderColor: `${presence.color}33`,
            }}
          >
            <span
              ref={dotRef}
              className="h-2.5 w-2.5 rounded-full"
              style={{
                backgroundColor: presence.color,
                transition: 'background-color 300ms ease',
              }}
            />
            <span>{presence.name}</span>
          </div>
        </div>
      </div>

      {nodePositions &&
        selectedNodeIds.map((nodeId) => {
          const pos = nodePositions.get(nodeId);
          if (!pos) return null;
          return (
            <div
              key={`${presence.clientId}-sel-${nodeId}`}
              className="pointer-events-none absolute left-0 top-0 rounded-lg will-change-transform"
              style={{
                transform: `translate(${pos.x - 3}px, ${pos.y - 3}px)`,
                width: `${pos.width + 6}px`,
                height: `${pos.height + 6}px`,
                border: `2px solid ${presence.color}`,
                opacity: 0.5,
                transition: 'transform 80ms linear',
              }}
            />
          );
        })}
    </>
  );
}

export function CollaborationPresenceOverlay({
  remotePresence,
  nodePositions,
}: CollaborationPresenceOverlayProps): React.ReactElement {
  const visiblePresence = remotePresence.filter(
    (presence) => presence.cursor.x > 0 || presence.cursor.y > 0
  );

  return (
    <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden">
      {visiblePresence.map((presence) => (
        <RemoteCursor key={presence.clientId} presence={presence} nodePositions={nodePositions} />
      ))}
    </div>
  );
}
