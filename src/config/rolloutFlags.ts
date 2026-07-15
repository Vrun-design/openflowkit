export type RolloutFlagKey =
  | 'relationSemanticsV1'
  | 'documentModelV2'
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
  collaborationEnabled: isRolloutFlagEnabled('collaborationEnabled'),
  architectureLintEnabled: isRolloutFlagEnabled('architectureLintEnabled'),
  importSql: isRolloutFlagEnabled('importSql'),
  importOpenApi: isRolloutFlagEnabled('importOpenApi'),
  importInfraTerraformHcl: isRolloutFlagEnabled('importInfraTerraformHcl'),
  importCodebase: isRolloutFlagEnabled('importCodebase'),
  assetStoreV1: isRolloutFlagEnabled('assetStoreV1'),
};
