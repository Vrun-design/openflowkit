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
/**
 * Perform auto-layout using ELK.
 * Supports hierarchical nodes (groups).
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
    const layoutOptions = {
        'elk.direction': elkDirection,
        'elk.spacing.nodeNode': dims.nodeNode,
        'elk.layered.spacing.nodeNodeBetweenLayers': dims.nodeLayer,
        'elk.spacing.componentComponent': dims.component,
        'elk.padding': '[top=50,left=50,bottom=50,right=50]',
        ...algoOptions,
    };

    // 2. Build Hierarchy
    const buildElkNode = (node: Node): ElkNode => {
        const children = nodes.filter(n => n.parentId === node.id);

        // Better estimation for unmeasured nodes (e.g. fresh from AI)
        let w = (node as any).measured?.width ?? node.width ?? (node.data as any)?.width;
        let h = (node as any).measured?.height ?? node.height ?? (node.data as any)?.height;

        if (!w || !h) {
            // Estimate based on label length
            const label = node.data?.label || '';
            const estimatedWidth = Math.max(NODE_WIDTH, label.length * 8 + 40); // Base width + char approx
            const estimatedHeight = Math.max(NODE_HEIGHT, Math.ceil(label.length / 40) * 20 + 60); // Wrap approx

            w = w ?? estimatedWidth;
            h = h ?? estimatedHeight;
        }

        return {
            id: node.id,
            width: children.length === 0 ? w : undefined, // Let ELK calculate size if group
            height: children.length === 0 ? h : undefined,
            children: children.map(buildElkNode),
            layoutOptions: {
                'elk.portConstraints': 'FREE',
                'elk.padding': '[top=40,left=20,bottom=20,right=20]', // Padding for groups
            },
        };
    };

    const topLevelNodes = nodes.filter(n => !n.parentId);

    const elkGraph: ElkNode = {
        id: 'root',
        layoutOptions,
        children: topLevelNodes.map(buildElkNode),
        edges: edges.map((edge) => ({
            id: edge.id,
            sources: [edge.source],
            targets: [edge.target],
            // Hierarchy support: edges might cross boundaries
            // ELK handles this if IDs match
        })) as ElkExtendedEdge[],
    };

    // 3. Execute Layout
    try {
        const layoutResult = await elk.layout(elkGraph);

        // 4. Flatten and Map Results
        const positionMap = new Map<string, { x: number; y: number, width?: number, height?: number }>();

        const traverse = (node: ElkNode) => {
            if (node.id !== 'root') {
                positionMap.set(node.id, {
                    x: node.x ?? 0,
                    y: node.y ?? 0,
                    width: node.width,
                    height: node.height
                });
            }
            node.children?.forEach(traverse);
        };
        traverse(layoutResult);

        return nodes.map((node) => {
            const pos = positionMap.get(node.id);
            if (!pos) return node;

            // For groups, we might want to update style/dimensions if ELK resized them?
            // ReactFlow handles group sizing dynamically usually, unless we set explicit style.width/height
            // But if we want to respect ELK's decision:
            const style = { ...node.style };
            if (node.type === 'group' || node.type === 'section' || node.type === 'container') {
                if (pos.width) style.width = pos.width;
                if (pos.height) style.height = pos.height;
            }

            return {
                ...node,
                position: { x: pos.x, y: pos.y },
                style
            };
        });

    } catch (err) {
        console.error('ELK Layout Error:', err);
        return nodes; // Fallback
    }
}
