import ELK, { ElkNode, ElkExtendedEdge } from 'elkjs/lib/elk.bundled.js';
import { Node, Edge } from 'reactflow';
import { NODE_WIDTH, NODE_HEIGHT } from '../constants';

const elk = new ELK();

export type LayoutAlgorithm = 'layered' | 'force' | 'mrtree' | 'stress' | 'radial';
export type LayoutDirection = 'DOWN' | 'RIGHT' | 'LEFT' | 'UP';

// Map user-friendly direction codes to ELK direction values
const DIRECTION_MAP: Record<string, LayoutDirection> = {
    TB: 'DOWN',
    LR: 'RIGHT',
    RL: 'LEFT',
    BT: 'UP',
};

export interface LayoutOptions {
    direction?: 'TB' | 'LR' | 'RL' | 'BT';
    algorithm?: LayoutAlgorithm;
    spacing?: 'compact' | 'normal' | 'loose';
}

/**
 * Calculate spacing dimensions based on preset and direction.
 */
function getSpacingDimensions(spacing: LayoutOptions['spacing'] = 'normal', isHorizontal: boolean) {
    let nodeNode = 80;
    let nodeLayer = 150;

    switch (spacing) {
        case 'compact':
            nodeNode = 40;
            nodeLayer = 80;
            break;
        case 'loose':
            nodeNode = 150;
            nodeLayer = 250;
            break;
        case 'normal':
        default:
            nodeNode = 80;
            nodeLayer = 150;
    }

    if (isHorizontal) {
        nodeLayer *= 1.2;
    }

    return {
        nodeNode: String(nodeNode),
        nodeLayer: String(nodeLayer),
        component: String(nodeLayer)
    };
}

/**
 * Get algorithm-specific ELK options.
 */
function getAlgorithmOptions(algorithm: LayoutAlgorithm, layerSpacing: number) {
    const options: Record<string, string> = {};

    // Algorithm ID mapping
    switch (algorithm) {
        case 'mrtree': options['elk.algorithm'] = 'org.eclipse.elk.mrtree'; break;
        case 'force': options['elk.algorithm'] = 'org.eclipse.elk.force'; break;
        case 'stress': options['elk.algorithm'] = 'org.eclipse.elk.stress'; break;
        case 'radial': options['elk.algorithm'] = 'org.eclipse.elk.radial'; break;
        default: options['elk.algorithm'] = `org.eclipse.elk.${algorithm}`;
    }

    // Algorithm-specific tuning
    if (algorithm === 'layered') {
        Object.assign(options, {
            'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
            'elk.layered.crossingMinimization.thoroughness': '20',
            'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
            'elk.edgeRouting': 'ORTHOGONAL',
            'elk.layered.spacing.edgeNodeBetweenLayers': '50',
            'elk.layered.spacing.edgeEdgeBetweenLayers': '40',
            'elk.separateConnectedComponents': 'true',
            'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
        });
    } else if (algorithm === 'force') {
        Object.assign(options, {
            'elk.force.iterations': '500',
            'elk.force.repulsivePower': String(layerSpacing / 20),
        });
    } else if (algorithm === 'stress') {
        options['elk.stress.desiredEdgeLength'] = String(layerSpacing);
    } else if (algorithm === 'radial') {
        options['elk.radial.radius'] = String(layerSpacing);
    }

    return options;
}

/**
 * Perform auto-layout using ELK.
 * Returns a new array of nodes with updated positions.
 */
export async function getElkLayout(
    nodes: Node[],
    edges: Edge[],
    options: LayoutOptions = {}
): Promise<Node[]> {
    const { direction = 'TB', algorithm = 'layered', spacing = 'normal' } = options;

    const elkDirection = DIRECTION_MAP[direction] || 'DOWN';
    const isHorizontal = direction === 'LR' || direction === 'RL';

    // 1. Calculate Configuration
    const dims = getSpacingDimensions(spacing, isHorizontal);
    const algoOptions = getAlgorithmOptions(algorithm, parseFloat(dims.nodeLayer));

    // 2. Build Graph
    const elkGraph: ElkNode = {
        id: 'root',
        layoutOptions: {
            'elk.direction': elkDirection,
            'elk.spacing.nodeNode': dims.nodeNode,
            'elk.layered.spacing.nodeNodeBetweenLayers': dims.nodeLayer,
            'elk.spacing.componentComponent': dims.component,
            'elk.padding': '[top=50,left=50,bottom=50,right=50]',
            ...algoOptions,
        },
        children: nodes.map((node) => {
            // Use MEASURED dimensions to prevent overlap
            const w = (node as any).measured?.width ?? node.width ?? (node.data as any)?.width ?? NODE_WIDTH;
            const h = (node as any).measured?.height ?? node.height ?? (node.data as any)?.height ?? NODE_HEIGHT;
            return {
                id: node.id,
                width: w,
                height: h,
                layoutOptions: { 'elk.portConstraints': 'FREE' },
            };
        }),
        edges: edges
            .filter((e) => e.source !== e.target) // Skip self-loops
            .map((edge) => ({
                id: edge.id,
                sources: [edge.source],
                targets: [edge.target],
            })) as ElkExtendedEdge[],
    };

    // 3. Execute Layout
    const layoutResult = await elk.layout(elkGraph);

    // 4. Map Results
    const positionMap = new Map<string, { x: number; y: number }>();
    layoutResult.children?.forEach((elkNode) => {
        positionMap.set(elkNode.id, {
            x: elkNode.x ?? 0,
            y: elkNode.y ?? 0,
        });
    });

    return nodes.map((node) => {
        const pos = positionMap.get(node.id);
        if (!pos) return node;
        return { ...node, position: { x: pos.x, y: pos.y } };
    });
}
