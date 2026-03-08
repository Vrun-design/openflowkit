import type { LayoutAlgorithm, LayoutDirection, LayoutOptions, ResolvedLayoutConfiguration } from './types';

// Map user-friendly direction codes to ELK direction values
const DIRECTION_MAP: Record<string, LayoutDirection> = {
    TB: 'DOWN',
    LR: 'RIGHT',
    RL: 'LEFT',
    BT: 'UP',
};

function getSpacingDimensions(spacing: LayoutOptions['spacing'] = 'normal', isHorizontal: boolean): {
    nodeNode: string;
    nodeLayer: string;
    component: string;
} {
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
        component: String(nodeLayer),
    };
}

function getAlgorithmOptions(algorithm: LayoutAlgorithm, layerSpacing: number): Record<string, string> {
    const options: Record<string, string> = {};

    switch (algorithm) {
        case 'mrtree':
            options['elk.algorithm'] = 'org.eclipse.elk.mrtree';
            break;
        case 'force':
            options['elk.algorithm'] = 'org.eclipse.elk.force';
            break;
        case 'stress':
            options['elk.algorithm'] = 'org.eclipse.elk.stress';
            break;
        case 'radial':
            options['elk.algorithm'] = 'org.eclipse.elk.radial';
            break;
        default:
            options['elk.algorithm'] = `org.eclipse.elk.${algorithm}`;
    }
    if (algorithm === 'layered') {
        Object.assign(options, {
            'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
            'elk.layered.crossingMinimization.thoroughness': '30',
            'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
            'elk.layered.nodePlacement.favorStraightEdges': 'true',
            'elk.layered.mergeEdges': 'true',
            'elk.layered.unnecessaryBendpoints': 'true',
            'elk.edgeRouting': 'ORTHOGONAL',
            'elk.portConstraints': 'FIXED_SIDE', // Lock to centers to force centralized trunk grouping
            'elk.layered.spacing.edgeNodeBetweenLayers': '50',
            'elk.layered.spacing.edgeEdgeBetweenLayers': '30', // Increased from 20 for cleaner multi-edge separation
            'elk.spacing.edgeEdge': '12',                      // Minimum gap between parallel edges
            'elk.separateConnectedComponents': 'true',
            'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
            'elk.layered.compaction.postCompaction.strategy': 'EDGE_LENGTH',
        });
    } else if (algorithm === 'mrtree') {
        Object.assign(options, {
            'elk.separateConnectedComponents': 'true',
            'elk.portConstraints': 'FIXED_SIDE', // Lock to centers to force centralized trunk grouping
            'elk.spacing.edgeEdge': '12',
        });

    } else if (algorithm === 'force') {
        Object.assign(options, {
            'elk.force.iterations': '500',
            'elk.force.repulsivePower': String(layerSpacing / 20),
            'elk.portConstraints': 'FREE', // Force layout needs free ports
        });
    } else if (algorithm === 'stress') {
        options['elk.stress.desiredEdgeLength'] = String(layerSpacing);
        options['elk.portConstraints'] = 'FREE';
    } else if (algorithm === 'radial') {
        options['elk.radial.radius'] = String(layerSpacing);
        options['elk.portConstraints'] = 'FREE';
    }

    return options;
}

export function getDeterministicSeedOptions(algorithm: LayoutAlgorithm): Record<string, string> {
    if (algorithm === 'force' || algorithm === 'stress' || algorithm === 'radial') {
        return { 'elk.randomSeed': '1337' };
    }
    return {};
}

export function resolveLayoutPresetOptions(options: LayoutOptions): Pick<LayoutOptions, 'algorithm' | 'direction' | 'spacing'> {
    if (!options.preset) {
        return {
            algorithm: options.algorithm ?? 'layered',
            direction: options.direction ?? 'TB',
            spacing: options.spacing ?? 'normal',
        };
    }

    if (options.preset === 'hierarchical') {
        return { algorithm: 'layered', direction: 'TB', spacing: 'normal' };
    }

    if (options.preset === 'orthogonal-compact') {
        return { algorithm: 'layered', direction: 'LR', spacing: 'compact' };
    }

    return { algorithm: 'layered', direction: 'LR', spacing: 'loose' };
}

export function buildResolvedLayoutConfiguration(options: LayoutOptions): ResolvedLayoutConfiguration {
    const {
        direction = 'TB',
        algorithm = 'layered',
        spacing = 'normal',
    } = resolveLayoutPresetOptions(options);
    const elkDirection = DIRECTION_MAP[direction] || 'DOWN';
    const isHorizontal = direction === 'LR' || direction === 'RL';

    const dims = getSpacingDimensions(spacing, isHorizontal);
    const algoOptions = getAlgorithmOptions(algorithm, parseFloat(dims.nodeLayer));
    const deterministicSeedOptions = getDeterministicSeedOptions(algorithm);
    const layoutOptions = {
        'elk.direction': elkDirection,
        'elk.spacing.nodeNode': dims.nodeNode,
        'elk.layered.spacing.nodeNodeBetweenLayers': dims.nodeLayer,
        'elk.spacing.componentComponent': dims.component,
        'elk.padding': '[top=50,left=50,bottom=50,right=50]',
        ...algoOptions,
        ...deterministicSeedOptions,
    };

    return {
        algorithm,
        direction,
        spacing,
        elkDirection,
        isHorizontal,
        dims,
        layoutOptions,
    };
}
