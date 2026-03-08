import React from 'react';
import type { FlowEdge } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { InspectorField } from '../InspectorPrimitives';

interface EdgeRouteSectionProps {
    selectedEdge: FlowEdge;
    onChange: (id: string, updates: Partial<FlowEdge>) => void;
}

function getEffectiveRoutingMode(edge: FlowEdge): 'auto' | 'elk' | 'manual' {
    if (edge.data?.routingMode === 'manual') {
        return 'manual';
    }

    if (edge.data?.routingMode === 'elk' || (edge.data?.elkPoints?.length ?? 0) > 0) {
        return 'elk';
    }

    return 'auto';
}

export function EdgeRouteSection({
    selectedEdge,
    onChange,
}: EdgeRouteSectionProps): React.ReactElement {
    const effectiveMode = getEffectiveRoutingMode(selectedEdge);
    const hasElkRoute = (selectedEdge.data?.elkPoints?.length ?? 0) > 0;
    const hasManualWaypoints =
        Boolean(selectedEdge.data?.waypoint) || (selectedEdge.data?.waypoints?.length ?? 0) > 0;
    const waypointCount = selectedEdge.data?.waypoints?.length
        ?? (selectedEdge.data?.waypoint ? 1 : 0);

    const resetRoute = (): void => {
        onChange(selectedEdge.id, {
            data: {
                ...selectedEdge.data,
                routingMode: hasElkRoute ? 'elk' : 'auto',
                waypoint: undefined,
                waypoints: undefined,
            },
        });
    };

    return (
        <InspectorField
            label="Path"
            helper={
                hasManualWaypoints
                    ? `${waypointCount} custom bend${waypointCount !== 1 ? 's' : ''} stored on this edge · Reset to return to automatic routing`
                    : 'Connector routing is automatic'
            }
        >
            {hasManualWaypoints ? (
                <Button
                    onClick={resetRoute}
                    variant="secondary"
                    className="w-full"
                >
                    Reset path
                </Button>
            ) : (
                <div className="rounded-[var(--brand-radius)] border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-400 text-center select-none">
                    {effectiveMode === 'elk' ? 'ELK auto-routed' : 'Auto-routed'}
                </div>
            )}
        </InspectorField>
    );
}
