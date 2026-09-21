import {
  SECTION_CONTENT_PADDING_TOP,
  SECTION_PADDING_BOTTOM,
  SECTION_PADDING_X,
} from '@/lib/sectionBounds';
import type {
  LayoutAlgorithm,
  LayoutDirection,
  LayoutOptions,
  ResolvedLayoutConfiguration,
} from './types';

const DIRECTION_MAP: Record<string, LayoutDirection> = {
  TB: 'DOWN',
  LR: 'RIGHT',
  RL: 'LEFT',
  BT: 'UP',
};

function getSpacingDimensions(
  spacing: LayoutOptions['spacing'] = 'normal',
  isHorizontal: boolean,
  options: LayoutOptions
): {
  nodeNode: string;
  nodeLayer: string;
  component: string;
} {
  let nodeNode = 56;
  let nodeLayer = 84;

  switch (spacing) {
    case 'compact':
      nodeNode = 40;
      nodeLayer = 60;
      break;
    case 'loose':
      nodeNode = 76;
      nodeLayer = 116;
      break;
    case 'normal':
    default:
      nodeNode = 56;
      nodeLayer = 84;
  }

  switch (options.contentDensity) {
    case 'compact':
      nodeNode -= 8;
      nodeLayer -= 10;
      break;
    case 'verbose':
      nodeNode += 10;
      nodeLayer += 14;
      break;
    default:
      break;
  }

  switch (options.diagramType) {
    case 'architecture':
    case 'infrastructure':
      nodeNode = Math.max(nodeNode, 56);
      nodeLayer = Math.max(nodeLayer, 88);
      break;
    case 'flowchart':
    case 'stateDiagram':
    case 'classDiagram':
    case 'erDiagram':
      nodeNode = Math.min(nodeNode, spacing === 'loose' ? 72 : 52);
      nodeLayer = Math.min(nodeLayer, spacing === 'loose' ? 108 : 76);
      break;
    default:
      break;
  }

  if (isHorizontal) {
    nodeLayer = Math.round(nodeLayer * 1.12);
  }

  return {
    nodeNode: String(nodeNode),
    nodeLayer: String(nodeLayer),
    component: String(nodeLayer),
  };
}

function isArchitectureLikeDiagram(diagramType: string | undefined): boolean {
  return diagramType === 'architecture' || diagramType === 'infrastructure';
}

function getAlgorithmOptions(
  algorithm: LayoutAlgorithm,
  layerSpacing: number,
  options: LayoutOptions
): Record<string, string> {
  const algorithmOptions: Record<string, string> = {};

  switch (algorithm) {
    case 'mrtree':
      algorithmOptions['elk.algorithm'] = 'org.eclipse.elk.mrtree';
      break;
    case 'force':
      algorithmOptions['elk.algorithm'] = 'org.eclipse.elk.force';
      break;
    case 'stress':
      algorithmOptions['elk.algorithm'] = 'org.eclipse.elk.stress';
      break;
    case 'radial':
      algorithmOptions['elk.algorithm'] = 'org.eclipse.elk.radial';
      break;
    default:
      algorithmOptions['elk.algorithm'] = `org.eclipse.elk.${algorithm}`;
  }
  if (algorithm === 'layered') {
    const edgeNodeSpacing = String(Math.round(layerSpacing * 0.33));
    const architectureLike = isArchitectureLikeDiagram(options.diagramType);
    Object.assign(algorithmOptions, {
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.layered.crossingMinimization.thoroughness': '64',
      'elk.layered.nodePlacement.strategy': architectureLike ? 'BRANDES_KOEPF' : 'NETWORK_SIMPLEX',
      'elk.layered.nodePlacement.favorStraightEdges': 'true',
      'elk.layered.mergeEdges': 'true',
      'elk.layered.unnecessaryBendpoints': 'true',
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.portConstraints': architectureLike ? 'FIXED_SIDE' : 'FIXED_ORDER',
      'elk.layered.spacing.edgeNodeBetweenLayers': edgeNodeSpacing,
      'elk.layered.spacing.edgeEdgeBetweenLayers': '30',
      'elk.spacing.edgeEdge': '12',
      'elk.separateConnectedComponents': 'true',
      'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
      'elk.layered.compaction.postCompaction.strategy': 'EDGE_LENGTH',
      'elk.layered.highDegreeNode.treatment': 'true',
      'elk.layered.highDegreeNode.threshold': '4',
      'elk.layered.highDegreeNode.treeHeight': '2',
      ...(architectureLike
        ? {
            'elk.spacing.edgeNode': '24',
            'elk.spacing.edgeEdge': '18',
            'elk.layered.spacing.edgeEdgeBetweenLayers': '42',
            'elk.layered.nodePlacement.bk.fixedAlignment': 'BALANCED',
            'elk.layered.priority.direction': '1',
          }
        : {}),
    });
  } else if (algorithm === 'mrtree') {
    Object.assign(algorithmOptions, {
      'elk.separateConnectedComponents': 'true',
      // FIXED_SIDE constrains ports to a node face, preventing mrtree from
      // routing edges through the center and producing cleaner trunk grouping.
      'elk.portConstraints': 'FIXED_SIDE',
      'elk.spacing.edgeEdge': '12',
    });
  } else if (algorithm === 'force') {
    Object.assign(algorithmOptions, {
      'elk.force.iterations': '500',
      'elk.force.repulsivePower': String(layerSpacing / 20),
      'elk.portConstraints': 'FREE', // Force layout needs free ports
    });
  } else if (algorithm === 'stress') {
    algorithmOptions['elk.stress.desiredEdgeLength'] = String(layerSpacing);
    algorithmOptions['elk.portConstraints'] = 'FREE';
  } else if (algorithm === 'radial') {
    algorithmOptions['elk.radial.radius'] = String(layerSpacing);
    algorithmOptions['elk.portConstraints'] = 'FREE';
  }

  return algorithmOptions;
}

export function getDeterministicSeedOptions(algorithm: LayoutAlgorithm): Record<string, string> {
  if (algorithm === 'force' || algorithm === 'stress' || algorithm === 'radial') {
    return { 'elk.randomSeed': '1337' };
  }
  return {};
}

export function resolveLayoutPresetOptions(
  options: LayoutOptions
): Pick<LayoutOptions, 'algorithm' | 'direction' | 'spacing'> {
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

export function buildResolvedLayoutConfiguration(
  options: LayoutOptions
): ResolvedLayoutConfiguration {
  const {
    direction = 'TB',
    algorithm = 'layered',
    spacing = 'normal',
  } = resolveLayoutPresetOptions(options);
  const elkDirection = DIRECTION_MAP[direction] || 'DOWN';
  const isHorizontal = direction === 'LR' || direction === 'RL';

  const dims = getSpacingDimensions(spacing, isHorizontal, options);
  const algoOptions = getAlgorithmOptions(algorithm, parseFloat(dims.nodeLayer), options);
  const deterministicSeedOptions = getDeterministicSeedOptions(algorithm);
  const layoutOptions = {
    'elk.direction': elkDirection,
    'elk.spacing.nodeNode': dims.nodeNode,
    'elk.layered.spacing.nodeNodeBetweenLayers': dims.nodeLayer,
    'elk.spacing.componentComponent': dims.component,
    'elk.padding': `[top=${SECTION_CONTENT_PADDING_TOP},left=${SECTION_PADDING_X},bottom=${SECTION_PADDING_BOTTOM},right=${SECTION_PADDING_X}]`,
    'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
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
