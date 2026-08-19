import { createDefaultSceneLayer } from '../../domain/document/defaults';
import {
  SCENE_DOCUMENT_FORMAT,
  SCENE_DOCUMENT_VERSION,
  type SceneConnector,
  type SceneDocumentV1,
  type SceneNode,
  type ScenePage,
} from '../../domain/document/types';

const NODE_WIDTH = 168;
const NODE_HEIGHT = 72;
const COLUMN_GAP = 84;
const ROW_GAP = 62;
const BASIC_NODE_KINDS = ['process', 'start', 'decision', 'end', 'custom'] as const;
const FREEFORM_NODE_KINDS = ['text', 'image', 'annotation'] as const;
const FIXTURE_IMAGE =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180"%3E%3Crect width="320" height="180" rx="24" fill="%23fff7ed"/%3E%3Ccircle cx="90" cy="65" r="24" fill="%23fb923c"/%3E%3Cpath d="M34 152l72-62 46 38 42-35 92 59z" fill="%23e95420"/%3E%3C/svg%3E';

function fixtureNodeKind(index: number): string {
  if (index < BASIC_NODE_KINDS.length) return BASIC_NODE_KINDS[index];
  if (index === 8) return 'architecture';
  if (index === 10) return 'group';
  if (index === 11) return 'section';
  if (index === 12) return 'swimlane';
  if (index === 16) return 'class';
  if (index === 17) return 'er_entity';
  if (index >= 18 && index <= 21) return 'mindmap';
  if (index === 22) return 'journey';
  if (index === 23 || index === 24 || index === 27) return 'sequence_participant';
  if (index === 25) return 'sequence_note';
  if (index === 26) return 'annotation';
  if (index === 28) return 'browser';
  if (index === 29) return 'mobile';
  return FREEFORM_NODE_KINDS[index - BASIC_NODE_KINDS.length] ?? 'process';
}

function fixtureParentId(index: number): string | null {
  if (index === 13) return 'node-10';
  if (index === 14) return 'node-11';
  if (index === 15) return 'node-12';
  return null;
}

function fixtureTranslation(index: number, columns: number): { x: number; y: number } {
  if (index >= 13 && index <= 15) return { x: 36, y: 70 };
  if (index === 10) return { x: 0, y: -300 };
  if (index === 11) return { x: 460, y: -300 };
  if (index === 12) return { x: 860, y: -300 };
  if (index === 18) return { x: 520, y: 470 };
  if (index === 19) return { x: 220, y: 420 };
  if (index === 20) return { x: 820, y: 420 };
  if (index === 21) return { x: 1_060, y: 520 };
  if (index === 22) return { x: 520, y: 650 };
  if (index === 23) return { x: 220, y: 850 };
  if (index === 24) return { x: 520, y: 890 };
  if (index === 25) return { x: 405, y: 1_035 };
  if (index === 26) return { x: 180, y: 1_155 };
  if (index === 27) return { x: 820, y: 890 };
  if (index === 28) return { x: 180, y: 1_360 };
  if (index === 29) return { x: 680, y: 1_360 };
  return {
    x: (index % columns) * (NODE_WIDTH + COLUMN_GAP),
    y: Math.floor(index / columns) * (NODE_HEIGHT + ROW_GAP),
  };
}

function fixtureSize(index: number): { width: number; height: number } {
  if (index === 8) return { width: 180, height: 96 };
  if (index === 9) return { width: 116, height: 118 };
  if (index === 10) return { width: 420, height: 240 };
  if (index === 11) return { width: 360, height: 230 };
  if (index === 12) return { width: 420, height: 220 };
  if (index >= 13 && index <= 15) return { width: 144, height: 64 };
  if (index === 16) return { width: 238, height: 216 };
  if (index === 17) return { width: 238, height: 198 };
  if (index === 18) return { width: 190, height: 78 };
  if (index === 19 || index === 20) return { width: 168, height: 60 };
  if (index === 21) return { width: 150, height: 54 };
  if (index === 22) return { width: 230, height: 128 };
  if (index === 23 || index === 24 || index === 27) return { width: 140, height: 360 };
  if (index === 25) return { width: 170, height: 72 };
  if (index === 26) return { width: 780, height: 132 };
  if (index === 28) return { width: 400, height: 300 };
  if (index === 29) return { width: 240, height: 480 };
  return { width: NODE_WIDTH, height: NODE_HEIGHT };
}

function fixtureLabel(index: number): string {
  const labels: Record<number, string> = {
    5: 'Portable text',
    6: 'Deployment preview',
    7: 'Review',
    8: 'Orders API',
    9: 'JavaScript',
    10: 'Platform',
    11: 'Checkout domain',
    12: 'Delivery',
    16: 'Order',
    17: 'orders',
    18: 'Checkout experience',
    19: 'Discover products',
    20: 'Complete purchase',
    21: 'Payment recovery',
    22: 'Confirm payment',
    23: 'Buyer',
    24: 'Checkout API',
    25: 'Payment may retry safely',
    26: 'ALT',
    27: 'Payment worker',
    28: 'console.openflowkit.local',
    29: 'Checkout',
  };
  return labels[index] ?? `Service ${index + 1}`;
}

function fixtureWorldTranslation(node: SceneNode, nodes: readonly SceneNode[]) {
  let x = node.transform.translation.x;
  let y = node.transform.translation.y;
  let parentId = node.parentId;
  const visited = new Set<string>([node.id]);
  while (parentId && !visited.has(parentId)) {
    visited.add(parentId);
    const parent = nodes.find((candidate) => candidate.id === parentId);
    if (!parent) break;
    x += parent.transform.translation.x;
    y += parent.transform.translation.y;
    parentId = parent.parentId;
  }
  return { x, y };
}

function fixtureConnector(index: number, nodes: readonly SceneNode[]): SceneConnector {
  const source =
    index === 19
      ? nodes[18]
      : index === 24
        ? nodes[24]
        : index === 25
          ? nodes[24]
          : index === 26
            ? nodes[27]
            : nodes[index];
  const target =
    index === 23
      ? nodes[24]
      : index === 24
        ? nodes[23]
        : index === 25
          ? nodes[27]
          : index === 26
            ? nodes[24]
            : nodes[index + 1];
  const routeKinds = ['direct', 'polyline', 'orthogonal', 'bezier'] as const;
  const routeKind = routeKinds[index % routeKinds.length];
  const sourcePosition = fixtureWorldTranslation(source, nodes);
  const targetPosition = fixtureWorldTranslation(target, nodes);
  const sourceCenter = {
    x: sourcePosition.x + source.size.width / 2,
    y: sourcePosition.y + source.size.height / 2,
  };
  const targetCenter = {
    x: targetPosition.x + target.size.width / 2,
    y: targetPosition.y + target.size.height / 2,
  };
  const semanticsByIndex: Record<number, SceneConnector['semantics']> = {
    0: { condition: 'success' },
    1: { condition: 'error' },
    2: { classRelation: 'o--|>' },
    3: { erRelation: '||--o{' },
    4: { archProtocol: 'HTTPS', archPort: '443', archDirection: '-->' },
    5: { seqMessageKind: 'return' },
    23: { seqMessageKind: 'sync', seqMessageOrder: 0 },
    24: { seqMessageKind: 'return', seqMessageOrder: 1 },
    25: { seqMessageKind: 'async', seqMessageOrder: 2 },
    26: { seqMessageKind: 'destroy', seqMessageOrder: 3 },
  };
  const labels =
    index < 6 || (index >= 23 && index <= 26)
      ? [
          {
            id: `connector-${index}:label`,
            text:
              ['Healthy', 'Failure', 'implements', 'owns many', 'HTTPS :443', 'response'][index] ??
              ['Submit order', 'Accepted', 'Authorize', 'Declined'][index - 23],
            pathRatio: 0.5,
            offset: { x: 0, y: -12 },
            metadata: {},
          },
        ]
      : [];
  return {
    id: `connector-${index}`,
    source: { nodeId: source.id, portId: null, anchor: null },
    target: { nodeId: target.id, portId: null, anchor: null },
    route: {
      kind: routeKind,
      ownership: routeKind === 'polyline' ? 'manual' : 'automatic',
    },
    waypoints:
      routeKind === 'polyline'
        ? [
            {
              x: (sourceCenter.x + targetCenter.x) / 2,
              y: (sourceCenter.y + targetCenter.y) / 2 - 42,
            },
          ]
        : [],
    labels,
    appearance: {
      markerEnd: { type: 'arrowclosed' },
      ...(index === 5 || index === 24 ? { dashPattern: 'dashed' } : {}),
    },
    semantics: semanticsByIndex[index] ?? {},
    metadata: {},
    extensions: {},
  };
}

export function createPixiSpikePage(nodeCount: number): ScenePage {
  const safeCount = Math.max(1, Math.floor(nodeCount));
  const columns = Math.ceil(Math.sqrt(safeCount * 1.6));
  const nodes: SceneNode[] = Array.from({ length: safeCount }, (_, index) => ({
    id: `node-${index}`,
    kind: fixtureNodeKind(index),
    parentId: fixtureParentId(index),
    layerId: 'default',
    zIndex: index,
    transform: {
      translation: fixtureTranslation(index, columns),
      rotationRadians: 0,
      scale: { x: 1, y: 1 },
    },
    size: fixtureSize(index),
    content: {
      label: fixtureLabel(index),
      ...(index === 5
        ? { fontSize: '18', fontWeight: '700', color: 'slate', backgroundColor: '#f8fafc' }
        : {}),
      ...(index === 6 ? { imageUrl: FIXTURE_IMAGE, transparency: 0.92 } : {}),
      ...(index === 7 ? { subLabel: 'Validate rollback before release.', color: 'yellow' } : {}),
      ...(index === 8
        ? {
            archProvider: 'aws',
            archProviderLabel: 'AWS',
            archResourceType: 'service',
            archEnvironment: 'prod',
            archZone: 'ap-south-1a',
            archTrustDomain: 'payments',
            archIconPackId: 'aws-official-starter-v1',
            archIconShapeId: 'compute-lambda',
            color: 'violet',
          }
        : {}),
      ...(index === 9
        ? {
            assetPresentation: 'icon',
            assetProvider: 'developer',
            archProviderLabel: 'Developer',
            archResourceType: 'language',
            archIconPackId: 'developer-icons-v1',
            archIconShapeId: 'languages-javascript',
          }
        : {}),
      ...(index === 10
        ? { subLabel: 'Runtime boundary', color: 'violet', sectionCollapsed: false }
        : {}),
      ...(index === 11
        ? { subLabel: 'Owned by Payments', color: 'blue', sectionLocked: true }
        : {}),
      ...(index === 12 ? { subLabel: 'Fulfillment lane', color: 'emerald' } : {}),
      ...(index === 16
        ? {
            classStereotype: 'aggregate',
            classAttributes: ['- id: UUID', '+ status: OrderStatus', '~ total: Money'],
            classMethods: ['+ submit(): Promise<void>', '# validate(): boolean'],
            color: 'slate',
          }
        : {}),
      ...(index === 17
        ? {
            erFields: [
              {
                name: 'id',
                dataType: 'UUID',
                isPrimaryKey: true,
                isForeignKey: false,
                isNotNull: true,
                isUnique: true,
              },
              {
                name: 'customer_id',
                dataType: 'UUID',
                isPrimaryKey: false,
                isForeignKey: true,
                isNotNull: true,
                isUnique: false,
                referencesTable: 'customers',
                referencesField: 'id',
              },
              {
                name: 'status',
                dataType: 'order_status',
                isPrimaryKey: false,
                isForeignKey: false,
                isNotNull: true,
                isUnique: false,
              },
            ],
            color: 'slate',
          }
        : {}),
      ...(index === 18
        ? {
            mindmapDepth: 0,
            mindmapAlias: 'checkout.root',
            mindmapWrapper: 'double-circle',
            mindmapBranchStyle: 'curved',
            color: 'slate',
            colorMode: 'filled',
          }
        : {}),
      ...(index === 19
        ? {
            mindmapDepth: 1,
            mindmapParentId: 'node-18',
            mindmapAlias: 'checkout.discover',
            mindmapWrapper: 'double-square',
            mindmapSide: 'left',
            mindmapBranchStyle: 'curved',
            color: 'white',
          }
        : {}),
      ...(index === 20
        ? {
            mindmapDepth: 1,
            mindmapParentId: 'node-18',
            mindmapAlias: 'checkout.purchase',
            mindmapWrapper: 'hexagon',
            mindmapSide: 'right',
            mindmapBranchStyle: 'curved',
            mindmapCollapsed: true,
            color: 'white',
          }
        : {}),
      ...(index === 21
        ? {
            mindmapDepth: 2,
            mindmapParentId: 'node-20',
            mindmapWrapper: 'subroutine',
            mindmapSide: 'right',
            mindmapBranchStyle: 'curved',
            color: 'white',
          }
        : {}),
      ...(index === 22
        ? {
            journeyTitle: 'Checkout journey',
            journeySection: 'Payment',
            journeyTask: 'Confirm payment',
            journeyActor: 'Buyer',
            journeyScore: 2,
            subLabel: 'Buyer',
            color: 'red',
          }
        : {}),
      ...(index === 23
        ? {
            seqParticipantKind: 'actor',
            seqParticipantAlias: 'buyer',
            seqActivations: [
              { order: 0, activate: true },
              { order: 1, activate: false },
            ],
            color: 'slate',
          }
        : {}),
      ...(index === 24
        ? {
            seqParticipantKind: 'participant',
            seqParticipantAlias: 'api',
            seqActivations: [
              { order: 0, activate: true },
              { order: 3, activate: false },
            ],
            color: 'blue',
          }
        : {}),
      ...(index === 25
        ? {
            seqNoteTarget: 'node-24',
            seqNoteTargets: ['node-24', 'node-27'],
            seqNotePosition: 'over',
            seqMessageOrder: 2,
            seqFragment: {
              type: 'alt',
              condition: 'payment fails',
              branchKind: 'else',
              edgeIds: ['connector-26'],
            },
          }
        : {}),
      ...(index === 26
        ? {
            subLabel: 'payment authorized',
            seqFragmentId: 'fragment-payment',
            seqMessageOrder: 2,
            color: 'violet',
          }
        : {}),
      ...(index === 27
        ? {
            seqParticipantKind: 'participant',
            seqParticipantAlias: 'worker',
            seqActivations: [
              { order: 2, activate: true },
              { order: 4, activate: false },
            ],
            color: 'emerald',
          }
        : {}),
      ...(index === 28 ? { variant: 'dashboard', icon: 'lock', color: 'blue' } : {}),
      ...(index === 29 ? { variant: 'chat', color: 'slate' } : {}),
      ...(index < 5 ? { icon: 'Box', subLabel: 'Runtime' } : {}),
      ...(index < 5
        ? {
            contentLayout: {
              version: 1,
              horizontal: 'center',
              vertical: 'center',
              iconPlacement: ['top', 'right', 'bottom', 'left', 'free'][index],
              labelAlignment: 'center',
              padding: { top: 12, right: 12, bottom: 12, left: 12 },
              gap: 6,
              iconScale: 1,
              freeIconPosition: { x: 0.85, y: 0.2 },
            },
          }
        : {}),
    },
    appearance: {},
    ports: [],
    metadata: {},
    extensions: {},
  }));
  const connectors: SceneConnector[] = nodes
    .slice(1)
    .map((_, index) => fixtureConnector(index, nodes));

  return {
    id: `pixi-spike-${safeCount}`,
    name: `Pixi spike ${safeCount}`,
    diagramKind: 'flowchart',
    layers: [createDefaultSceneLayer()],
    nodes,
    connectors,
    metadata: {},
    extensions: {},
  };
}

export function createPixiSpikeDocument(nodeCount: number): SceneDocumentV1 {
  return {
    format: SCENE_DOCUMENT_FORMAT,
    schemaVersion: SCENE_DOCUMENT_VERSION,
    id: `pixi-spike-document-${nodeCount}`,
    name: 'OpenCanvas Pixi renderer lab',
    createdAt: '2026-08-07T00:00:00.000Z',
    updatedAt: '2026-08-07T00:00:00.000Z',
    pages: [createPixiSpikePage(nodeCount)],
    metadata: {},
    extensions: {},
  };
}
