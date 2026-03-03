import type { EdgeTypes, NodeTypes } from 'reactflow';
import AnnotationNode from '@/components/AnnotationNode';
import CustomNode from '@/components/CustomNode';
import { CustomBezierEdge, CustomSmoothStepEdge, CustomStepEdge } from '@/components/CustomEdge';
import GroupNode from '@/components/GroupNode';
import ImageNode from '@/components/ImageNode';
import SectionNode from '@/components/SectionNode';
import SwimlaneNode from '@/components/SwimlaneNode';
import TextNode from '@/components/TextNode';
import BrowserNode from '@/components/custom-nodes/BrowserNode';
import IconNode from '@/components/custom-nodes/IconNode';
import MobileNode from '@/components/custom-nodes/MobileNode';
import {
    WireframeButtonNode,
    WireframeIconNode,
    WireframeImageNode,
    WireframeInputNode,
} from '@/components/custom-nodes/WireframeNodes';

export const flowCanvasNodeTypes: NodeTypes = {
    start: CustomNode,
    process: CustomNode,
    decision: CustomNode,
    end: CustomNode,
    custom: CustomNode,
    annotation: AnnotationNode,
    section: SectionNode,
    text: TextNode,
    group: GroupNode,
    swimlane: SwimlaneNode,
    image: ImageNode,
    browser: BrowserNode,
    mobile: MobileNode,
    wireframe_button: WireframeButtonNode,
    wireframe_input: WireframeInputNode,
    wireframe_image: WireframeImageNode,
    wireframe_icon: WireframeIconNode,
    icon: IconNode,
};

export const flowCanvasEdgeTypes: EdgeTypes = {
    default: CustomBezierEdge,
    smoothstep: CustomSmoothStepEdge,
    step: CustomStepEdge,
};

interface ConnectionLike {
    source?: string | null;
    target?: string | null;
    sourceHandle?: string | null;
    targetHandle?: string | null;
}

export function isDuplicateConnection(connection: ConnectionLike, edges: ConnectionLike[]): boolean {
    return edges.some((edge) => {
        return edge.source === connection.source
            && edge.target === connection.target
            && edge.sourceHandle === connection.sourceHandle
            && edge.targetHandle === connection.targetHandle;
    });
}
