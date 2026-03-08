export const COLLAB_ROOM_QUERY_PARAM = 'room';
export const COLLAB_SECRET_QUERY_PARAM = 'secret';

export interface ResolvedCollaborationRoom {
  roomId: string;
  roomSecret: string | null;
  shouldWriteToUrl: boolean;
}

export function resolveCollaborationRoomId(search: string, fallbackRoomId: string): ResolvedCollaborationRoom {
  const params = new URLSearchParams(search);
  const roomParam = params.get(COLLAB_ROOM_QUERY_PARAM)?.trim() ?? '';
  const secretParam = params.get(COLLAB_SECRET_QUERY_PARAM)?.trim() ?? '';
  if (roomParam.length > 0) {
    return {
      roomId: roomParam,
      roomSecret: secretParam.length > 0 ? secretParam : null,
      shouldWriteToUrl: false,
    };
  }

  return {
    roomId: fallbackRoomId,
    roomSecret: null,
    shouldWriteToUrl: true,
  };
}

export function buildCollaborationInviteUrl(currentHref: string, roomId: string, roomSecret: string): string {
  const url = new URL(currentHref);
  url.searchParams.set(COLLAB_ROOM_QUERY_PARAM, roomId);
  url.searchParams.set(COLLAB_SECRET_QUERY_PARAM, roomSecret);
  return url.toString();
}
