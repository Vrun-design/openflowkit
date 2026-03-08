import React from 'react';
import { useReactFlow } from '@/lib/reactflowCompat';
import { ROLLOUT_FLAGS } from '@/config/rolloutFlags';
import type { LegacyEdgeProps } from '@/lib/reactflowCompat';
import type { EdgeData } from '@/lib/types';
import type { FlowEdge } from '@/lib/types';
import { CustomEdgeWrapper } from './custom-edge/CustomEdgeWrapper';
import { buildEdgePath } from './custom-edge/pathUtils';
import { shouldUseOrthogonalRelationRouting } from './custom-edge/relationRoutingSemantics';

function createEdgeRenderer(variant: 'bezier' | 'smoothstep' | 'step' | 'straight') {
    return function RenderEdge(props: LegacyEdgeProps<EdgeData>): React.ReactElement {
        const { getEdges, getNodes } = useReactFlow();
        const allEdges = getEdges() as FlowEdge[];
        const allNodes = getNodes();
        const currentEdge = allEdges.find((edge) => edge.id === props.id) as FlowEdge | undefined;
        const relationSemanticsV1Enabled = ROLLOUT_FLAGS.relationSemanticsV1;
        const sourceNode = allNodes.find((node) => node.id === props.source);
        const targetNode = allNodes.find((node) => node.id === props.target);
        const forceOrthogonal = shouldUseOrthogonalRelationRouting(
            relationSemanticsV1Enabled,
            props.data,
            sourceNode,
            targetNode
        );
        const { edgePath, labelX, labelY } = buildEdgePath(
            {
                id: props.id,
                source: props.source,
                target: props.target,
                sourceX: props.sourceX,
                sourceY: props.sourceY,
                targetX: props.targetX,
                targetY: props.targetY,
                sourcePosition: props.sourcePosition,
                targetPosition: props.targetPosition,
                sourceHandleId: props.sourceHandleId,
                targetHandleId: props.targetHandleId,
            },
            allEdges,
            allNodes,
            variant,
            {
                forceOrthogonal,
                elkPoints: props.data?.elkPoints as { x: number; y: number }[] | undefined,
                mindmapBranchKind: props.data?.mindmapBranchKind as 'root' | 'branch' | undefined,
                routingMode: props.data?.routingMode as 'auto' | 'elk' | 'manual' | undefined,
                waypoints: props.data?.waypoints as { x: number; y: number }[] | undefined,
                waypoint: props.data?.waypoint as { x: number; y: number } | undefined,
            }
        );

        return (
            <CustomEdgeWrapper
                id={props.id}
                path={edgePath}
                sourceX={props.sourceX}
                sourceY={props.sourceY}
                targetX={props.targetX}
                targetY={props.targetY}
                labelX={labelX}
                labelY={labelY}
                markerEnd={props.markerEnd}
                markerEndConfig={currentEdge?.markerEnd as FlowEdge['markerEnd']}
                style={props.style}
                data={props.data}
                label={props.label}
                markerStart={props.markerStart}
                markerStartConfig={currentEdge?.markerStart as FlowEdge['markerStart']}
                selected={props.selected}
            />
        );
    };
}

export const CustomBezierEdge = createEdgeRenderer('bezier');
export const CustomSmoothStepEdge = createEdgeRenderer('smoothstep');
export const CustomStepEdge = createEdgeRenderer('step');
export const CustomStraightEdge = createEdgeRenderer('straight');

export default CustomSmoothStepEdge;
