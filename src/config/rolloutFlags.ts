export type RolloutFlagKey =
  | 'relationSemanticsV1'
  | 'documentModelV2'
  | 'openCanvasDocumentV1'
  | 'openCanvasRendererV1'
  | 'openCanvasConnectorsV1'
  | 'openCanvasNodeLayoutV1'
  | 'openCanvasOrganizationV1'
  | 'openCanvasBasicNodesV1'
  | 'openCanvasFreeformNodesV1'
  | 'openCanvasArchitectureNodesV1'
  | 'openCanvasContainerNodesV1'
  | 'openCanvasClassEntityNodesV1'
  | 'openCanvasMindmapJourneyNodesV1'
  | 'openCanvasSequenceNodesV1'
  | 'openCanvasWireframeNodesV1'
  | 'openCanvasA11yV1'
  | 'openCanvasCanonicalCollaboration'
  | 'openCanvasAiPreviewV1'
  | 'openCanvasCrashRecoveryV1'
  | 'collaborationEnabled'
  | 'architectureLintEnabled'
  | 'importSql'
  | 'importOpenApi'
  | 'importInfraTerraformHcl'
  | 'importCodebase'
  | 'assetStoreV1';

interface RolloutFlagDefinition {
  key: RolloutFlagKey;
  envVar: string;
  defaultEnabled: boolean;
  description: string;
}

const ROLLOUT_FLAG_DEFINITIONS: Record<RolloutFlagKey, RolloutFlagDefinition> = {
  relationSemanticsV1: {
    key: 'relationSemanticsV1',
    envVar: 'VITE_RELATION_SEMANTICS_V1',
    defaultEnabled: false,
    description: 'Class/ER relation marker and routing semantics rollout',
  },
  documentModelV2: {
    key: 'documentModelV2',
    envVar: 'VITE_DOCUMENT_MODEL_V2',
    defaultEnabled: false,
    description: 'Extended document metadata for scenes, exports, and bindings',
  },
  openCanvasDocumentV1: {
    key: 'openCanvasDocumentV1',
    envVar: 'VITE_OPEN_CANVAS_DOCUMENT_V1',
    defaultEnabled: false,
    description: 'Canonical renderer-independent OpenCanvas document projection',
  },
  openCanvasRendererV1: {
    key: 'openCanvasRendererV1',
    envVar: 'VITE_OPEN_CANVAS_RENDERER_V1',
    defaultEnabled: false,
    description: 'Isolated PixiJS WebGL renderer evaluation route',
  },
  openCanvasConnectorsV1: {
    key: 'openCanvasConnectorsV1',
    envVar: 'VITE_OPEN_CANVAS_CONNECTORS_V1',
    defaultEnabled: false,
    description: 'Canonical connector projection and Pixi read-rendering evaluation',
  },
  openCanvasNodeLayoutV1: {
    key: 'openCanvasNodeLayoutV1',
    envVar: 'VITE_OPEN_CANVAS_NODE_LAYOUT_V1',
    defaultEnabled: false,
    description: 'Portable OpenCanvas node content layout model',
  },
  openCanvasOrganizationV1: {
    key: 'openCanvasOrganizationV1',
    envVar: 'VITE_OPEN_CANVAS_ORGANIZATION_V1',
    defaultEnabled: false,
    description: 'Canonical hierarchy and z-order controls in OpenCanvas',
  },
  openCanvasBasicNodesV1: {
    key: 'openCanvasBasicNodesV1',
    envVar: 'VITE_OPEN_CANVAS_BASIC_NODES_V1',
    defaultEnabled: false,
    description: 'Basic process, start, decision, end, and custom node parity in OpenCanvas',
  },
  openCanvasFreeformNodesV1: {
    key: 'openCanvasFreeformNodesV1',
    envVar: 'VITE_OPEN_CANVAS_FREEFORM_NODES_V1',
    defaultEnabled: false,
    description: 'Text, image, and annotation node parity in OpenCanvas',
  },
  openCanvasArchitectureNodesV1: {
    key: 'openCanvasArchitectureNodesV1',
    envVar: 'VITE_OPEN_CANVAS_ARCHITECTURE_NODES_V1',
    defaultEnabled: false,
    description: 'Architecture cards and provider icon node parity in OpenCanvas',
  },
  openCanvasContainerNodesV1: {
    key: 'openCanvasContainerNodesV1',
    envVar: 'VITE_OPEN_CANVAS_CONTAINER_NODES_V1',
    defaultEnabled: false,
    description: 'Group, section, and swimlane node parity in OpenCanvas',
  },
  openCanvasClassEntityNodesV1: {
    key: 'openCanvasClassEntityNodesV1',
    envVar: 'VITE_OPEN_CANVAS_CLASS_ENTITY_NODES_V1',
    defaultEnabled: false,
    description: 'UML class and ER entity node parity in OpenCanvas',
  },
  openCanvasMindmapJourneyNodesV1: {
    key: 'openCanvasMindmapJourneyNodesV1',
    envVar: 'VITE_OPEN_CANVAS_MINDMAP_JOURNEY_NODES_V1',
    defaultEnabled: false,
    description: 'Mindmap topic and journey step node parity in OpenCanvas',
  },
  openCanvasSequenceNodesV1: {
    key: 'openCanvasSequenceNodesV1',
    envVar: 'VITE_OPEN_CANVAS_SEQUENCE_NODES_V1',
    defaultEnabled: false,
    description: 'Sequence participant, note, fragment, and message parity in OpenCanvas',
  },
  openCanvasWireframeNodesV1: {
    key: 'openCanvasWireframeNodesV1',
    envVar: 'VITE_OPEN_CANVAS_WIREFRAME_NODES_V1',
    defaultEnabled: false,
    description: 'Browser, mobile, and wireframe node parity in OpenCanvas',
  },
  openCanvasA11yV1: {
    key: 'openCanvasA11yV1',
    envVar: 'VITE_OPEN_CANVAS_A11Y_V1',
    defaultEnabled: false,
    description: 'OpenCanvas semantic scene tree and spatial keyboard navigation',
  },
  openCanvasCanonicalCollaboration: {
    key: 'openCanvasCanonicalCollaboration',
    envVar: 'VITE_OPEN_CANVAS_CANONICAL_COLLABORATION',
    defaultEnabled: false,
    description: 'Canonical command collaboration in the OpenCanvas production canary',
  },
  openCanvasAiPreviewV1: {
    key: 'openCanvasAiPreviewV1',
    envVar: 'VITE_OPEN_CANVAS_AI_PREVIEW_V1',
    defaultEnabled: false,
    description: 'Validated canonical AI proposal previews and per-change decisions',
  },
  openCanvasCrashRecoveryV1: {
    key: 'openCanvasCrashRecoveryV1',
    envVar: 'VITE_OPEN_CANVAS_CRASH_RECOVERY_V1',
    defaultEnabled: false,
    description: 'Append-before-autosave crash journal and explicit workspace recovery',
  },
  collaborationEnabled: {
    key: 'collaborationEnabled',
    envVar: 'VITE_COLLABORATION_ENABLED',
    // Disabled by default: the WebRTC signaling path is unreliable for end users.
    // Set VITE_COLLABORATION_ENABLED=true to re-enable for local testing.
    defaultEnabled: false,
    description: 'WebRTC peer collaboration (beta, disabled)',
  },
  architectureLintEnabled: {
    key: 'architectureLintEnabled',
    envVar: 'VITE_ARCHITECTURE_LINT_ENABLED',
    defaultEnabled: true,
    description: 'Architecture diagram lint rules panel',
  },
  importSql: {
    key: 'importSql',
    envVar: 'VITE_IMPORT_SQL',
    defaultEnabled: false,
    description: 'SQL DDL importer (hidden — unreliable for complex schemas)',
  },
  importOpenApi: {
    key: 'importOpenApi',
    envVar: 'VITE_IMPORT_OPENAPI',
    defaultEnabled: false,
    description: 'OpenAPI/Swagger importer (hidden — JSON-only, no YAML)',
  },
  importInfraTerraformHcl: {
    key: 'importInfraTerraformHcl',
    envVar: 'VITE_IMPORT_INFRA_TERRAFORM_HCL',
    defaultEnabled: false,
    description: 'Terraform HCL importer (hidden — AI-only, hallucination-prone)',
  },
  importCodebase: {
    key: 'importCodebase',
    envVar: 'VITE_IMPORT_CODEBASE',
    defaultEnabled: false,
    description: 'Repo/codebase analyzer importer (hidden — niche, heavy)',
  },
  assetStoreV1: {
    key: 'assetStoreV1',
    envVar: 'VITE_ASSET_STORE_V1',
    // Enabled by default: user media is stored by reference in IndexedDB instead of
    // embedding multi-MB data URLs into every document/history/snapshot copy.
    // Asset ids are browser-local, so buildDiagramDocumentJson inlines them back to
    // data URLs on export — keep that in step if another cross-machine path is added.
    // Set VITE_ASSET_STORE_V1=0 to force legacy inline data-URL behavior.
    defaultEnabled: true,
    description: 'Store user images/icons in IndexedDB assets store by content hash',
  },
};

function readBooleanEnvFlag(envValue: string | undefined, defaultEnabled: boolean): boolean {
  if (envValue === '1') {
    return true;
  }
  if (envValue === '0') {
    return false;
  }
  return defaultEnabled;
}

export function isRolloutFlagEnabled(key: RolloutFlagKey): boolean {
  const definition = ROLLOUT_FLAG_DEFINITIONS[key];
  if (!definition.envVar) {
    return definition.defaultEnabled;
  }
  const envValue = import.meta.env[definition.envVar as keyof ImportMetaEnv] as string | undefined;
  return readBooleanEnvFlag(envValue, definition.defaultEnabled);
}

export const ROLLOUT_FLAGS: Record<RolloutFlagKey, boolean> = {
  relationSemanticsV1: isRolloutFlagEnabled('relationSemanticsV1'),
  documentModelV2: isRolloutFlagEnabled('documentModelV2'),
  openCanvasDocumentV1: isRolloutFlagEnabled('openCanvasDocumentV1'),
  openCanvasRendererV1: isRolloutFlagEnabled('openCanvasRendererV1'),
  openCanvasConnectorsV1: isRolloutFlagEnabled('openCanvasConnectorsV1'),
  openCanvasNodeLayoutV1: isRolloutFlagEnabled('openCanvasNodeLayoutV1'),
  openCanvasOrganizationV1: isRolloutFlagEnabled('openCanvasOrganizationV1'),
  openCanvasBasicNodesV1: isRolloutFlagEnabled('openCanvasBasicNodesV1'),
  openCanvasFreeformNodesV1: isRolloutFlagEnabled('openCanvasFreeformNodesV1'),
  openCanvasArchitectureNodesV1: isRolloutFlagEnabled('openCanvasArchitectureNodesV1'),
  openCanvasContainerNodesV1: isRolloutFlagEnabled('openCanvasContainerNodesV1'),
  openCanvasClassEntityNodesV1: isRolloutFlagEnabled('openCanvasClassEntityNodesV1'),
  openCanvasMindmapJourneyNodesV1: isRolloutFlagEnabled('openCanvasMindmapJourneyNodesV1'),
  openCanvasSequenceNodesV1: isRolloutFlagEnabled('openCanvasSequenceNodesV1'),
  openCanvasWireframeNodesV1: isRolloutFlagEnabled('openCanvasWireframeNodesV1'),
  openCanvasA11yV1: isRolloutFlagEnabled('openCanvasA11yV1'),
  openCanvasCanonicalCollaboration: isRolloutFlagEnabled('openCanvasCanonicalCollaboration'),
  openCanvasAiPreviewV1: isRolloutFlagEnabled('openCanvasAiPreviewV1'),
  openCanvasCrashRecoveryV1: isRolloutFlagEnabled('openCanvasCrashRecoveryV1'),
  collaborationEnabled: isRolloutFlagEnabled('collaborationEnabled'),
  architectureLintEnabled: isRolloutFlagEnabled('architectureLintEnabled'),
  importSql: isRolloutFlagEnabled('importSql'),
  importOpenApi: isRolloutFlagEnabled('importOpenApi'),
  importInfraTerraformHcl: isRolloutFlagEnabled('importInfraTerraformHcl'),
  importCodebase: isRolloutFlagEnabled('importCodebase'),
  assetStoreV1: isRolloutFlagEnabled('assetStoreV1'),
};
