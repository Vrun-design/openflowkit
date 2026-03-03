import React from 'react';
import { useEdges } from 'reactflow';
import type { EdgeProps } from 'reactflow';
import type { EdgeData } from '@/lib/types';
import { CustomEdgeWrapper } from './custom-edge/CustomEdgeWrapper';
import { buildEdgePath } from './custom-edge/pathUtils';

function createEdgeRenderer(variant: 'bezier' | 'smoothstep' | 'step') {
    return function RenderEdge(props: EdgeProps<EdgeData>): React.ReactElement {
        const allEdges = useEdges();
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
            },
            allEdges,
            variant
        );

        return (
            <CustomEdgeWrapper
                id={props.id}
                path={edgePath}
                labelX={labelX}
                labelY={labelY}
                markerEnd={props.markerEnd}
                style={props.style}
                data={props.data}
                label={props.label}
                markerStart={props.markerStart}
            />
        );
    };
}

export const CustomBezierEdge = createEdgeRenderer('bezier');
export const CustomSmoothStepEdge = createEdgeRenderer('smoothstep');
export const CustomStepEdge = createEdgeRenderer('step');

export default CustomSmoothStepEdge;
