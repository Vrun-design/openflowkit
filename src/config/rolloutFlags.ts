export type RolloutFlagKey =
    | 'visualQualityV2'
    | 'connectorModelV1'
    | 'relationSemanticsV1'
    | 'indexedDbStorageV1'
    | 'canvasInteractionsV1'
    | 'shapeLibraryV1'
    | 'templateLibraryV1'
    | 'collaborationIndexedDbV1'
    | 'animationTimelineV1'
    | 'animatedExportV1'
    | 'documentModelV2';

interface RolloutFlagDefinition {
    key: RolloutFlagKey;
    envVar: string;
    defaultEnabled: boolean;
    description: string;
}

const ROLLOUT_FLAG_DEFINITIONS: Record<RolloutFlagKey, RolloutFlagDefinition> = {
    visualQualityV2: {
        key: 'visualQualityV2',
        envVar: '',
        defaultEnabled: true,
        description: 'Promoted visual quality behavior',
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
    indexedDbStorageV1: {
        key: 'indexedDbStorageV1',
        envVar: '',
        defaultEnabled: true,
        description: 'Promoted IndexedDB-backed persistence behavior',
    },
    canvasInteractionsV1: {
        key: 'canvasInteractionsV1',
        envVar: '',
        defaultEnabled: true,
        description: 'Promoted canvas interaction behavior',
    },
    shapeLibraryV1: {
        key: 'shapeLibraryV1',
        envVar: '',
        defaultEnabled: true,
        description: 'Promoted shape library behavior',
    },
    templateLibraryV1: {
        key: 'templateLibraryV1',
        envVar: '',
        defaultEnabled: true,
        description: 'Promoted template library behavior',
    },
    collaborationIndexedDbV1: {
        key: 'collaborationIndexedDbV1',
        envVar: '',
        defaultEnabled: true,
        description: 'Promoted collaboration room cache behavior',
    },
    animationTimelineV1: {
        key: 'animationTimelineV1',
        envVar: '',
        defaultEnabled: true,
        description: 'Promoted playback timeline behavior',
    },
    animatedExportV1: {
        key: 'animatedExportV1',
        envVar: '',
        defaultEnabled: true,
        description: 'Promoted animated export behavior',
    },
    documentModelV2: {
        key: 'documentModelV2',
        envVar: 'VITE_DOCUMENT_MODEL_V2',
        defaultEnabled: false,
        description: 'Extended document metadata for scenes, exports, and bindings',
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
    visualQualityV2: isRolloutFlagEnabled('visualQualityV2'),
    connectorModelV1: isRolloutFlagEnabled('connectorModelV1'),
    relationSemanticsV1: isRolloutFlagEnabled('relationSemanticsV1'),
    indexedDbStorageV1: isRolloutFlagEnabled('indexedDbStorageV1'),
    canvasInteractionsV1: isRolloutFlagEnabled('canvasInteractionsV1'),
    shapeLibraryV1: isRolloutFlagEnabled('shapeLibraryV1'),
    templateLibraryV1: isRolloutFlagEnabled('templateLibraryV1'),
    collaborationIndexedDbV1: isRolloutFlagEnabled('collaborationIndexedDbV1'),
    animationTimelineV1: isRolloutFlagEnabled('animationTimelineV1'),
    animatedExportV1: isRolloutFlagEnabled('animatedExportV1'),
    documentModelV2: isRolloutFlagEnabled('documentModelV2'),
};

export function getRolloutFlagDefinitions(): RolloutFlagDefinition[] {
    return Object.values(ROLLOUT_FLAG_DEFINITIONS);
}
