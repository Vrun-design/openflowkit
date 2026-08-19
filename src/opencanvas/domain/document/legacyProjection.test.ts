import { describe, expect, it } from 'vitest';
import { projectLegacyDocument, restoreLegacyDocumentSnapshot } from './legacyProjection';
import { validateSceneDocumentV1 } from './validation';

const options = {
  documentId: 'document-1',
  pageId: 'page-1',
  now: '2026-08-07T12:00:00.000Z',
} as const;

function createLegacyDocument() {
  return {
    version: '1.1',
    name: 'Architecture',
    createdAt: '2026-01-01T00:00:00.000Z',
    diagramType: 'architecture',
    customTopLevelField: { keep: true },
    nodes: [
      {
        id: 'api',
        type: 'architecture',
        position: { x: 100, y: 200 },
        width: 180,
        height: 90,
        zIndex: 3,
        selected: true,
        data: {
          label: 'API',
          contentLayout: {
            version: 1,
            horizontal: 'end',
            vertical: 'center',
            iconPlacement: 'left',
            labelAlignment: 'start',
            padding: { top: 8, right: 12, bottom: 8, left: 12 },
            gap: 6,
            iconScale: 1,
            freeIconPosition: { x: 0.5, y: 0.5 },
          },
          rotation: 90,
          layerId: 'default',
          providerSpecific: { region: 'ap-south-1' },
        },
      },
      {
        id: 'db',
        type: 'architecture',
        position: { x: 400, y: 200 },
        style: { width: 160, height: 80 },
        data: { label: 'DB' },
      },
    ],
    edges: [
      {
        id: 'api-db',
        source: 'api',
        target: 'db',
        sourceHandle: 'right',
        targetHandle: 'left',
        label: 'writes',
        animated: true,
        markerEnd: { type: 'arrowclosed' },
        style: { stroke: '#2563eb', strokeWidth: 3, strokeDasharray: '8 4' },
        data: {
          routingMode: 'manual',
          curve: 'smoothstep',
          labelPosition: 0.25,
          labelOffsetY: -10,
          waypoints: [{ x: 300, y: 245 }],
          unknownEdgeData: 'preserve',
          condition: 'success',
          archProtocol: 'HTTPS',
          archPort: '443',
        },
      },
    ],
  };
}

describe('legacy document projection', () => {
  it('projects legacy nodes, connectors, geometry, and route intent', () => {
    const document = projectLegacyDocument(createLegacyDocument(), options);
    const page = document.pages[0];

    expect(validateSceneDocumentV1(document).success).toBe(true);
    expect(page.diagramKind).toBe('architecture');
    expect(page.nodes[0]).toMatchObject({
      id: 'api',
      kind: 'architecture',
      layerId: 'default',
      zIndex: 3,
      transform: {
        translation: { x: 100, y: 200 },
        rotationRadians: Math.PI / 2,
        scale: { x: 1, y: 1 },
      },
      size: { width: 180, height: 90 },
      content: { label: 'API', providerSpecific: { region: 'ap-south-1' } },
    });
    expect(page.nodes[1].size).toEqual({ width: 160, height: 80 });
    expect(page.connectors[0]).toMatchObject({
      source: { nodeId: 'api', portId: 'right' },
      target: { nodeId: 'db', portId: 'left' },
      route: { kind: 'orthogonal', ownership: 'manual' },
      waypoints: [{ x: 300, y: 245 }],
      labels: [{ text: 'writes', pathRatio: 0.25, offset: { x: 0, y: -10 } }],
      appearance: {
        stroke: '#2563eb',
        strokeWidth: 3,
        strokeDasharray: '8 4',
        markerEnd: { type: 'arrowclosed' },
        animated: true,
      },
      semantics: { condition: 'success', archProtocol: 'HTTPS', archPort: '443' },
    });
  });

  it('round-trips the exact legacy JSON snapshot without mutation', () => {
    const input = createLegacyDocument();
    const before = structuredClone(input);
    const document = projectLegacyDocument(input, options);
    const restored = restoreLegacyDocumentSnapshot(document);

    expect(input).toEqual(before);
    expect(restored).toEqual(input);
    expect(restored).not.toBe(input);
    expect(restored?.nodes).not.toBe(input.nodes);
  });

  it('uses deterministic defaults for absent optional legacy fields', () => {
    const document = projectLegacyDocument(
      {
        nodes: [{ id: 'node-1', position: {}, data: { label: 'Node' } }],
        edges: [],
      },
      options
    );
    const node = document.pages[0].nodes[0];

    expect(document.name).toBe('OpenFlowKit Diagram');
    expect(document.createdAt).toBe(options.now);
    expect(node.kind).toBe('custom');
    expect(node.transform.translation).toEqual({ x: 0, y: 0 });
    expect(node.size).toEqual({ width: 0, height: 0 });
  });

  it('preserves every basic node family and its authored presentation data', () => {
    const kinds = ['process', 'start', 'decision', 'end', 'custom'];
    const input = {
      nodes: kinds.map((kind, index) => ({
        id: `${kind}-${index}`,
        type: kind,
        position: { x: index * 100, y: 0 },
        data: { label: kind, shape: kind === 'decision' ? 'diamond' : 'rounded' },
      })),
      edges: [],
    };
    const document = projectLegacyDocument(input, options);

    expect(document.pages[0].nodes.map((node) => node.kind)).toEqual(kinds);
    expect(restoreLegacyDocumentSnapshot(document)).toEqual(input);
  });

  it('preserves text, image, and annotation content through the legacy snapshot', () => {
    const input = {
      nodes: [
        {
          id: 'text',
          type: 'text',
          position: { x: 0, y: 0 },
          data: { label: 'Heading', fontSize: '24' },
        },
        {
          id: 'image',
          type: 'image',
          position: { x: 10, y: 0 },
          data: {
            label: 'Preview',
            imageAssetId: 'sha256:abc',
            imageUrl: 'data:image/png;base64,AA==',
          },
        },
        {
          id: 'note',
          type: 'annotation',
          position: { x: 20, y: 0 },
          data: { label: 'Risk', subLabel: 'Rotate keys', color: 'yellow' },
        },
      ],
      edges: [],
    };
    const document = projectLegacyDocument(input, options);

    expect(document.pages[0].nodes.map(({ kind, content }) => ({ kind, content }))).toMatchObject([
      { kind: 'text', content: { label: 'Heading', fontSize: '24' } },
      {
        kind: 'image',
        content: { imageAssetId: 'sha256:abc', imageUrl: 'data:image/png;base64,AA==' },
      },
      { kind: 'annotation', content: { label: 'Risk', subLabel: 'Rotate keys', color: 'yellow' } },
    ]);
    expect(restoreLegacyDocumentSnapshot(document)).toEqual(input);
  });

  it('preserves architecture and provider-icon identities through the legacy snapshot', () => {
    const input = {
      nodes: [
        {
          id: 'lambda',
          type: 'architecture',
          position: { x: 0, y: 0 },
          data: {
            label: 'Orders API',
            archProvider: 'aws',
            archIconPackId: 'aws-official-starter-v1',
            archIconShapeId: 'compute-lambda',
          },
        },
        {
          id: 'javascript',
          type: 'custom',
          position: { x: 200, y: 0 },
          data: {
            label: 'JavaScript',
            assetPresentation: 'icon',
            assetProvider: 'developer',
            archIconPackId: 'developer-icons-v1',
            archIconShapeId: 'languages-javascript',
            iconAssetId: 'sha256:icon',
            customIconUrl: 'data:image/svg+xml,ok',
          },
        },
      ],
      edges: [],
    };
    const document = projectLegacyDocument(input, options);

    expect(document.pages[0].nodes.map((node) => node.content)).toMatchObject([
      { archProvider: 'aws', archIconShapeId: 'compute-lambda' },
      { assetPresentation: 'icon', iconAssetId: 'sha256:icon' },
    ]);
    expect(restoreLegacyDocumentSnapshot(document)).toEqual(input);
  });

  it('preserves container families, parent relationships, and structural state', () => {
    const input = {
      nodes: [
        {
          id: 'platform',
          type: 'group',
          position: { x: 20, y: 30 },
          data: { label: 'Platform', sectionCollapsed: true },
        },
        {
          id: 'payments',
          type: 'section',
          position: { x: 40, y: 60 },
          parentId: 'platform',
          data: { label: 'Payments', sectionLocked: true, sectionLayoutMode: 'freeform' },
        },
        {
          id: 'delivery',
          type: 'swimlane',
          position: { x: 10, y: 50 },
          parentId: 'payments',
          data: { label: 'Delivery', sectionHidden: true },
        },
      ],
      edges: [],
    };
    const document = projectLegacyDocument(input, options);

    expect(
      document.pages[0].nodes.map(({ kind, parentId, content }) => ({ kind, parentId, content }))
    ).toMatchObject([
      { kind: 'group', parentId: null, content: { sectionCollapsed: true } },
      { kind: 'section', parentId: 'platform', content: { sectionLocked: true } },
      { kind: 'swimlane', parentId: 'payments', content: { sectionHidden: true } },
    ]);
    expect(restoreLegacyDocumentSnapshot(document)).toEqual(input);
  });

  it('preserves sequence participants, notes, fragments, and message semantics', () => {
    const fragment = {
      type: 'alt',
      condition: 'payment fails',
      branchKind: 'else',
      edgeIds: ['message-1'],
    };
    const input = {
      nodes: [
        {
          id: 'buyer',
          type: 'sequence_participant',
          position: { x: 0, y: 0 },
          data: {
            label: 'Buyer',
            seqParticipantKind: 'actor',
            seqParticipantAlias: 'buyer',
            seqActivations: [{ order: 0, activate: true }],
          },
        },
        {
          id: 'api',
          type: 'sequence_participant',
          position: { x: 220, y: 40 },
          data: { label: 'API', seqParticipantKind: 'participant' },
        },
        {
          id: 'note',
          type: 'sequence_note',
          position: { x: 120, y: 160 },
          data: {
            label: 'Retry safely',
            seqNoteTargets: ['buyer', 'api'],
            seqNotePosition: 'over',
            seqMessageOrder: 1,
            seqFragment: fragment,
          },
        },
        {
          id: 'fragment',
          type: 'annotation',
          position: { x: 0, y: 220 },
          data: { label: 'ALT', seqFragmentId: 'alt-1', seqMessageOrder: 1 },
        },
      ],
      edges: [
        {
          id: 'message-1',
          type: 'sequence_message',
          source: 'buyer',
          target: 'api',
          label: 'Submit order',
          data: { seqMessageKind: 'async', seqMessageOrder: 1, seqFragment: fragment },
        },
      ],
    };
    const document = projectLegacyDocument(input, options);

    expect(document.pages[0].nodes.map(({ kind, content }) => ({ kind, content }))).toMatchObject([
      {
        kind: 'sequence_participant',
        content: { seqParticipantKind: 'actor', seqParticipantAlias: 'buyer' },
      },
      { kind: 'sequence_participant', content: { seqParticipantKind: 'participant' } },
      { kind: 'sequence_note', content: { seqNotePosition: 'over', seqMessageOrder: 1 } },
      { kind: 'annotation', content: { seqFragmentId: 'alt-1', seqMessageOrder: 1 } },
    ]);
    expect(document.pages[0].connectors[0].semantics).toMatchObject({
      seqMessageKind: 'async',
      seqMessageOrder: 1,
      seqFragment: fragment,
    });
    expect(restoreLegacyDocumentSnapshot(document)).toEqual(input);
  });

  it('preserves browser and mobile wireframe variants and media references', () => {
    const input = {
      nodes: [
        {
          id: 'console',
          type: 'browser',
          position: { x: 0, y: 0 },
          style: { width: 400, height: 300 },
          data: {
            label: 'console.example.test',
            variant: 'dashboard',
            icon: 'lock',
            color: 'blue',
            imageAssetId: 'sha256:browser',
            imageUrl: 'data:image/png;base64,AA==',
          },
        },
        {
          id: 'checkout',
          type: 'mobile',
          position: { x: 500, y: 0 },
          style: { width: 300, height: 600 },
          data: { label: 'Checkout', variant: 'chat', color: 'slate' },
        },
      ],
      edges: [],
    };
    const document = projectLegacyDocument(input, options);

    expect(document.pages[0].nodes.map(({ kind, content }) => ({ kind, content }))).toMatchObject([
      {
        kind: 'browser',
        content: {
          variant: 'dashboard',
          icon: 'lock',
          imageAssetId: 'sha256:browser',
          imageUrl: 'data:image/png;base64,AA==',
        },
      },
      { kind: 'mobile', content: { label: 'Checkout', variant: 'chat' } },
    ]);
    expect(restoreLegacyDocumentSnapshot(document)).toEqual(input);
  });

  it('rejects malformed or non-JSON legacy documents', () => {
    expect(() => projectLegacyDocument({ nodes: [] }, options)).toThrow(/nodes and edges/);
    expect(() =>
      projectLegacyDocument({ nodes: [], edges: [], invalid: undefined }, options)
    ).toThrow(/JSON values/);
    expect(() =>
      projectLegacyDocument({ nodes: [{ id: '', position: {}, data: {} }], edges: [] }, options)
    ).toThrow(/node id/);
  });

  it('returns null when no recovery snapshot exists', () => {
    const document = projectLegacyDocument(createLegacyDocument(), options);
    expect(restoreLegacyDocumentSnapshot({ ...document, extensions: {} })).toBeNull();
  });
});
