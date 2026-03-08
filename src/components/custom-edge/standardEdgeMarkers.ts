import { MarkerType } from '@/lib/reactflowCompat';

interface MarkerConfigLike {
    type?: MarkerType | string;
    color?: string;
    width?: number;
    height?: number;
}

interface StandardMarkerDef {
    id: string;
    color: string;
    width: number;
    height: number;
    side: 'start' | 'end';
}

interface ResolveStandardEdgeMarkersParams {
    connectorModelEnabled: boolean;
    edgeId: string;
    markerStartUrl?: string;
    markerEndUrl?: string;
    markerStartConfig?: MarkerConfigLike;
    markerEndConfig?: MarkerConfigLike;
    stroke: string;
}

interface ResolveStandardEdgeMarkersResult {
    defs: StandardMarkerDef[];
    markerStartUrl?: string;
    markerEndUrl?: string;
}

const DEFAULT_MARKER_SIZE = 12;
const MIN_MARKER_SIZE = 8;
const MAX_MARKER_SIZE = 14;

function isArrowClosedMarker(config: MarkerConfigLike | undefined): boolean {
    return config?.type === MarkerType.ArrowClosed || config?.type === 'arrowclosed';
}

function sanitizeColorForId(color: string): string {
    return color.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function buildMarkerId(edgeId: string, side: 'start' | 'end', color: string): string {
    return `flow-edge-marker-${edgeId}-${side}-${sanitizeColorForId(color)}`;
}

function normalizeMarkerSize(value: number | undefined): number {
    if (typeof value !== 'number' || Number.isNaN(value)) {
        return DEFAULT_MARKER_SIZE;
    }

    if (value >= 18) {
        return DEFAULT_MARKER_SIZE;
    }

    return Math.max(MIN_MARKER_SIZE, Math.min(MAX_MARKER_SIZE, value));
}

function toMarkerDef(
    edgeId: string,
    side: 'start' | 'end',
    config: MarkerConfigLike | undefined,
    stroke: string
): StandardMarkerDef | null {
    if (!isArrowClosedMarker(config)) {
        return null;
    }

    const color = config?.color || stroke;
    return {
        id: buildMarkerId(edgeId, side, color),
        color,
        width: normalizeMarkerSize(config?.width),
        height: normalizeMarkerSize(config?.height),
        side,
    };
}

export function resolveStandardEdgeMarkers({
    connectorModelEnabled,
    edgeId,
    markerStartUrl,
    markerEndUrl,
    markerStartConfig,
    markerEndConfig,
    stroke,
}: ResolveStandardEdgeMarkersParams): ResolveStandardEdgeMarkersResult {
    if (!connectorModelEnabled) {
        return {
            defs: [],
            markerStartUrl,
            markerEndUrl,
        };
    }

    const defs = [
        toMarkerDef(edgeId, 'start', markerStartConfig, stroke),
        toMarkerDef(edgeId, 'end', markerEndConfig, stroke),
    ].filter((value): value is StandardMarkerDef => value !== null);

    const startDef = defs.find((def) => def.side === 'start');
    const endDef = defs.find((def) => def.side === 'end');

    return {
        defs,
        markerStartUrl: startDef ? `url(#${startDef.id})` : markerStartUrl,
        markerEndUrl: endDef ? `url(#${endDef.id})` : markerEndUrl,
    };
}
