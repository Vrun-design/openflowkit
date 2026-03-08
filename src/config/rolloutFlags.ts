export type RolloutFlagKey =
    | 'historyModelV2'
    | 'visualQualityV2'
    | 'mermaidSyncV1'
    | 'familyPluginV1'
    | 'connectorModelV1'
    | 'relationSemanticsV1'
    | 'stateDiagramV1'
    | 'indexedDbStorageV1'
    | 'canvasInteractionsV1'
    | 'shapeLibraryV1'
    | 'templateLibraryV1'
    | 'collaborationV1'
    | 'collaborationIndexedDbV1'
    | 'reactFlowV12Migration'
    | 'architectureParentingV12'
    | 'reactFlowV12Cleanup';

interface RolloutFlagDefinition {
    key: RolloutFlagKey;
    envVar: string;
    defaultEnabled: boolean;
    description: string;
}

const ROLLOUT_FLAG_DEFINITIONS: Record<RolloutFlagKey, RolloutFlagDefinition> = {
    historyModelV2: {
        key: 'historyModelV2',
        envVar: 'VITE_HISTORY_MODEL_V2',
        defaultEnabled: true,
        description: 'Store-level history model v2 path',
    },
    visualQualityV2: {
        key: 'visualQualityV2',
        envVar: 'VITE_VISUAL_QUALITY_V2',
        defaultEnabled: true,
        description: 'Phase 0 visual quality rollout',
    },
    mermaidSyncV1: {
        key: 'mermaidSyncV1',
        envVar: 'VITE_MERMAID_SYNC_V1',
        defaultEnabled: false,
        description: 'Bidirectional Mermaid code panel and diagnostics',
    },
    familyPluginV1: {
        key: 'familyPluginV1',
        envVar: 'VITE_FAMILY_PLUGIN_V1',
        defaultEnabled: false,
        description: 'Diagram family plugin routing rollout',
    },
    connectorModelV1: {
        key: 'connectorModelV1',
        envVar: 'VITE_CONNECTOR_MODEL_V1',
        defaultEnabled: false,
        description: 'Unified custom renderer coverage for all regular connector styles',
    },
    relationSemanticsV1: {
        key: 'relationSemanticsV1',
        envVar: 'VITE_RELATION_SEMANTICS_V1',
        defaultEnabled: false,
        description: 'Class/ER relation marker and routing semantics rollout',
    },
    stateDiagramV1: {
        key: 'stateDiagramV1',
        envVar: 'VITE_STATE_DIAGRAM_V1',
        defaultEnabled: true,
        description: 'Dedicated state diagram plugin dispatch rollout',
    },
    indexedDbStorageV1: {
        key: 'indexedDbStorageV1',
        envVar: 'VITE_INDEXEDDB_STORAGE_V1',
        defaultEnabled: true,
        description: 'IndexedDB storage abstraction scaffold rollout',
    },
    canvasInteractionsV1: {
        key: 'canvasInteractionsV1',
        envVar: 'VITE_CANVAS_INTERACTIONS_V1',
        defaultEnabled: true,
        description: 'Canvas micro-interactions rollout (double-click create, drag-create/connect)',
    },
    shapeLibraryV1: {
        key: 'shapeLibraryV1',
        envVar: 'VITE_SHAPE_LIBRARY_V1',
        defaultEnabled: false,
        description: 'Shape library registry scaffold rollout',
    },
    templateLibraryV1: {
        key: 'templateLibraryV1',
        envVar: 'VITE_TEMPLATE_LIBRARY_V1',
        defaultEnabled: false,
        description: 'Template registry scaffold rollout',
    },
    collaborationV1: {
        key: 'collaborationV1',
        envVar: 'VITE_COLLABORATION_V1',
        defaultEnabled: true,
        description: 'Real-time collaboration scaffold rollout',
    },
    collaborationIndexedDbV1: {
        key: 'collaborationIndexedDbV1',
        envVar: 'VITE_COLLABORATION_INDEXEDDB_V1',
        defaultEnabled: true,
        description: 'Local IndexedDB persistence for collaboration rooms',
    },
    reactFlowV12Migration: {
        key: 'reactFlowV12Migration',
        envVar: 'VITE_REACTFLOW_V12_MIGRATION',
        defaultEnabled: false,
        description: 'React Flow v12 migration path',
    },
    architectureParentingV12: {
        key: 'architectureParentingV12',
        envVar: 'VITE_ARCHITECTURE_PARENTING_V12',
        defaultEnabled: false,
        description: 'React Flow v12 parent/extent rollout for architecture boundaries',
    },
    reactFlowV12Cleanup: {
        key: 'reactFlowV12Cleanup',
        envVar: 'VITE_REACTFLOW_V12_CLEANUP',
        defaultEnabled: false,
        description: 'Post-migration cleanup rollout for temporary compatibility shims',
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
    const envValue = import.meta.env[definition.envVar as keyof ImportMetaEnv] as string | undefined;
    return readBooleanEnvFlag(envValue, definition.defaultEnabled);
}

export const ROLLOUT_FLAGS: Record<RolloutFlagKey, boolean> = {
    historyModelV2: isRolloutFlagEnabled('historyModelV2'),
    visualQualityV2: isRolloutFlagEnabled('visualQualityV2'),
    mermaidSyncV1: isRolloutFlagEnabled('mermaidSyncV1'),
    familyPluginV1: isRolloutFlagEnabled('familyPluginV1'),
    connectorModelV1: isRolloutFlagEnabled('connectorModelV1'),
    relationSemanticsV1: isRolloutFlagEnabled('relationSemanticsV1'),
    stateDiagramV1: isRolloutFlagEnabled('stateDiagramV1'),
    indexedDbStorageV1: isRolloutFlagEnabled('indexedDbStorageV1'),
    canvasInteractionsV1: isRolloutFlagEnabled('canvasInteractionsV1'),
    shapeLibraryV1: isRolloutFlagEnabled('shapeLibraryV1'),
    templateLibraryV1: isRolloutFlagEnabled('templateLibraryV1'),
    collaborationV1: isRolloutFlagEnabled('collaborationV1'),
    collaborationIndexedDbV1: isRolloutFlagEnabled('collaborationIndexedDbV1'),
    reactFlowV12Migration: isRolloutFlagEnabled('reactFlowV12Migration'),
    architectureParentingV12: isRolloutFlagEnabled('architectureParentingV12'),
    reactFlowV12Cleanup: isRolloutFlagEnabled('reactFlowV12Cleanup'),
};

export function getRolloutFlagDefinitions(): RolloutFlagDefinition[] {
    return Object.values(ROLLOUT_FLAG_DEFINITIONS);
}
