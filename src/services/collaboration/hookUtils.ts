import { createId } from '@/lib/id';
import { APP_COLLABORATION_KEYS } from '@/lib/legacyBranding';
import type { CollaborationPresenceState } from './types';
import { parseLocalCollaborationIdentityJson } from './schemas';

const COLLABORATION_CURSOR_PUBLISH_DISTANCE = 6;
const LOCAL_COLLABORATION_IDENTITY_STORAGE_KEY = APP_COLLABORATION_KEYS.identity;
const LOCAL_COLLABORATION_COLORS = ['#2563eb', '#db2777', '#059669', '#7c3aed', '#ea580c', '#0f766e'];
const LOCAL_COLLABORATION_ROOM_SECRET_STORAGE_PREFIX = APP_COLLABORATION_KEYS.roomSecretPrefix;

interface LocalCollaborationIdentity {
    name: string;
    color: string;
}

function normalizeCollaborationDisplayName(name: string, isLocal: boolean): string {
    if (isLocal) {
        return 'You';
    }

    const isGeneratedGuestName = /^Guest [A-Z0-9]{4}$/u.test(name);
    return isGeneratedGuestName ? 'Guest' : name;
}

export function resolveCollaborationCacheState(input: {
    indexedDbEnabled: boolean;
    indexedDbAvailable: boolean;
    hasPersistedDocumentContent: boolean;
}): 'unavailable' | 'syncing' | 'ready' | 'hydrated' {
    if (!input.indexedDbEnabled || !input.indexedDbAvailable) {
        return 'unavailable';
    }
    if (input.hasPersistedDocumentContent) {
        return 'hydrated';
    }
    return 'ready';
}

export function resolveInitialCollaborationCacheState(input: {
    indexedDbEnabled: boolean;
    indexedDbAvailable: boolean;
}): 'unavailable' | 'syncing' {
    return input.indexedDbEnabled && input.indexedDbAvailable ? 'syncing' : 'unavailable';
}

export function resolveCollaborationCursorPosition(input: {
    clientX: number;
    clientY: number;
    bounds: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>;
}): { x: number; y: number } | null {
    const relativeX = input.clientX - input.bounds.left;
    const relativeY = input.clientY - input.bounds.top;

    if (
        relativeX < 0 ||
        relativeY < 0 ||
        relativeX > input.bounds.width ||
        relativeY > input.bounds.height
    ) {
        return null;
    }

    return { x: relativeX, y: relativeY };
}

export function shouldPublishCollaborationCursor(input: {
    previous: { x: number; y: number } | null;
    next: { x: number; y: number };
    minimumDistance?: number;
}): boolean {
    if (!input.previous) {
        return true;
    }

    const minimumDistance = input.minimumDistance ?? COLLABORATION_CURSOR_PUBLISH_DISTANCE;
    const deltaX = input.next.x - input.previous.x;
    const deltaY = input.next.y - input.previous.y;

    return Math.hypot(deltaX, deltaY) >= minimumDistance;
}

export function buildTopNavParticipants(
    collaborationPresence: CollaborationPresenceState[],
    localCollaborationClientId: string | null
): Array<{
    clientId: string;
    name: string;
    color: string;
    isLocal: boolean;
}> {
    return collaborationPresence
        .slice()
        .sort((left, right) => left.clientId.localeCompare(right.clientId))
        .map((presence) => {
            const isLocal = presence.clientId === localCollaborationClientId;
            return {
                clientId: presence.clientId,
                name: normalizeCollaborationDisplayName(presence.name, isLocal),
                color: presence.color,
                isLocal,
            };
        });
}

export function resolveLocalCollaborationClientId(collaborationEnabled: boolean, roomId: string): string | null {
    if (!collaborationEnabled) {
        return null;
    }

    const storageKey = `${APP_COLLABORATION_KEYS.clientIdPrefix}${roomId}`;
    const existingClientId = window.sessionStorage.getItem(storageKey);
    if (existingClientId) {
        return existingClientId;
    }

    const createdClientId = createId('collab-client');
    window.sessionStorage.setItem(storageKey, createdClientId);
    return createdClientId;
}

function hashString(value: string): number {
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
        hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
    }
    return hash;
}

export function resolveLocalCollaborationIdentity(clientId: string | null): LocalCollaborationIdentity {
    if (!clientId) {
        return {
            name: 'Guest',
            color: LOCAL_COLLABORATION_COLORS[0],
        };
    }

    const storedValue = window.localStorage.getItem(LOCAL_COLLABORATION_IDENTITY_STORAGE_KEY);
    if (storedValue) {
        const parsed = parseLocalCollaborationIdentityJson(storedValue);
        if (parsed) {
            return parsed;
        }

        window.localStorage.removeItem(LOCAL_COLLABORATION_IDENTITY_STORAGE_KEY);
    }

    const nextIdentity = {
        name: 'Guest',
        color: LOCAL_COLLABORATION_COLORS[hashString(clientId) % LOCAL_COLLABORATION_COLORS.length],
    };
    window.localStorage.setItem(LOCAL_COLLABORATION_IDENTITY_STORAGE_KEY, JSON.stringify(nextIdentity));
    return nextIdentity;
}

export function resolveLocalCollaborationRoomSecret(input: {
    collaborationEnabled: boolean;
    roomId: string;
    roomSecretFromUrl: string | null;
    shouldWriteToUrl: boolean;
}): string | null {
    if (!input.collaborationEnabled) {
        return null;
    }

    const storageKey = `${LOCAL_COLLABORATION_ROOM_SECRET_STORAGE_PREFIX}${input.roomId}`;
    if (input.roomSecretFromUrl) {
        window.sessionStorage.setItem(storageKey, input.roomSecretFromUrl);
        return input.roomSecretFromUrl;
    }

    const existingRoomSecret = window.sessionStorage.getItem(storageKey);
    if (existingRoomSecret) {
        return existingRoomSecret;
    }

    if (!input.shouldWriteToUrl) {
        return input.roomId;
    }

    const generatedRoomSecret = input.roomId;
    window.sessionStorage.setItem(storageKey, generatedRoomSecret);
    return generatedRoomSecret;
}
