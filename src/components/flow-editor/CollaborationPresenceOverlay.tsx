import React from 'react';
import type { CollaborationRemotePresence } from '@/hooks/useFlowEditorCollaboration';

interface CollaborationPresenceOverlayProps {
    remotePresence: CollaborationRemotePresence[];
}

export function CollaborationPresenceOverlay({
    remotePresence,
}: CollaborationPresenceOverlayProps): React.ReactElement {
    const visiblePresence = remotePresence.filter((presence) => presence.cursor.x > 0 || presence.cursor.y > 0);

    return (
        <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden">
            {visiblePresence.map((presence) => (
                <div
                    key={presence.clientId}
                    className="pointer-events-none absolute"
                    style={{
                        left: `${presence.cursor.x}px`,
                        top: `${presence.cursor.y}px`,
                        transform: 'translate(10px, 10px)',
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
                            className="inline-flex items-center gap-2 rounded-full border bg-white/95 px-3 py-1 text-[11px] font-medium text-slate-700 shadow-[0_8px_24px_rgba(15,23,42,0.12)] backdrop-blur"
                            style={{
                                borderColor: `${presence.color}33`,
                            }}
                        >
                            <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: presence.color }}
                            />
                            <span>{presence.name}</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
